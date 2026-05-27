#!/usr/bin/env node
/**
 * Normalize hook stdout for Cursor/Claude preToolUse and postToolUse contracts.
 * Those hosts require valid JSON on stdout; empty or whitespace-only output fails closed.
 */

'use strict';

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
function normalizeToolHookStdout(value) {
  const raw = value == null ? '' : String(value);
  const trimmed = raw.trim();
  if (!trimmed) {
    return '{}';
  }

  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    return '{}';
  }
}

/**
 * @param {string|null|undefined} value
 */
function writeToolHookStdout(value) {
  process.stdout.write(normalizeToolHookStdout(value));
}

module.exports = {
  normalizeToolHookStdout,
  writeToolHookStdout,
};
