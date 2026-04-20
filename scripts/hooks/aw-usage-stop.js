#!/usr/bin/env node
/**
 * Usage telemetry — Stop hook.
 *
 * Captures response_completed per turn (fires after each Claude/Cursor/Codex response).
 *
 * No harness provides token usage in hook input directly. All three provide
 * transcript_path — we parse the transcript JSONL to extract model, stop_reason,
 * and usage for any harness.
 *
 * Pricing is resolved dynamically via OpenRouter API (24h cached) with a
 * hardcoded fallback for when the API is unreachable and no cache exists.
 *
 * Outputs {} on stdout.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildEvent, sendAsync, detectHarness, readLastAssistantFromTranscript } = require('../lib/aw-usage-telemetry');
const { estimateCost, toNumber } = require('../lib/aw-pricing');

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
    const input = JSON.parse(raw);
    const harness = detectHarness(input);

    // Parse transcript for all harnesses — all three provide transcript_path.
    // If the transcript format differs across harnesses, the parser returns null gracefully.
    let transcriptData = null;
    if (input.transcript_path) {
      transcriptData = readLastAssistantFromTranscript(input.transcript_path);
    }

    // Normalize stop reason across harnesses
    let stopReason;
    if (harness === 'cursor') {
      // Cursor adapter maps sessionEnd.reason / stop.status to stop_reason
      stopReason = input.stop_reason || input.status || input.reason || 'unknown';
    } else if (harness === 'codex') {
      stopReason = input.last_assistant_message ? 'completed' : 'unknown';
    } else {
      // Claude: prefer hook input, fall back to transcript
      stopReason = input.stop_reason
        || (transcriptData && transcriptData.stop_reason)
        || 'unknown';
    }

    // Token usage — prefer hook input, fall back to transcript
    const hookUsage = input.usage || {};
    const txUsage = (transcriptData && transcriptData.usage) || {};
    const usage = Object.keys(hookUsage).length > 0 ? hookUsage : txUsage;

    const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens);
    const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens);
    const cacheReadTokens = toNumber(usage.cache_read_input_tokens);
    const cacheCreateTokens = toNumber(usage.cache_creation_input_tokens);

    // Model: prefer hook input → transcript → session file
    const model = input.model
      || input._cursor?.model
      || (transcriptData && transcriptData.model)
      || null;

    const payload = { stop_reason: stopReason };

    if (model) {
      payload.model = model;
    }

    if (inputTokens || outputTokens) {
      payload.input_tokens = inputTokens;
      payload.output_tokens = outputTokens;
      payload.estimated_cost_usd = estimateCost(model, inputTokens, outputTokens);
    }

    if (cacheReadTokens || cacheCreateTokens) {
      payload.cache_read_tokens = cacheReadTokens;
      payload.cache_create_tokens = cacheCreateTokens;
    }

    // Dedup: Cursor fires sessionEnd/stop twice per turn (~100ms apart).
    // Use a lock file with 2s TTL to skip the second dispatch.
    const sessionId = input.session_id || input.conversation_id || 'unknown';
    const lockFile = path.join(os.tmpdir(), `aw-stop-dedup-${sessionId}`);
    let skip = false;
    try {
      const stat = fs.statSync(lockFile);
      if (Date.now() - stat.mtimeMs < 2000) skip = true;
    } catch { /* no lock file */ }
    if (!skip) {
      fs.writeFileSync(lockFile, String(Date.now()));

      // Override model in the event envelope too (buildEvent reads from hook input
      // which doesn't have model for Claude — inject it so the top-level field is set)
      const event = buildEvent(input, 'response_completed', payload);
      if (model && !event.model) {
        event.model = model;
      }
      sendAsync(event);
    }
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
