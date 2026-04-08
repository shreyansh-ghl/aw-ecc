#!/usr/bin/env node
/**
 * Telemetry Library — shared utilities for all telemetry capability hooks.
 *
 * Provides: cost estimation, JSONL I/O, checkpoint tracking, offline queue,
 * API push, platform detection, project hash, and namespace resolution.
 *
 * All state lives under ~/.aw/telemetry/ (vendor-agnostic).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  TELEMETRY_DIR,
  COSTS_FILE,
  CHECKPOINT_FILE,
  QUEUE_FILE,
  QUEUE_MAX_ITEMS,
  QUEUE_TTL_DAYS,
  STOP_FLUSH_INTERVAL_TURNS,
  STOP_FLUSH_INTERVAL_MS,
  ORPHAN_SESSION_AGE_MS,
  getPricingForModel,
  getApiUrl,
} = require('../../../lib/telemetry-constants');
const { ensureDir, runCommand, log } = require('../../../lib/utils');

// ---------------------------------------------------------------------------
// Directory setup
// ---------------------------------------------------------------------------

function ensureTelemetryDir() {
  ensureDir(TELEMETRY_DIR);
}

// ---------------------------------------------------------------------------
// Session metadata
// ---------------------------------------------------------------------------

function getSessionMetadataPath(sessionId) {
  return path.join(TELEMETRY_DIR, `session-${sessionId}.json`);
}

function readSessionMetadata(sessionId) {
  try {
    const p = getSessionMetadataPath(sessionId);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeSessionMetadata(sessionId, data) {
  ensureTelemetryDir();
  const p = getSessionMetadataPath(sessionId);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

function deleteSessionMetadata(sessionId) {
  try {
    const p = getSessionMetadataPath(sessionId);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // Ignore cleanup errors
  }
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

/**
 * Estimate cost in USD for a given model and token counts.
 * Uses cached OpenRouter pricing with hardcoded fallback.
 */
function estimateCost(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) {
  const rates = getPricingForModel(model);
  const input = (toNumber(inputTokens) / 1_000_000) * rates.input;
  const output = (toNumber(outputTokens) / 1_000_000) * rates.output;
  const cacheRead = (toNumber(cacheReadTokens) / 1_000_000) * rates.cacheRead;
  const cacheCreation = (toNumber(cacheCreationTokens) / 1_000_000) * rates.cacheCreation;
  return Math.round((input + output + cacheRead + cacheCreation) * 1e6) / 1e6;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Costs JSONL — append-only log with incrementing entry_id
// ---------------------------------------------------------------------------

/**
 * Get the next entry_id by reading the last line of costs.jsonl.
 */
function getNextEntryId() {
  try {
    if (!fs.existsSync(COSTS_FILE)) return 1;
    const content = fs.readFileSync(COSTS_FILE, 'utf8').trim();
    if (!content) return 1;
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    const last = JSON.parse(lastLine);
    return (last.entry_id || 0) + 1;
  } catch {
    return 1;
  }
}

/**
 * Append a cost entry to costs.jsonl with an auto-incrementing entry_id.
 * @param {object} entry - Cost entry data (without entry_id)
 * @returns {number} The assigned entry_id
 */
function appendCostEntry(entry) {
  ensureTelemetryDir();
  const entryId = getNextEntryId();
  const row = { entry_id: entryId, ...entry };
  fs.appendFileSync(COSTS_FILE, JSON.stringify(row) + '\n', 'utf8');
  return entryId;
}

// ---------------------------------------------------------------------------
// Checkpoint — monotonic counter for dedup
// ---------------------------------------------------------------------------

function readCheckpoint() {
  try {
    if (!fs.existsSync(CHECKPOINT_FILE)) return { session_id: null, last_flushed_entry: 0 };
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch {
    return { session_id: null, last_flushed_entry: 0 };
  }
}

function updateCheckpoint(sessionId, lastFlushedEntry) {
  ensureTelemetryDir();
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({
    session_id: sessionId,
    last_flushed_entry: lastFlushedEntry,
    updated_at: new Date().toISOString(),
  }), 'utf8');
}

/**
 * Read all unflushed cost entries since the last checkpoint.
 * @returns {{ entries: object[], checkpointFrom: number, checkpointTo: number }}
 */
function readUnflushedEntries() {
  const checkpoint = readCheckpoint();
  const lastFlushed = checkpoint.last_flushed_entry || 0;

  try {
    if (!fs.existsSync(COSTS_FILE)) return { entries: [], checkpointFrom: lastFlushed, checkpointTo: lastFlushed };
    const content = fs.readFileSync(COSTS_FILE, 'utf8').trim();
    if (!content) return { entries: [], checkpointFrom: lastFlushed, checkpointTo: lastFlushed };

    const lines = content.split('\n');
    const unflushed = [];
    let maxEntryId = lastFlushed;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.entry_id > lastFlushed) {
          unflushed.push(entry);
          if (entry.entry_id > maxEntryId) maxEntryId = entry.entry_id;
        }
      } catch {
        // Skip unparseable lines
      }
    }

    return {
      entries: unflushed,
      checkpointFrom: lastFlushed,
      checkpointTo: maxEntryId,
    };
  } catch {
    return { entries: [], checkpointFrom: lastFlushed, checkpointTo: lastFlushed };
  }
}

