/**
 * Client-side deduplication for memory extraction.
 *
 * Prevents re-extracting the same transcript content across multiple
 * extraction events (Stop → SessionEnd, PreCompact → SessionEnd).
 *
 * Strategy: SHA-256 hash of full extracted text, stored per session.
 * If the hash hasn't changed since last extraction, skip.
 *
 * Cross-platform (Windows, macOS, Linux)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const DEDUP_DIR = path.join(os.homedir(), '.aw', 'memory-queue');
const MAX_QUEUE_ITEMS = 100;
const QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Compute SHA-256 hash of content string.
 */
function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Check if content has already been extracted in this session.
 * Returns true if content is a duplicate (should skip), false if new.
 */
function isDuplicate(sessionId, content) {
  const dedupPath = getDedupPath(sessionId);
  const newHash = hashContent(content);

  try {
    if (!fs.existsSync(dedupPath)) return false;
    const data = JSON.parse(fs.readFileSync(dedupPath, 'utf8'));
    return data.last_content_hash === newHash;
  } catch {
    return false; // On error, allow extraction
  }
}

/**
 * Record that content was successfully extracted.
 * Call this AFTER a successful memory_batch_extract call.
 */
function recordExtraction(sessionId, content) {
  const dedupPath = getDedupPath(sessionId);
  ensureDir(DEDUP_DIR);

  const data = {
    last_flush_ts: Date.now(),
    last_content_hash: hashContent(content),
    session_id: sessionId,
  };

  fs.writeFileSync(dedupPath, JSON.stringify(data), 'utf8');
}

/**
 * Clean up dedup file for a session.
 */
function cleanupDedup(sessionId) {
  const dedupPath = getDedupPath(sessionId);
  try {
    if (fs.existsSync(dedupPath)) fs.unlinkSync(dedupPath);
  } catch { /* best effort */ }
}

// ── Offline Queue ──────────────────────────────────────────

const QUEUE_PATH = path.join(os.homedir(), '.aw', 'memory-queue.jsonl');

/**
 * Queue a transcript for later extraction when MCP is unreachable.
 * Enforces max 100 items with FIFO eviction and 7-day TTL.
 */
function enqueueForExtraction(content, source, sessionMetadata) {
  ensureDir(path.dirname(QUEUE_PATH));

  const entry = {
    op: 'memory_batch_extract',
    payload: { content, source, session_metadata: sessionMetadata },
    queued_at: new Date().toISOString(),
    attempt: 0,
  };

  // Read existing queue, enforce size cap
  let lines = [];
  try {
    if (fs.existsSync(QUEUE_PATH)) {
      const raw = fs.readFileSync(QUEUE_PATH, 'utf8').trim();
      if (raw) lines = raw.split('\n').filter(Boolean);
    }
  } catch { /* fresh queue */ }

  // FIFO eviction: drop oldest if at cap
  while (lines.length >= MAX_QUEUE_ITEMS) {
    lines.shift();
  }

  lines.push(JSON.stringify(entry));
  fs.writeFileSync(QUEUE_PATH, lines.join('\n') + '\n', 'utf8');
}

/**
 * Flush the offline queue via memory_batch_extract calls.
 * Discards items older than 7 days. Retains failed items.
 *
 * @param {(toolName: string, params: object) => Promise<object>} callMcp
 * @returns {Promise<{processed: number, failed: number, discarded: number}>}
 */
async function flushQueue(callMcp) {
  if (!fs.existsSync(QUEUE_PATH)) {
    return { processed: 0, failed: 0, discarded: 0 };
  }

  const raw = fs.readFileSync(QUEUE_PATH, 'utf8').trim();
  if (!raw) return { processed: 0, failed: 0, discarded: 0 };

  const lines = raw.split('\n').filter(Boolean);
  const remaining = [];
  let processed = 0;
  let failed = 0;
  let discarded = 0;
  const now = Date.now();

  for (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      discarded++;
      continue;
    }

    // Discard items older than 7 days
    const age = now - new Date(entry.queued_at).getTime();
    if (age > QUEUE_TTL_MS) {
      discarded++;
      continue;
    }

    try {
      await callMcp(entry.op, entry.payload);
      processed++;
    } catch {
      entry.attempt = (entry.attempt || 0) + 1;
      remaining.push(entry);
      failed++;
    }
  }

  // Rewrite queue with only remaining (failed) items
  if (remaining.length > 0) {
    const data = remaining.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.writeFileSync(QUEUE_PATH, data, 'utf8');
  } else {
    fs.writeFileSync(QUEUE_PATH, '', 'utf8');
  }

  return { processed, failed, discarded };
}

/**
 * Get queue stats for diagnostics.
 */
function getQueueStats() {
  if (!fs.existsSync(QUEUE_PATH)) return { pending: 0 };
  try {
    const raw = fs.readFileSync(QUEUE_PATH, 'utf8').trim();
    if (!raw) return { pending: 0 };
    return { pending: raw.split('\n').filter(Boolean).length };
  } catch {
    return { pending: 0 };
  }
}

// ── Helpers ────────────────────────────────────────────────

function getDedupPath(sessionId) {
  return path.join(DEDUP_DIR, `dedup-${sessionId || 'default'}.json`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  hashContent,
  isDuplicate,
  recordExtraction,
  cleanupDedup,
  enqueueForExtraction,
  flushQueue,
  getQueueStats,
};
