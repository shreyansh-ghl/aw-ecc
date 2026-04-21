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

const {
  buildEvent,
  sendAsync,
  persistSessionSkill,
  resolvePromptText,
  tryAcquireDedupe,
  isCodexInternalTaskTitlePrompt,
} = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;

function extractAwSlashCommand(input) {
  const prompt = resolvePromptText(input).trim();
  const match = prompt.match(/^\/(aw:[a-z0-9-]+)(?:\s+([\s\S]*\S))?\s*$/i);
  if (!match) return null;
  return {
    skill_name: match[1].toLowerCase(),
    args: match[2] || '',
    source: 'user_prompt',
  };
}

function getSessionId(input) {
  return input?.session_id || input?.conversation_id || 'unknown';
}

function shouldSkipPromptSubmitTelemetry(input) {
  return isCodexInternalTaskTitlePrompt(input);
}

function processPromptSubmitInput(input, deps = {}) {
  const emit = typeof deps.emit === 'function' ? deps.emit : () => {};
  const persistSkill = typeof deps.persistSkill === 'function' ? deps.persistSkill : () => {};
  const events = [];

  events.push({ eventType: 'prompt_submitted', payload: {} });

  const skill = extractAwSlashCommand(input);
  if (skill) {
    persistSkill(getSessionId(input), input?.turn_id || null, skill);
    events.push({
      eventType: 'skill_invoked',
      payload: {
        skill_name: skill.skill_name,
        args: skill.args,
      },
    });
  }

  for (const event of events) {
    emit(event.eventType, event.payload);
  }

  return events;
}

function main() {
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
      if (!shouldSkipPromptSubmitTelemetry(input)
        && tryAcquireDedupe('prompt-submit', [
          getSessionId(input),
          input?.turn_id || '',
          resolvePromptText(input),
        ])) {
        processPromptSubmitInput(input, {
          emit(eventType, payload) {
            sendAsync(buildEvent(input, eventType, payload));
          },
          persistSkill: persistSessionSkill,
        });
      }
    } catch {
      // Non-blocking.
    }

    process.stdout.write('{}');
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  extractAwSlashCommand,
  processPromptSubmitInput,
  resolvePromptText,
  shouldSkipPromptSubmitTelemetry,
};
