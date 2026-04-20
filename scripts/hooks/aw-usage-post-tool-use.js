#!/usr/bin/env node
/**
 * Usage telemetry — PostToolUse hook.
 *
 * Detects: skill invocations, agent spawns, skill pushes.
 * PR contribution is tracked via Co-Authored-By trailer in prepare-commit-msg hook.
 * Outputs {} on stdout (Claude/Codex parse stdout as JSON).
 */

'use strict';

const {
  buildEvent,
  sendAsync,
  readSessionSkill,
} = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;
function parseMaybeJsonObject(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || !/^[{\[]/.test(trimmed)) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getSessionId(input) {
  return input?.session_id || input?.conversation_id || null;
}

function getCommand(input) {
  return String(
    input?.tool_input?.command
    || input?.tool_input?.args?.command
    || ''
  );
}

function normalizeToolResult(input) {
  const rawToolResponse = parseMaybeJsonObject(input?.tool_response);
  const rawToolOutput = parseMaybeJsonObject(input?.tool_output);
  const toolResponse = toObject(rawToolResponse);
  const toolOutput = toObject(rawToolOutput);
  const exitCode = [
    input?.exit_code,
    toolResponse.exit_code,
    toolResponse.exitCode,
    toolOutput.exit_code,
    toolOutput.exitCode,
  ].find(value => value !== undefined && value !== null && value !== '');
  const messageParts = [
    toolResponse.stderr,
    toolOutput.stderr,
    toolResponse.output,
    toolOutput.output,
    typeof rawToolResponse === 'string' ? rawToolResponse : '',
    typeof rawToolOutput === 'string' ? rawToolOutput : '',
    input?.stderr,
    input?.output,
  ].filter(value => typeof value === 'string' && value.trim());

  return {
    exitCode: exitCode === undefined ? null : Number(exitCode),
    errorMessage: messageParts.join('\n').slice(0, 500),
  };
}

function collectPostToolUseEvents(input, options = {}) {
  const events = [];
  const toolName = input?.tool_name || '';
  const promptSkillOverride = options.promptSkillOverride || null;

  // Skill detection: Claude uses tool_name='Skill', Cursor reads SKILL.md via 'Read' tool.
  const filePath = input?.tool_input?.file_path || '';
  const isSkillRead = toolName === 'Read' && /\/SKILL\.md$/i.test(filePath);

  if (toolName === 'Skill' || isSkillRead) {
    let skillName = input?.tool_input?.skill || input?.tool_input?.args?.skill || '';
    // For Cursor: extract skill name from path (e.g. .../skills/<skill-name>/SKILL.md)
    if (!skillName && isSkillRead) {
      const pathMatch = filePath.match(/\/skills\/([^/]+)\/SKILL\.md$/i);
      skillName = pathMatch ? pathMatch[1] : filePath.split('/').slice(-2, -1)[0] || '';
    }
    if (skillName) {
      events.push({
        eventType: 'skill_invoked',
        payload: {
          skill_name: skillName,
          args: input?.tool_input?.args || '',
        },
      });
    }
  } else if (toolName === 'Agent') {
    events.push({
      eventType: 'agent_spawned',
      payload: {
        agent_type: input?.tool_input?.subagent_type || 'general-purpose',
        description: input?.tool_input?.description || '',
      },
    });
  }

  const toolResult = normalizeToolResult(input);
  if (toolResult.exitCode !== null && Number.isFinite(toolResult.exitCode) && toolResult.exitCode !== 0) {
    events.push({
      eventType: 'tool_error',
      payload: {
        tool_name: toolName || 'unknown',
        error_message: toolResult.errorMessage,
        failure_type: 'error',
        exit_code: toolResult.exitCode,
      },
    });
  }

  if (toolName === 'Shell' || toolName === 'Bash') {
    const cmd = getCommand(input);
    // Codex skill detection: Bash commands that read SKILL.md files.
    if (!promptSkillOverride) {
      const skillCmdMatch = cmd.match(/\/skills\/([^/]+)\/SKILL\.md/i);
      if (skillCmdMatch && skillCmdMatch[1]) {
        events.push({
          eventType: 'skill_invoked',
          payload: {
            skill_name: skillCmdMatch[1],
            args: '',
          },
        });
      }
    }
    if (/\baw\s+push\b/.test(cmd)) {
      const skillMatch = cmd.match(/aw\s+push\s+(\S+)/);
      events.push({
        eventType: 'skill_pushed',
        payload: {
          skill_name: skillMatch ? skillMatch[1] : '',
        },
      });
    }
  }

  return events;
}

function processPostToolUseInput(input, deps = {}) {
  const emit = typeof deps.emit === 'function' ? deps.emit : () => {};
  const promptSkillOverride = deps.promptSkillOverride || readSessionSkill(
    getSessionId(input),
    input?.turn_id || null,
  );
  const events = collectPostToolUseEvents(input, { promptSkillOverride });
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
      processPostToolUseInput(input, {
        emit(eventType, payload) {
          sendAsync(buildEvent(input, eventType, payload));
        },
      });
    } catch {
      // Non-blocking — never fail the hook.
    }

    process.stdout.write('{}');
  });
}

if (require.main === module) {
  main();
}

module.exports = {
  collectPostToolUseEvents,
  normalizeToolResult,
  parseMaybeJsonObject,
  processPostToolUseInput,
};
