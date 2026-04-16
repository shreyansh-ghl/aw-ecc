#!/usr/bin/env node
/**
 * Usage telemetry — SessionStart hook.
 *
 * Captures session_start event and persists the model for later hooks.
 * Claude sends model on SessionStart only — this is the only chance to capture it.
 *
 * Outputs {} on stdout.
 */

'use strict';

const { buildEvent, sendAsync, persistSessionModel } = require('../lib/aw-usage-telemetry');

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
    const sessionId = input.session_id
      || input._cursor?.conversation_id
      || input.conversation_id
      || null;
    const model = input.model || input._cursor?.model || null;

    // Persist model so PostToolUse/Stop hooks can read it
    persistSessionModel(sessionId, model);

    sendAsync(buildEvent(input, 'session_start', {
      model: model || null,
    }));
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
