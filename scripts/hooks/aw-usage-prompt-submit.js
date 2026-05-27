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
  persistSessionSlashCommand,
  resolvePromptText,
  tryAcquireDedupe,
  isCodexInternalTaskTitlePrompt,
} = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;

// Slash commands we recognize beyond /aw:*. Each entry maps to a namespace
// used in the emitted payload so the dashboard can group by tool family.
//   namespace:command  → matched by ^/<namespace>:<command>
//   bare-name          → matched by ^/<bare-name>  (Matt Pocock skills, codex `/tdd`)
const NAMESPACED_PREFIXES = ['aw', 'caveman', 'codex', 'graphify', 'rtk', 'lean-ctx'];
const BARE_SLASH_COMMANDS = new Set([
  'tdd', 'diagnose', 'grill-me', 'grill-with-docs', 'triage', 'to-prd', 'zoom-out',
]);
// `/aw:` sub-commands that count as SDLC stages so the funnel can group by stage.
const AW_SDLC_STAGES = new Set([
  'plan', 'build', 'execute', 'test', 'verify', 'review',
  'deploy', 'ship', 'tdd', 'investigate', 'feature',
]);

function extractAwSlashCommand(input) {
  const prompt = resolvePromptText(input).trim();

  // Try `/namespace:command` shape first.
  const namespacedRe = new RegExp(
    `^\\/((?:${NAMESPACED_PREFIXES.join('|')})(?::[a-z0-9-]+)?)(?:\\s+([\\s\\S]*\\S))?\\s*$`,
    'i',
  );
  let match = prompt.match(namespacedRe);
  let commandFull = null;
  let commandArgs = '';
  if (match) {
    commandFull = match[1].toLowerCase();
    commandArgs = match[2] || '';
  } else {
    // Try bare name shape (e.g. `/tdd ...`).
    const bareRe = /^\/([a-z][a-z0-9-]*)(?:\s+([\s\S]*\S))?\s*$/i;
    const bareMatch = prompt.match(bareRe);
    if (bareMatch && BARE_SLASH_COMMANDS.has(bareMatch[1].toLowerCase())) {
      commandFull = bareMatch[1].toLowerCase();
      commandArgs = bareMatch[2] || '';
    }
  }
  if (!commandFull) return null;

  // Split into namespace + name. Bare names have no namespace.
  let namespace = null;
  let name = commandFull;
  const colonIdx = commandFull.indexOf(':');
  if (colonIdx > 0) {
    namespace = commandFull.slice(0, colonIdx);
    name = commandFull.slice(colonIdx + 1);
  }

  const isSdlcStage = namespace === 'aw' && AW_SDLC_STAGES.has(name);

  return {
    skill_name: commandFull,              // kept for backwards compat with existing skill_invoked consumers
    command_namespace: namespace,
    command_name: commandFull,
    command_args: commandArgs,
    is_sdlc_stage: isSdlcStage,
    args: commandArgs,                    // backwards compat alias
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
  const persistSlashCmd = typeof deps.persistSlashCmd === 'function' ? deps.persistSlashCmd : () => {};
  const events = [];

  const slash = extractAwSlashCommand(input);
  const promptPayload = {};
  if (slash) {
    promptPayload.command_namespace = slash.command_namespace;
    promptPayload.command_name = slash.command_name;
    promptPayload.command_args = slash.command_args;
    promptPayload.is_sdlc_stage = slash.is_sdlc_stage;
  }
  events.push({ eventType: 'prompt_submitted', payload: promptPayload });

  if (slash) {
    persistSkill(getSessionId(input), input?.turn_id || null, slash);
    persistSlashCmd(getSessionId(input), slash);
    events.push({
      eventType: 'skill_invoked',
      payload: {
        skill_name: slash.skill_name,
        args: slash.args,
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
          persistSlashCmd: persistSessionSlashCommand,
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
