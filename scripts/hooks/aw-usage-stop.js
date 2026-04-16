#!/usr/bin/env node
/**
 * Usage telemetry — Stop hook.
 *
 * Captures session_ended with token usage and cost estimation.
 * Claude: stop_reason + usage.input_tokens/output_tokens (undocumented but confirmed).
 * Codex: last_assistant_message presence = completed; no usage field.
 * Cursor: status ("completed"/"aborted"/"error"); no usage field.
 *
 * Outputs {} on stdout.
 */

'use strict';

const { buildEvent, sendAsync, detectHarness } = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;
let raw = '';

// Pricing per 1M tokens (same as cost-tracker.js)
const PRICING = {
  haiku:  { in: 0.80, out: 4.00 },
  sonnet: { in: 3.00, out: 15.00 },
  opus:   { in: 15.00, out: 75.00 },
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function estimateCost(model, inputTokens, outputTokens) {
  if (!inputTokens && !outputTokens) return null;
  const normalized = String(model || '').toLowerCase();
  let rates = PRICING.sonnet; // default
  if (normalized.includes('haiku')) rates = PRICING.haiku;
  if (normalized.includes('opus')) rates = PRICING.opus;
  const cost = (inputTokens / 1_000_000) * rates.in + (outputTokens / 1_000_000) * rates.out;
  return Math.round(cost * 1e6) / 1e6;
}

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

    // Normalize stop reason across harnesses
    let stopReason;
    if (harness === 'cursor') {
      stopReason = input.status || 'unknown';
    } else if (harness === 'codex') {
      stopReason = input.last_assistant_message ? 'completed' : 'unknown';
    } else {
      // Claude uses stop_reason
      stopReason = input.stop_reason || 'unknown';
    }

    // Token usage — only available on Claude Stop (undocumented)
    const usage = input.usage || {};
    const inputTokens = toNumber(usage.input_tokens || usage.prompt_tokens);
    const outputTokens = toNumber(usage.output_tokens || usage.completion_tokens);
    const model = input.model || input._cursor?.model || null;

    const payload = { stop_reason: stopReason };

    if (inputTokens || outputTokens) {
      payload.input_tokens = inputTokens;
      payload.output_tokens = outputTokens;
      payload.estimated_cost_usd = estimateCost(model, inputTokens, outputTokens);
    }

    sendAsync(buildEvent(input, 'session_ended', payload));
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
