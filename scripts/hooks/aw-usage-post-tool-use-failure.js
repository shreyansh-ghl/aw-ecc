#!/usr/bin/env node
/**
 * Usage telemetry — PostToolUseFailure hook.
 *
 * Claude: error (string/object) + is_interrupt (boolean).
 * Cursor: error_message (string) + failure_type ("timeout"/"error"/"permission_denied").
 * Codex: does NOT support PostToolUseFailure — this hook won't fire.
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
    const toolName = input.tool_name || 'unknown';

    // Normalize error fields across Claude and Cursor
    let errorMessage;
    let failureType;

    if (input.error_message !== undefined) {
      // Cursor format
      errorMessage = String(input.error_message || '');
      failureType = input.failure_type || 'error';
    } else {
      // Claude format
      const err = input.error;
      errorMessage = typeof err === 'string' ? err : (err?.message || JSON.stringify(err) || 'unknown');
      failureType = input.is_interrupt ? 'interrupt' : 'error';
    }

    sendAsync(buildEvent(input, 'tool_error', {
      tool_name: toolName,
      error_message: errorMessage.slice(0, 500),
      failure_type: failureType,
    }));
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
