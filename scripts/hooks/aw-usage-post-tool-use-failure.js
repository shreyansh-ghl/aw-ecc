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

function classifyFailureMessage(errorMessage) {
  if (typeof errorMessage !== 'string' || !errorMessage.trim()) return 'tool_failed';
  if (/\bNo such file or directory\b/i.test(errorMessage)) return 'no_such_file_or_directory';
  if (/\bPermission denied\b/i.test(errorMessage)) return 'permission_denied';
  if (/\bOperation not permitted\b/i.test(errorMessage)) return 'operation_not_permitted';
  if (/\bcommand not found\b/i.test(errorMessage)) return 'command_not_found';
  if (/\bcannot access\b/i.test(errorMessage)) return 'cannot_access_path';
  if (/\bis a directory\b/i.test(errorMessage)) return 'path_is_directory';
  return 'tool_failed';
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
      error_message: classifyFailureMessage(errorMessage),
      failure_type: failureType,
    }));
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
