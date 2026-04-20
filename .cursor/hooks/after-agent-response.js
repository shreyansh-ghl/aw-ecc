#!/usr/bin/env node
/**
 * Cursor afterAgentResponse hook.
 *
 * Fires after EVERY assistant response with token counts directly in the
 * payload. Emits a `response_completed` telemetry event with tokens, cost,
 * and the full common schema fields surfaced by adapter.js.
 */

'use strict';

const path = require('path');
const { readStdin, transformToClaude, getPluginRoot } = require('./adapter');
const root = getPluginRoot();
const { buildEvent, sendAsync } = require(path.join(root, 'scripts', 'lib', 'aw-usage-telemetry'));
const { estimateCost, toNumber } = require(path.join(root, 'scripts', 'lib', 'aw-pricing'));

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const claudeInput = transformToClaude(input);

    const model = input.model || claudeInput.model || null;
    const inputTokens = toNumber(input.input_tokens);
    const outputTokens = toNumber(input.output_tokens);
    const cacheReadTokens = toNumber(input.cache_read_tokens);
    const cacheWriteTokens = toNumber(input.cache_write_tokens);

    const payload = {
      stop_reason: input.status || 'end_turn',
    };

    if (model) {
      payload.model = model;
    }

    if (inputTokens || outputTokens) {
      payload.input_tokens = inputTokens;
      payload.output_tokens = outputTokens;
      payload.estimated_cost_usd = estimateCost(model, inputTokens, outputTokens);
    }

    if (cacheReadTokens || cacheWriteTokens) {
      payload.cache_read_tokens = cacheReadTokens;
      payload.cache_create_tokens = cacheWriteTokens;
    }

    const event = buildEvent(claudeInput, 'response_completed', payload);
    if (model && !event.model) {
      event.model = model;
    }
    sendAsync(event);
  } catch {
    // Telemetry is non-blocking.
  }

  process.stdout.write('{}');
}).catch(() => process.exit(0));