// ---------------------------------------------------------------------------
// Offline queue — JSONL with TTL
// ---------------------------------------------------------------------------

function readQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const content = fs.readFileSync(QUEUE_FILE, 'utf8').trim();
    if (!content) return [];

    const now = Date.now();
    const ttlMs = QUEUE_TTL_DAYS * 24 * 60 * 60 * 1000;

    return content.split('\n')
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(item => {
        if (!item) return false;
        const queuedAt = new Date(item.queued_at).getTime();
        return (now - queuedAt) < ttlMs;
      });
  } catch {
    return [];
  }
}

function writeQueue(items) {
  ensureTelemetryDir();
  const content = items.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync(QUEUE_FILE, content ? content + '\n' : '', 'utf8');
}

/**
 * Enqueue a failed payload for later retry.
 */
function enqueue(payload, endpoint) {
  const queue = readQueue();
  if (queue.length >= QUEUE_MAX_ITEMS) {
    // Drop oldest items to make room
    queue.splice(0, queue.length - QUEUE_MAX_ITEMS + 1);
  }

  queue.push({
    payload,
    endpoint,
    queued_at: new Date().toISOString(),
    attempts: 0,
  });

  writeQueue(queue);
}

/**
 * Flush the offline queue — POST each item, remove on success.
 * @returns {Promise<{ flushed: number, failed: number }>}
 */
async function flushQueue(headers = {}) {
  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  const apiUrl = getApiUrl();
  const remaining = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    const ok = await pushToApi(`${apiUrl}${item.endpoint}`, item.payload, headers);
    if (ok) {
      flushed++;
    } else {
      item.attempts = (item.attempts || 0) + 1;
      remaining.push(item);
      failed++;
    }
  }

  writeQueue(remaining);
  return { flushed, failed };
}

// ---------------------------------------------------------------------------
// API push
// ---------------------------------------------------------------------------

/**
 * POST JSON to an API endpoint.
 * @returns {Promise<boolean>} true if response was 2xx
 */
