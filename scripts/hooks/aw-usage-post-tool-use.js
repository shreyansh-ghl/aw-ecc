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
  detectHarness,
  sendAsync,
  readSessionSkill,
  readSessionLastSlashCommand,
  tryAcquireDedupe,
} = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;

// ── Test-file detection ──────────────────────────────────────────────
// Match common test conventions across JS/TS, Python, Go, Rust, Java, Kotlin.
// Designed to be permissive: a hit means "this was probably a test file";
// false positives are cheap (dashboard groups by guess) and false negatives
// are worse (lost SDLC signal). Use forward slashes — normalize backslashes
// before matching since Windows paths come through as \.
function normalizePath(p) {
  return typeof p === 'string' ? p.replace(/\\/g, '/') : '';
}

// Patterns are evaluated top-to-bottom; earlier matches win. Order from
// most-specific to least so e.g. `tests/foo.rs` is `rust-test`, not pytest.
const TEST_PATH_PATTERNS = [
  // JS / TS (jest, vitest, mocha, jasmine)
  { regex: /(?:^|\/)__tests__\/.+\.(?:ts|tsx|js|jsx|mjs|cjs)$/i,    framework: 'jest-like' },
  { regex: /\.(?:spec|test)\.(?:ts|tsx|js|jsx|mjs|cjs)$/i,           framework: 'jest-vitest' },
  // Go (`xxx_test.go`)
  { regex: /_test\.go$/i,                                           framework: 'go-test' },
  // Rust (`#[cfg(test)]` lives inline, but `tests/` dir is canonical)
  { regex: /(?:^|\/)tests\/.+\.rs$/i,                               framework: 'rust-test' },
  // Java / Kotlin
  { regex: /(?:^|\/)src\/test\/.+\.(?:java|kt|kts)$/i,              framework: 'junit' },
  { regex: /Test\.(?:java|kt)$/,                                    framework: 'junit' },
  // Python (pytest / unittest) — keyed on .py to avoid claiming Rust/Go test dirs.
  { regex: /(?:^|\/)tests?\/.+\.py$/i,                              framework: 'pytest' },
  { regex: /\/test_[a-z0-9_-]+\.py$/i,                              framework: 'pytest' },
  { regex: /_test\.py$/i,                                           framework: 'pytest' },
];

function detectTestFramework(filePath) {
  const norm = normalizePath(filePath);
  if (!norm) return null;
  for (const { regex, framework } of TEST_PATH_PATTERNS) {
    if (regex.test(norm)) return framework;
  }
  return null;
}

// ── SDLC artifact detection ──────────────────────────────────────────
// Plans, PRDs, specs, tasks, design docs, ADRs, learnings — written by
// the /aw:plan, /aw:ship, /aw:execute, etc. flows. Maps to an artifact_type
// + a coarse sdlc_stage so the funnel query can group.
const SDLC_ARTIFACT_PATTERNS = [
  { regex: /(?:^|\/)plan\.md$/i,           artifact_type: 'plan',         sdlc_stage: 'plan' },
  { regex: /(?:^|\/)prd\.md$/i,            artifact_type: 'prd',          sdlc_stage: 'plan' },
  { regex: /(?:^|\/)spec\.md$/i,           artifact_type: 'spec',         sdlc_stage: 'plan' },
  { regex: /(?:^|\/)tasks\.md$/i,          artifact_type: 'tasks',        sdlc_stage: 'plan' },
  { regex: /(?:^|\/)design\.md$/i,         artifact_type: 'design',       sdlc_stage: 'plan' },
  { regex: /(?:^|\/)tech_doc\.md$/i,       artifact_type: 'tech_doc',     sdlc_stage: 'plan' },
  { regex: /(?:^|\/)architecture\.md$/i,   artifact_type: 'architecture', sdlc_stage: 'plan' },
  { regex: /\/\.aw_docs\/runs\/[^/]+\/plan\.md$/i,     artifact_type: 'run_plan',     sdlc_stage: 'plan' },
  { regex: /\/\.aw_docs\/features\/[^/]+\/[^/]+\.md$/i, artifact_type: 'feature_doc', sdlc_stage: 'plan' },
  { regex: /\/\.aw_docs\/learnings\/[^/]+\.md$/i,      artifact_type: 'learning',     sdlc_stage: 'learn' },
  // ADR convention
  { regex: /(?:^|\/)adr-\d+[a-z0-9-]*\.md$/i,           artifact_type: 'adr',          sdlc_stage: 'plan' },
];

