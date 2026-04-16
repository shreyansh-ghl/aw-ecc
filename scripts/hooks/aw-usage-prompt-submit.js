#!/usr/bin/env node
/**
 * Usage telemetry — UserPromptSubmit hook.
 *
 * Emits prompt_submitted as a boundary marker.
 * No matchers on any harness — always fires.
 *
 * Outputs {} on stdout.
 */

'use strict';

const { buildEvent, sendAsync } = require('../lib/aw-usage-telemetry');

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
    sendAsync(buildEvent(input, 'prompt_submitted', {}));
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
