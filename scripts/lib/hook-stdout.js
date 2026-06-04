#!/usr/bin/env node
/**
 * Normalize hook stdout for strict Cursor/Claude hook adapters.
 *
 * Legacy AW hooks use "echo stdin" as their pass-through signal. That is valid
 * JSON, but it is the hook input event shape rather than a hook response shape,
 * so strict adapters reject it. Treat pass-through/event JSON as no opinion.
 */

'use strict';

const HOOK_RESPONSE_KEYS = new Set([
  'continue',
  'decision',
  'hookSpecificOutput',
  'permission',
  'permissionDecision',
  'permissionDecisionReason',
  'reason',
  'stopReason',
  'suppressOutput',
  'systemMessage',
]);

function stringifyValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function parseJsonObject(value) {
  const raw = stringifyValue(value).trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function looksLikeHookInputEvent(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(parsed, 'hookSpecificOutput')) return false;
  if (Object.prototype.hasOwnProperty.call(parsed, 'decision')) return false;

  return Boolean(
    Object.prototype.hasOwnProperty.call(parsed, 'hook_event_name')
      || Object.prototype.hasOwnProperty.call(parsed, 'tool_name')
      || Object.prototype.hasOwnProperty.call(parsed, 'tool_input')
      || Object.prototype.hasOwnProperty.call(parsed, 'tool_output')
      || Object.prototype.hasOwnProperty.call(parsed, 'tool_response')
  );
}

function looksLikeHookResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  const keys = Object.keys(parsed);
  if (keys.length === 0) return true;
  return keys.some(key => HOOK_RESPONSE_KEYS.has(key));
}

/**
 * @param {string|null|undefined} value
 * @returns {string}
 */
function normalizeToolHookStdout(value) {
  const parsed = parseJsonObject(value);
  if (!looksLikeHookResponse(parsed) || looksLikeHookInputEvent(parsed)) return '{}';
  return JSON.stringify(parsed);
}

/**
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
function isToolHookInputEventStdout(value) {
  return looksLikeHookInputEvent(parseJsonObject(value));
}

/**
 * @param {string|null|undefined} value
 */
function writeToolHookStdout(value) {
  process.stdout.write(normalizeToolHookStdout(value));
}

module.exports = {
  isToolHookInputEventStdout,
  normalizeToolHookStdout,
  writeToolHookStdout,
};
