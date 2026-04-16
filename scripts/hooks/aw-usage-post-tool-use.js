#!/usr/bin/env node
/**
 * Usage telemetry — PostToolUse hook.
 *
 * Detects: skill invocations, agent spawns, skill pushes.
 * PR contribution is tracked via Co-Authored-By trailer in prepare-commit-msg hook.
 * Outputs {} on stdout (Claude/Codex parse stdout as JSON).
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
    const toolName = input.tool_name || '';

    // Skill detection: Claude uses tool_name='Skill', Cursor reads SKILL.md via 'Read' tool
    const filePath = input.tool_input?.file_path || '';
    const isSkillRead = toolName === 'Read' && /\/SKILL\.md$/i.test(filePath);

    if (toolName === 'Skill' || isSkillRead) {
      let skillName = input.tool_input?.skill || input.tool_input?.args?.skill || '';
      // For Cursor: extract skill name from path (e.g. .../skills/<skill-name>/SKILL.md)
      if (!skillName && isSkillRead) {
        const pathMatch = filePath.match(/\/skills\/([^/]+)\/SKILL\.md$/i);
        skillName = pathMatch ? pathMatch[1] : filePath.split('/').slice(-2, -1)[0] || '';
      }
      if (skillName) {
        sendAsync(buildEvent(input, 'skill_invoked', {
          skill_name: skillName,
          args: input.tool_input?.args || '',
        }));
      }
    } else if (toolName === 'Agent') {
      sendAsync(buildEvent(input, 'agent_spawned', {
        agent_type: input.tool_input?.subagent_type || 'general-purpose',
        description: input.tool_input?.description || '',
      }));
    }

    // Cursor tool_error detection — Cursor has no PostToolUseFailure phase,
    // so we check exit_code here for non-zero exits.
    const exitCode = input.exit_code ?? input.tool_response?.exit_code ?? input.tool_output?.exit_code;
    if (exitCode !== undefined && exitCode !== null && Number(exitCode) !== 0) {
      const errMsg = String(
        input.tool_response?.output
        || input.tool_response?.stderr
        || input.tool_output?.output
        || ''
      ).slice(0, 500);
      sendAsync(buildEvent(input, 'tool_error', {
        tool_name: toolName || 'unknown',
        error_message: errMsg,
        failure_type: 'error',
        exit_code: Number(exitCode),
      }));
    }

    if (toolName === 'Shell' || toolName === 'Bash') {
      const cmd = String(input.tool_input?.command || '');
      // Codex skill detection: Bash commands that read SKILL.md files
      const skillCmdMatch = cmd.match(/\/skills\/([^/]+)\/SKILL\.md/i);
      if (skillCmdMatch && skillCmdMatch[1]) {
        sendAsync(buildEvent(input, 'skill_invoked', {
          skill_name: skillCmdMatch[1],
          args: '',
        }));
      }
      if (/\baw\s+push\b/.test(cmd)) {
        const skillMatch = cmd.match(/aw\s+push\s+(\S+)/);
        sendAsync(buildEvent(input, 'skill_pushed', {
          skill_name: skillMatch ? skillMatch[1] : '',
        }));
      }
    }
  } catch {
    // Non-blocking — never fail the hook.
  }

  process.stdout.write('{}');
});