function detectSdlcArtifact(filePath) {
  const norm = normalizePath(filePath);
  if (!norm) return null;
  for (const { regex, artifact_type, sdlc_stage } of SDLC_ARTIFACT_PATTERNS) {
    if (regex.test(norm)) return { artifact_type, sdlc_stage };
  }
  return null;
}
function parseMaybeJsonObject(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || !/^[{[]/.test(trimmed)) return value;
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
  const rawMessage = [
    toolResponse.stderr,
    toolOutput.stderr,
    toolResponse.output,
    toolOutput.output,
    typeof rawToolResponse === 'string' ? rawToolResponse : '',
    typeof rawToolOutput === 'string' ? rawToolOutput : '',
    input?.stderr,
    input?.output,
  ].filter(value => typeof value === 'string' && value.trim()).join('\n');

  return {
    exitCode: exitCode === undefined ? null : Number(exitCode),
    rawErrorMessage: rawMessage,
    errorMessage: classifyFailureMessage(rawMessage),
  };
}

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

function isExplicitFailureExitCode(exitCode) {
  return exitCode !== null && Number.isFinite(exitCode) && exitCode !== 0;
}

function inferShellFailureFromMessage(toolName, errorMessage) {
  if (toolName !== 'Shell' && toolName !== 'Bash') return false;
  if (typeof errorMessage !== 'string' || !errorMessage.trim()) return false;
  const patterns = [
    /(?:^|\n)[^:\n]+:\s.*\bNo such file or directory\b/i,
    /(?:^|\n)[^:\n]+:\s.*\bPermission denied\b/i,
    /(?:^|\n)[^:\n]+:\s.*\bOperation not permitted\b/i,
    /(?:^|\n)(?:bash|zsh|sh): .*?\bcommand not found\b/i,
    /(?:^|\n)[^:\n]+:\s.*\bcannot access\b/i,
    /(?:^|\n)[^:\n]+:\s.*\bis a directory\b/i,
  ];
  return patterns.some(pattern => pattern.test(errorMessage));
}

function shouldEmitSkillName(skillName) {
  return Boolean(skillName) && skillName !== 'using-aw-skills';
}

function collectPostToolUseEvents(input, options = {}) {
  const events = [];
  const toolName = input?.tool_name || '';
  const promptSkillOverride = options.promptSkillOverride || null;
  // Session-scoped slash command from the most recent /aw:*, /tdd, etc.
  // Used to correlate test/artifact writes back to the originating SDLC stage.
  const slashCmd = options.sessionSlashCommand || null;

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
    if (shouldEmitSkillName(skillName)) {
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
  if (isExplicitFailureExitCode(toolResult.exitCode)
    || inferShellFailureFromMessage(toolName, toolResult.rawErrorMessage)) {
    const payload = {
      tool_name: toolName || 'unknown',
      error_message: toolResult.errorMessage,
      failure_type: 'error',
    };
    if (isExplicitFailureExitCode(toolResult.exitCode)) {
      payload.exit_code = toolResult.exitCode;
    }
    events.push({
      eventType: 'tool_error',
      payload,
    });
  }

  if (toolName === 'Shell' || toolName === 'Bash') {
    const cmd = getCommand(input);
    // Codex skill detection: Bash commands that read SKILL.md files.
    if (!promptSkillOverride) {
      const skillCmdMatch = cmd.match(/\/skills\/([^/]+)\/SKILL\.md/i);
      if (skillCmdMatch && shouldEmitSkillName(skillCmdMatch[1])) {
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

  // Test-file write detection — match Write/Edit/MultiEdit on common test paths.
  // Emits once per matching write, with a framework guess and the originating
  // slash command (e.g. /aw:test) if the session is in an SDLC stage. The
  // dashboard funnel uses sdlc_correlated_command to compute "tests written
  // via /aw:test" vs "tests written ad-hoc".
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
    const framework = detectTestFramework(filePath);
    if (framework) {
      events.push({
        eventType: 'test_file_written',
        payload: {
          file_path: filePath,
          test_framework_guess: framework,
          tool_name: toolName,
          sdlc_correlated_command: slashCmd ? slashCmd.command_name : null,
          sdlc_correlated_namespace: slashCmd ? slashCmd.command_namespace : null,
          sdlc_correlated_is_sdlc_stage: slashCmd ? Boolean(slashCmd.is_sdlc_stage) : false,
        },
      });
    }

    // SDLC artifact creation — emit on Write only (creation, not Edit) so
    // we don't double-count every save of an existing plan.md.
    if (toolName === 'Write') {
      const artifact = detectSdlcArtifact(filePath);
      if (artifact) {
        events.push({
          eventType: 'sdlc_artifact_created',
          payload: {
            file_path: filePath,
            artifact_type: artifact.artifact_type,
            sdlc_stage: artifact.sdlc_stage,
            sdlc_correlated_command: slashCmd ? slashCmd.command_name : null,
            sdlc_correlated_namespace: slashCmd ? slashCmd.command_namespace : null,
            sdlc_correlated_is_sdlc_stage: slashCmd ? Boolean(slashCmd.is_sdlc_stage) : false,
          },
        });
      }
    }
  }

  return events;
}

function processPostToolUseInput(input, deps = {}) {
  const emit = typeof deps.emit === 'function' ? deps.emit : () => {};
  const sessionId = getSessionId(input);
  const promptSkillOverride = deps.promptSkillOverride || readSessionSkill(
    sessionId,
    input?.turn_id || null,
  );
  const sessionSlashCommand = deps.sessionSlashCommand
    || readSessionLastSlashCommand(sessionId);
  const events = collectPostToolUseEvents(input, {
    promptSkillOverride,
    sessionSlashCommand,
  });
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
      const shouldDedup = detectHarness(input) === 'codex' || Boolean(input?.tool_use_id);
      if (!shouldDedup || tryAcquireDedupe('post-tool-use', [
        getSessionId(input),
        input?.turn_id || '',
        input?.tool_use_id || '',
        input?.tool_name || '',
        getCommand(input),
        input?.tool_input?.file_path || '',
        input?.tool_input?.description || '',
      ])) {
        processPostToolUseInput(input, {
          emit(eventType, payload) {
            sendAsync(buildEvent(input, eventType, payload));
          },
        });
      }
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
  detectSdlcArtifact,
  detectTestFramework,
  inferShellFailureFromMessage,
  isExplicitFailureExitCode,
  normalizeToolResult,
  parseMaybeJsonObject,
  processPostToolUseInput,
  shouldEmitSkillName,
};
