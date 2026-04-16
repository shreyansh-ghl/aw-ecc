#!/usr/bin/env node
/**
 * Cursor postToolUseFailure hook — fires when any tool fails, times out, or is denied.
 *
 * Cursor payload: tool_name, tool_input, error_message, failure_type, duration
 * Routes to the shared aw-usage-post-tool-use-failure.js telemetry handler.
 */
const { readStdin, transformToClaude, runExistingHook } = require('./adapter');

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const claudePayload = transformToClaude(input);
    // Pass through Cursor's native error fields — the shared handler normalizes them
    claudePayload.tool_name = input.tool_name || 'unknown';
    claudePayload.error_message = input.error_message || '';
    claudePayload.failure_type = input.failure_type || 'error';
    runExistingHook('aw-usage-post-tool-use-failure.js', JSON.stringify(claudePayload));
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
