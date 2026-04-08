#!/usr/bin/env node
/**
 * Telemetry Library — shared utilities for prompt-based telemetry hooks.
 *
 * Prompt-based model: each Stop hook = one queue entry (prompt record).
 * Local state: queue.jsonl (pending records) + flush-meta.json (flush counter).
 * No sessions, no checkpoints, no costs.jsonl.
 *
 * Provides: queue I/O, flush meta, cost estimation, prompt record building,
 * artifact extraction, batch API push, platform detection, project hash.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  TELEMETRY_DIR,
  QUEUE_FILE,
  FLUSH_META_FILE,
  QUEUE_MAX_ITEMS,
  QUEUE_TTL_DAYS,
  FLUSH_THRESHOLD,
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
// Queue — JSONL append-only with TTL
// ---------------------------------------------------------------------------

/**
 * Append a single record to queue.jsonl.
 * Each record is a self-contained prompt with all context.
 */
function appendToQueue(record) {
  ensureTelemetryDir();
  const entry = {
    type: 'prompt',
    data: record,
    queued_at: new Date().toISOString(),
  };
  fs.appendFileSync(QUEUE_FILE, JSON.stringify(entry) + '\n', 'utf8');
}

/**
 * Read all valid queue entries, filtering by TTL and max items.
 * @returns {object[]} Array of queue entries
 */
function readQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const content = fs.readFileSync(QUEUE_FILE, 'utf8').trim();
    if (!content) return [];

    const now = Date.now();
    const ttlMs = QUEUE_TTL_DAYS * 24 * 60 * 60 * 1000;

    const entries = content.split('\n')
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(item => {
        if (!item) return false;
        const queuedAt = new Date(item.queued_at).getTime();
        return (now - queuedAt) < ttlMs;
      });

    // Respect max items — keep newest
    if (entries.length > QUEUE_MAX_ITEMS) {
      return entries.slice(entries.length - QUEUE_MAX_ITEMS);
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Clear the queue file (truncate to empty).
 * Called after successful batch flush.
 */
function clearQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      fs.writeFileSync(QUEUE_FILE, '', 'utf8');
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Write remaining entries back to queue (partial flush failure).
 */
function writeQueue(items) {
  ensureTelemetryDir();
  const content = items.map(item => JSON.stringify(item)).join('\n');
  fs.writeFileSync(QUEUE_FILE, content ? content + '\n' : '', 'utf8');
}

// ---------------------------------------------------------------------------
// Flush metadata — simple counter
// ---------------------------------------------------------------------------

/**
 * Read flush metadata.
 * @returns {{ last_flush_at: string|null, prompts_since_flush: number, total_prompts_flushed: number }}
 */
function readFlushMeta() {
  try {
    if (!fs.existsSync(FLUSH_META_FILE)) {
      return { last_flush_at: null, prompts_since_flush: 0, total_prompts_flushed: 0 };
    }
    return JSON.parse(fs.readFileSync(FLUSH_META_FILE, 'utf8'));
  } catch {
    return { last_flush_at: null, prompts_since_flush: 0, total_prompts_flushed: 0 };
  }
}

/**
 * Update flush metadata.
 */
function updateFlushMeta(meta) {
  ensureTelemetryDir();
  fs.writeFileSync(FLUSH_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

/**
 * Check if we should flush the queue based on prompts_since_flush.
 */
function shouldFlush(meta) {
  return (meta.prompts_since_flush || 0) >= FLUSH_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Estimate cost in USD for a given model and token counts.
 */
function estimateCost(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens) {
  const rates = getPricingForModel(model);
  const input = (toNumber(inputTokens) / 1_000_000) * rates.input;
  const output = (toNumber(outputTokens) / 1_000_000) * rates.output;
  const cacheRead = (toNumber(cacheReadTokens) / 1_000_000) * rates.cacheRead;
  const cacheCreation = (toNumber(cacheCreationTokens) / 1_000_000) * rates.cacheCreation;
  return Math.round((input + output + cacheRead + cacheCreation) * 1e6) / 1e6;
}

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------

/**
 * Detect which IDE/platform is running this hook.
 * Returns 'claude-code', 'cursor', 'codex', or 'unknown'.
 *
 * Detection order:
 * 1. IDE-specific env vars (set by some IDE versions)
 * 2. Script path — hooks deployed to ~/.claude/, ~/.cursor/, or ~/.codex/
 * 3. Parent command name
 */
function detectPlatform() {
  if (process.env.CLAUDE_SESSION_ID) return 'claude-code';
  if (process.env.CURSOR_SESSION_ID) return 'cursor';
  if (process.env.CODEX_SESSION_ID) return 'codex';

  // Detect from script path: ~/.claude/scripts/... or ~/.cursor/scripts/... or ~/.codex/hooks/...
  const scriptPath = __filename.replace(/\\/g, '/');
  if (scriptPath.includes('/.claude/')) return 'claude-code';
  if (scriptPath.includes('/.cursor/')) return 'cursor';
  if (scriptPath.includes('/.codex/') || scriptPath.includes('/.aw-ecc/')) return 'codex';

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

let _cachedProjectHash = null;

/**
 * Compute a stable project identifier — SHA-256 of git remote origin URL.
 * Falls back to hash of cwd if no git remote. Cached for process lifetime.
 */
function getProjectHash() {
  if (_cachedProjectHash) return _cachedProjectHash;
  const remote = runCommand('git remote get-url origin');
  const source = remote.success ? remote.output : process.cwd();
  _cachedProjectHash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 16);
  return _cachedProjectHash;
}

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

let _cachedBranch = null;

/**
 * Get current git branch. Cached for process lifetime.
 */
function getBranch() {
  if (_cachedBranch) return _cachedBranch;
  const result = runCommand('git rev-parse --abbrev-ref HEAD');
  _cachedBranch = result.success ? result.output : 'unknown';
  return _cachedBranch;
}

// ---------------------------------------------------------------------------
// Session tag — from env, used as groupable tag (not structural)
// ---------------------------------------------------------------------------

/**
 * Get session tag from environment or hook payload.
 * This is NOT a session ID in the lifecycle sense — just a groupable tag.
 *
 * @param {object} [input] - Parsed Stop hook stdin payload
 */
function getSessionTag(input) {
  return process.env.CLAUDE_SESSION_ID
    || process.env.CURSOR_SESSION_ID
    || process.env.CODEX_SESSION_ID
    || (input && (input.session_id || input.sessionId || input._cursor?.sessionId))
    || null;
}

// ---------------------------------------------------------------------------
// Turn number — extracted from payload or environment
// ---------------------------------------------------------------------------

/**
 * Extract turn number from the hook payload.
 * Different IDEs expose this differently.
 */
function getTurnNumber(input) {
  if (input.turn_number != null) return toNumber(input.turn_number);
  if (input.conversation_turn_count != null) return toNumber(input.conversation_turn_count);
  if (input.stopHookInput?.totalTurns != null) return toNumber(input.stopHookInput.totalTurns);
  if (input._cursor?.turn != null) return toNumber(input._cursor.turn);
  if (input.turn != null) return toNumber(input.turn);
  return null;
}

// ---------------------------------------------------------------------------
// Prompt ID — deterministic dedup key
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic prompt_id for dedup.
 * SHA-256(session_tag + turn_number). Falls back to timestamp-based if missing.
 */
function generatePromptId(sessionTag, turnNumber) {
  if (sessionTag && turnNumber != null) {
    return crypto.createHash('sha256')
      .update(`${sessionTag}:${turnNumber}`)
      .digest('hex')
      .slice(0, 64);
  }
  // Fallback: include timestamp + random to avoid collisions
  const fallbackSeed = `${sessionTag || 'unknown'}:${Date.now()}:${Math.random()}`;
  return crypto.createHash('sha256')
    .update(fallbackSeed)
    .digest('hex')
    .slice(0, 64);
}

// ---------------------------------------------------------------------------
// Namespace — team scoping
// ---------------------------------------------------------------------------

/**
 * Read namespace from AW registry sync config.
 */
function getNamespace() {
  try {
    const homedir = process.env.HOME || require('os').homedir();
    const syncConfigPaths = [
      path.join(homedir, '.aw_registry', '.sync-config.json'),
      path.join(homedir, '.aw', '.aw_registry', '.sync-config.json'),
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
 * Read the machine_id from ~/.aw/.telemetry config (created by aw init).
 */
function getMachineId() {
  try {
    const homedir = process.env.HOME || require('os').homedir();
    const telemetryConfig = path.join(homedir, '.aw', '.telemetry');
    if (fs.existsSync(telemetryConfig)) {
      const config = JSON.parse(fs.readFileSync(telemetryConfig, 'utf8'));
      if (config.machine_id) return config.machine_id;
    }
  } catch {
    // Fall through
  }
  return null;
}

/**
 * Resolve the GitHub username from git config.
 */
function getGitHubUser() {
  const result = runCommand('git config user.email');
  if (result.success && result.output) return result.output;
  const nameResult = runCommand('git config user.name');
  if (nameResult.success && nameResult.output) return nameResult.output;
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
  const machineId = getMachineId();
  if (machineId) {
    headers['X-Machine-Id'] = machineId;
  }
  const githubUser = getGitHubUser();
  if (githubUser) {
    headers['X-GitHub-User'] = githubUser;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Prompt record building
// ---------------------------------------------------------------------------

/**
 * Build a complete prompt record from the Stop hook stdin payload.
 *
 * @param {object} input - Parsed stdin from Stop hook
 * @returns {object} Prompt record ready for queue
 */
function buildPromptRecord(input) {
  const usage = input.usage || input.token_usage || {};

  const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens || 0);
  const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens || 0);
  const cacheReadTokens = toNumber(usage.cache_read_input_tokens || usage.cache_read_tokens || 0);
  const cacheCreationTokens = toNumber(usage.cache_creation_input_tokens || usage.cache_creation_tokens || 0);

  const model = String(
    input.model
    || input._cursor?.model
    || process.env.CLAUDE_MODEL
    || 'unknown'
  );

  const sessionTag = getSessionTag(input);
  const turnNumber = getTurnNumber(input);
  const promptId = generatePromptId(sessionTag, turnNumber);

  const record = {
    prompt_id: promptId,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_tokens: cacheReadTokens,
    cache_creation_tokens: cacheCreationTokens,
    cost_usd: estimateCost(model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens),
    platform: detectPlatform(),
    platform_version: detectPlatformVersion(),
    branch: getBranch(),
    project_hash: getProjectHash(),
    session_tag: sessionTag,
    turn_number: turnNumber,
    occurred_at: new Date().toISOString(),
  };

  // Extract artifacts from the latest response
  const artifacts = extractArtifacts(input);
  if (artifacts.length > 0) {
    record.artifacts = artifacts;
  }

  return record;
}

// ---------------------------------------------------------------------------
// Artifact extraction — agents, skills, MCP tools, PRs, errors
// ---------------------------------------------------------------------------

/**
 * Extract artifacts from the LATEST response only (not cumulative transcript).
 *
 * @param {object} input - Stop hook stdin payload
 * @returns {Array<{type: string, name: string, meta: object}>}
 */
function extractArtifacts(input) {
  const artifacts = [];
  const seen = new Set();

  function addArtifact(type, name, meta = {}) {
    const key = `${type}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    artifacts.push({ type, name, meta });
  }

  // Extract from content blocks (Claude format)
  const contentBlocks = input.content || input.message?.content || [];
  if (Array.isArray(contentBlocks)) {
    for (const block of contentBlocks) {
      if (block.type !== 'tool_use') continue;
      const name = block.name || '';

      // MCP tools: pattern mcp__server__method
      if (name.startsWith('mcp__')) {
        const parts = name.split('__');
        if (parts.length >= 3) {
          addArtifact('mcp_tool', parts[1], { method: parts[2], server: parts[1] });
        }
      }

      // Agent tool invocations
      if (name === 'Agent' && block.input?.subagent_type) {
        addArtifact('agent', block.input.subagent_type, {});
      }

      // Skill tool invocations
      if (name === 'Skill' && block.input?.skill) {
        addArtifact('skill', block.input.skill, {});
      }
    }
  }

  // Extract PR URLs from response text
  const responseText = extractResponseText(input);
  if (responseText) {
    const prRegex = /https?:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/g;
    let match;
    while ((match = prRegex.exec(responseText)) !== null) {
      addArtifact('pr', match[0], {
        pr_repo: match[1],
        pr_number: parseInt(match[2], 10),
        pr_url: match[0],
      });
    }

    // Extract error patterns from response text
    const errorPatterns = [
      { regex: /rate.?limit/i, name: 'rate_limit', category: 'api_error' },
      { regex: /overloaded/i, name: 'overloaded', category: 'api_error' },
      { regex: /context.?window|context.?length/i, name: 'context_overflow', category: 'context_error' },
      { regex: /permission.?denied|unauthorized|403/i, name: 'permission_denied', category: 'auth_error' },
    ];

    for (const { regex, name, category } of errorPatterns) {
      if (regex.test(responseText)) {
        addArtifact('error', name, { error_category: category });
      }
    }
  }

  // Extract from stop_reason if available
  if (input.stop_reason === 'error' || input.status === 'error') {
    const errorMsg = input.error?.message || input.error_message || 'unknown_error';
    addArtifact('error', 'stop_error', {
      error_message: String(errorMsg).slice(0, 500),
      error_category: 'stop_error',
    });
  }

  return artifacts;
}

/**
 * Extract text content from the response for regex scanning.
 */
function extractResponseText(input) {
  const contentBlocks = input.content || input.message?.content || [];
  if (Array.isArray(contentBlocks)) {
    const textParts = contentBlocks
      .filter(b => b.type === 'text' && b.text)
      .map(b => b.text);
    if (textParts.length > 0) return textParts.join('\n');
  }

  if (typeof input.response === 'string') return input.response;
  if (typeof input.output === 'string') return input.output;

  return '';
}

// ---------------------------------------------------------------------------
// Batch API push
// ---------------------------------------------------------------------------

/**
 * POST a batch of prompt records to the API.
 *
 * @param {string} url - Full API URL
 * @param {object[]} prompts - Array of prompt records
 * @param {object} headers - Request headers
 * @returns {Promise<boolean>} true if 2xx response
 */
async function batchPostToApi(url, prompts, headers = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ prompts }),
    });
    clearTimeout(timeout);

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Flush the queue — read all entries, batch POST, clear on success.
 *
 * @param {object} headers - Request headers (including X-Namespace)
 * @returns {Promise<{ flushed: number, failed: boolean }>}
 */
async function flushQueueToApi(headers = {}) {
  const entries = readQueue();
  if (entries.length === 0) return { flushed: 0, failed: false };

  const prompts = entries
    .filter(e => e.type === 'prompt' && e.data)
    .map(e => e.data);

  if (prompts.length === 0) {
    clearQueue();
    return { flushed: 0, failed: false };
  }

  const apiUrl = getApiUrl();
  const url = `${apiUrl}/telemetry/usage/ingest`;

  const ok = await batchPostToApi(url, prompts, headers);
  if (ok) {
    clearQueue();
    const meta = readFlushMeta();
    meta.last_flush_at = new Date().toISOString();
    meta.total_prompts_flushed = (meta.total_prompts_flushed || 0) + prompts.length;
    meta.prompts_since_flush = 0;
    updateFlushMeta(meta);
    return { flushed: prompts.length, failed: false };
  }

  return { flushed: 0, failed: true };
}

module.exports = {
  // Directory
  ensureTelemetryDir,

  // Queue
  appendToQueue,
  readQueue,
  clearQueue,
  writeQueue,

  // Flush meta
  readFlushMeta,
  updateFlushMeta,
  shouldFlush,

  // Cost estimation
  estimateCost,
  toNumber,

  // Detection
  detectPlatform,
  detectPlatformVersion,
  getProjectHash,
  getBranch,
  getNamespace,
  getMachineId,
  getGitHubUser,
  buildTelemetryHeaders,
  getSessionTag,
  getTurnNumber,
  generatePromptId,

  // Prompt building
  buildPromptRecord,
  extractArtifacts,

  // API
  batchPostToApi,
  flushQueueToApi,
};