async function pushToApi(url, payload, headers = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    clearTimeout(timeout);

    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Detect which IDE/platform is running this hook.
 * Returns 'claude-code', 'cursor', 'codex', or 'unknown'.
 */
function detectPlatform() {
  // Claude Code sets CLAUDE_SESSION_ID
  if (process.env.CLAUDE_SESSION_ID) return 'claude-code';

  // Cursor sets CURSOR_SESSION_ID or _cursor in payload
  if (process.env.CURSOR_SESSION_ID) return 'cursor';

  // Codex sets CODEX_SESSION_ID or runs from ~/.codex/
  if (process.env.CODEX_SESSION_ID) return 'codex';

  // Heuristic: check parent process or environment
  const parentCmd = process.env._ || '';
  if (parentCmd.includes('cursor')) return 'cursor';
  if (parentCmd.includes('codex')) return 'codex';

  return 'unknown';
}

/**
 * Get platform version from environment.
 */
function detectPlatformVersion() {
  return process.env.CLAUDE_VERSION
    || process.env.CURSOR_VERSION
    || process.env.CODEX_VERSION
    || 'unknown';
}

// ---------------------------------------------------------------------------
// Project hash
// ---------------------------------------------------------------------------

/**
 * Compute a stable project identifier — SHA-256 of git remote origin URL.
 * Falls back to hash of cwd if no git remote.
 */
function getProjectHash() {
  const remote = runCommand('git remote get-url origin');
  const source = remote.success ? remote.output : process.cwd();
  return crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
}

// ---------------------------------------------------------------------------
// Namespace — team scoping
// ---------------------------------------------------------------------------

/**
 * Read namespace from AW registry sync config.
 * Used for X-Namespace header on API calls.
 */
function getNamespace() {
  try {
    const syncConfigPaths = [
      path.join(process.env.HOME || os.homedir(), '.aw_registry', '.sync-config.json'),
      path.join(process.env.HOME || os.homedir(), '.aw', '.aw_registry', '.sync-config.json'),
    ];

    for (const p of syncConfigPaths) {
      if (fs.existsSync(p)) {
        const config = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (config.namespace) return config.namespace;
      }
    }
  } catch {
    // Fall through
  }
  return null;
}

/**
 * Build standard headers for telemetry API calls.
 */
function buildTelemetryHeaders(namespace) {
  const headers = {};
  if (namespace) {
    headers['X-Namespace'] = namespace;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Session ID
// ---------------------------------------------------------------------------

/**
 * Get a stable session ID from the environment.
 */
function getSessionId() {
  return process.env.CLAUDE_SESSION_ID
    || process.env.CURSOR_SESSION_ID
    || process.env.CODEX_SESSION_ID
    || `unknown-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate cost entries into a single summary for API push.
 * @param {object[]} entries - Array of cost entry objects
 * @returns {object} Aggregated summary
 */
function aggregateEntries(entries) {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCostUsd = 0;
  const modelsUsed = new Set();
  const agentsUsed = new Set();
  const skillsApplied = new Set();
  const mcpToolsUsed = new Set();
  let compactionCount = 0;
  let prUrl = null;
  let prNumber = null;
  let prRepo = null;

  for (const entry of entries) {
    totalInputTokens += toNumber(entry.input_tokens);
    totalOutputTokens += toNumber(entry.output_tokens);
    totalCacheReadTokens += toNumber(entry.cache_read_tokens);
    totalCacheCreationTokens += toNumber(entry.cache_creation_tokens);
    totalCostUsd += toNumber(entry.estimated_cost_usd);

    if (entry.model) modelsUsed.add(entry.model);
    if (entry.compaction) compactionCount++;

    // Collect attribution arrays
    if (Array.isArray(entry.agents_used)) entry.agents_used.forEach(a => agentsUsed.add(a));
    if (Array.isArray(entry.skills_applied)) entry.skills_applied.forEach(s => skillsApplied.add(s));
    if (Array.isArray(entry.mcp_tools_used)) entry.mcp_tools_used.forEach(t => mcpToolsUsed.add(t));

    // Take last non-null PR info
    if (entry.pr_url) { prUrl = entry.pr_url; prNumber = entry.pr_number; prRepo = entry.pr_repo; }
  }

  return {
    tokens_used: totalInputTokens + totalOutputTokens,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    cache_read_tokens: totalCacheReadTokens,
    cache_creation_tokens: totalCacheCreationTokens,
    cost_usd: Math.round(totalCostUsd * 1e6) / 1e6,
    model: Array.from(modelsUsed).join(',') || 'unknown',
    agents_used: Array.from(agentsUsed),
    skills_applied: Array.from(skillsApplied),
    mcp_tools_used: Array.from(mcpToolsUsed),
    compaction_count: compactionCount,
    pr_url: prUrl,
    pr_number: prNumber,
    pr_repo: prRepo,
  };
}

// ---------------------------------------------------------------------------
// Stop self-flush — periodic API push from the Stop hook
// ---------------------------------------------------------------------------

/**
 * Check whether the Stop hook should perform an async API flush.
 * Returns true if enough turns or enough wall time has elapsed since last flush.
 *
 * @param {object} sessionMeta - Current session metadata (mutated: turn_count incremented)
 * @returns {boolean}
 */
function shouldSelfFlush(sessionMeta) {
  if (!sessionMeta) return false;

  // Increment turn count
  sessionMeta.turn_count = (sessionMeta.turn_count || 0) + 1;

  // Check turn-based interval
  const turnsSinceFlush = sessionMeta.turn_count - (sessionMeta.last_flush_turn || 0);
  if (turnsSinceFlush >= STOP_FLUSH_INTERVAL_TURNS) return true;

  // Check time-based interval
  const lastFlushTs = sessionMeta.last_flush_ts ? new Date(sessionMeta.last_flush_ts).getTime() : 0;
  if (lastFlushTs === 0) return false; // No time-based flush on first pass (let turn count trigger it)
  return (Date.now() - lastFlushTs) >= STOP_FLUSH_INTERVAL_MS;
}

/**
 * Mark a self-flush as completed in session metadata.
 * @param {object} sessionMeta - Session metadata to update (mutated in place)
 */
function markFlushed(sessionMeta) {
  if (!sessionMeta) return;
  sessionMeta.last_flush_turn = sessionMeta.turn_count || 0;
  sessionMeta.last_flush_ts = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Orphan recovery — recover data from crashed/killed sessions
// ---------------------------------------------------------------------------

/**
 * Scan for stale session files from prior sessions that were never cleanly closed.
 * For each orphan: enqueue their unflushed data with status "abandoned", then delete the file.
 *
 * @param {string} currentSessionId - The current session's ID (excluded from orphan scan)
 * @returns {{ recovered: number, enqueued: number }}
 */
function recoverOrphanedSessions(currentSessionId) {
  let recovered = 0;
  let enqueued = 0;

  try {
    if (!fs.existsSync(TELEMETRY_DIR)) return { recovered, enqueued };

    const files = fs.readdirSync(TELEMETRY_DIR);
    const now = Date.now();

    for (const file of files) {
      if (!file.startsWith('session-') || !file.endsWith('.json')) continue;

      const filePath = path.join(TELEMETRY_DIR, file);

      // Extract session ID from filename: session-{id}.json
      const sessionId = file.slice('session-'.length, -'.json'.length);
      if (sessionId === currentSessionId) continue;

      // Check file age
      try {
        const stat = fs.statSync(filePath);
        const ageMs = now - stat.mtimeMs;
        if (ageMs < ORPHAN_SESSION_AGE_MS) continue; // Not stale yet
      } catch {
        continue;
      }

      // Read orphaned session metadata
      const orphanMeta = readSessionMetadata(sessionId);
      if (!orphanMeta) {
        // Corrupt or empty — just delete
        deleteSessionMetadata(sessionId);
        recovered++;
        continue;
      }

      // Check if there are unflushed entries for this session
      // We can't isolate per-session unflushed entries cheaply (costs.jsonl is shared),
      // but we enqueue a "abandoned" status event so the server knows the session ended abnormally.
      const payload = {
        shell_run_id: sessionId,
        session_id: sessionId,
        command: 'session',
        status: 'abandoned',
        branch: orphanMeta.branch || 'unknown',
        model: 'unknown',
        platform: orphanMeta.platform || 'unknown',
        platform_version: orphanMeta.platform_version || 'unknown',
        project_hash: orphanMeta.project_hash || null,
        tokens_used: 0,
        cost_usd: 0,
        session_duration_ms: orphanMeta.start_ts
          ? now - new Date(orphanMeta.start_ts).getTime()
          : null,
        compaction_count: orphanMeta.compaction_count || 0,
        turn_count: orphanMeta.turn_count || 0,
      };

      enqueue(payload, '/usage-telemetry/ingest');
      enqueued++;

      // Clean up the orphaned session file
      deleteSessionMetadata(sessionId);
      recovered++;
    }
  } catch {
    // Non-fatal — don't block session start
  }

  return { recovered, enqueued };
}

module.exports = {
  // Directory
  ensureTelemetryDir,

  // Session metadata
  getSessionMetadataPath,
  readSessionMetadata,
  writeSessionMetadata,
  deleteSessionMetadata,

  // Cost estimation
  estimateCost,
  toNumber,

  // Costs JSONL
  getNextEntryId,
  appendCostEntry,

  // Checkpoint
  readCheckpoint,
  updateCheckpoint,
  readUnflushedEntries,

  // Queue
  readQueue,
  writeQueue,
  enqueue,
  flushQueue,

  // API
  pushToApi,

  // Detection
  detectPlatform,
  detectPlatformVersion,
  getProjectHash,
  getNamespace,
  buildTelemetryHeaders,
  getSessionId,

  // Aggregation
  aggregateEntries,

  // Resilience — self-flush & orphan recovery
  shouldSelfFlush,
  markFlushed,
  recoverOrphanedSessions,
};
