#!/usr/bin/env node
/**
 * Telemetry Capability — Stop handler (PRIMARY COLLECTION HOOK)
 *
 * Fires on: Stop (Claude, Cursor, Codex) — all 3 IDEs
 * Purpose: Build one prompt record per AI response, append to queue.jsonl.
 *          Every N prompts (FLUSH_THRESHOLD), batch POST to API.
 *
 * Network: Periodic (async flush only — does not block hook pipeline)
 * Target latency: <100ms (local append), <5s (flush turn)
 */

'use strict';

const { log } = require('../../../lib/utils');
const {
  ensureTelemetryDir,
  buildPromptRecord,
  appendToQueue,
  readFlushMeta,
  updateFlushMeta,
  shouldFlush,
  flushQueueToApi,
  getNamespace,
  buildTelemetryHeaders,
  toNumber,
} = require('./telemetry-lib');

const MAX_STDIN = 1024 * 1024;
let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    raw += chunk.substring(0, MAX_STDIN - raw.length);
  }
});

process.stdin.on('end', () => {
  try {
    runStop();
  } catch (err) {
    log(`[Telemetry:Stop] Error: ${err.message}`);
  }
  // Pass stdin through unchanged
  process.stdout.write(raw);
});

function runStop() {
  const input = raw.trim() ? JSON.parse(raw) : {};
  const usage = input.usage || input.token_usage || {};

  const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens || 0);
  const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens || 0);

  // Skip if no token data (empty response)
  if (inputTokens === 0 && outputTokens === 0) return;

  ensureTelemetryDir();

  // Build prompt record (includes artifacts)
  const record = buildPromptRecord(input);

  // Append to queue
  appendToQueue(record);

  // Update flush meta
  const meta = readFlushMeta();
  meta.prompts_since_flush = (meta.prompts_since_flush || 0) + 1;
  updateFlushMeta(meta);

  // Check if we should flush
  if (shouldFlush(meta)) {
    const namespace = getNamespace();
    const headers = buildTelemetryHeaders(namespace);

    // Fire-and-forget async flush — never blocks the hook
    flushQueueToApi(headers).then(result => {
      if (result.flushed > 0) {
        log(`[Telemetry:Stop] Flushed ${result.flushed} prompt(s) to API`);
      } else if (result.failed) {
        log(`[Telemetry:Stop] Flush failed — entries remain in queue for retry`);
      }
    }).catch(err => {
      log(`[Telemetry:Stop] Flush error: ${err.message}`);
    });
  }
}
