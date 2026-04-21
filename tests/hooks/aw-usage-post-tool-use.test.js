/**
 * Tests for aw-usage-post-tool-use.js hook.
 *
 * Run with: node tests/hooks/aw-usage-post-tool-use.test.js
 */

const assert = require('assert');

const {
  collectPostToolUseEvents,
  inferShellFailureFromMessage,
  normalizeToolResult,
  shouldEmitSkillName,
} = require('../../scripts/hooks/aw-usage-post-tool-use.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing aw-usage-post-tool-use.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('Cursor Skill/Read detection still emits skill_invoked', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Read',
      tool_input: {
        file_path: '/Users/test/.codex/skills/aw-plan/SKILL.md',
      },
    });

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventType, 'skill_invoked');
    assert.strictEqual(events[0].payload.skill_name, 'aw-plan');
  }) ? passed++ : failed++);

  (test('Claude/Cursor Agent events still emit agent_spawned', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Agent',
      tool_input: {
        subagent_type: 'Explore',
        description: 'Find package.json files in this repo',
      },
    });

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventType, 'agent_spawned');
    assert.strictEqual(events[0].payload.agent_type, 'Explore');
  }) ? passed++ : failed++);

  (test('Bash failure as object emits tool_error', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: { command: 'cat /missing/file.txt' },
      tool_response: {
        exit_code: 1,
        stderr: 'cat: /missing/file.txt: No such file or directory',
      },
    });

    const toolError = events.find(event => event.eventType === 'tool_error');
    assert.ok(toolError, 'Expected tool_error event');
    assert.strictEqual(toolError.payload.tool_name, 'Bash');
    assert.strictEqual(toolError.payload.failure_type, 'error');
    assert.match(toolError.payload.error_message, /No such file or directory/);
  }) ? passed++ : failed++);

  (test('Codex Bash failure with JSON-string tool_response emits tool_error', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: { command: 'cat /missing/file.txt' },
      tool_response: '{"exit_code":1,"stderr":"cat: /missing/file.txt: No such file or directory"}',
    });

    const toolError = events.find(event => event.eventType === 'tool_error');
    assert.ok(toolError, 'Expected tool_error event');
    assert.strictEqual(toolError.payload.exit_code, 1);
    assert.match(toolError.payload.error_message, /No such file or directory/);
  }) ? passed++ : failed++);

  (test('Codex Bash failure with plain-string tool_response emits tool_error', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: { command: 'cat /missing/file.txt' },
      tool_response: 'cat: /missing/file.txt: No such file or directory\n',
    });

    const toolError = events.find(event => event.eventType === 'tool_error');
    assert.ok(toolError, 'Expected tool_error event');
    assert.strictEqual(toolError.payload.exit_code, undefined);
    assert.match(toolError.payload.error_message, /No such file or directory/);
  }) ? passed++ : failed++);

  (test('Codex Bash SKILL.md fallback is suppressed when prompt-submit already captured the slash command', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: {
        command: 'cat /Users/test/.codex/skills/using-aw-skills/SKILL.md',
      },
    }, {
      promptSkillOverride: {
        turn_id: 'turn-1',
        skill_name: 'aw:plan',
        args: 'test plan for telemetry validation',
      },
    });

    assert.strictEqual(events.find(event => event.eventType === 'skill_invoked'), undefined);
  }) ? passed++ : failed++);

  (test('using-aw-skills is suppressed as a router-only fallback skill', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: {
        command: 'cat /Users/test/.codex/skills/using-aw-skills/SKILL.md',
      },
    });

    assert.strictEqual(events.find(event => event.eventType === 'skill_invoked'), undefined);
    assert.strictEqual(shouldEmitSkillName('using-aw-skills'), false);
  }) ? passed++ : failed++);

  (test('non-router Bash SKILL.md fallback still emits skill_invoked', () => {
    const events = collectPostToolUseEvents({
      tool_name: 'Bash',
      tool_input: {
        command: 'cat /Users/test/.codex/skills/aw-investigate/SKILL.md',
      },
    });

    const skill = events.find(event => event.eventType === 'skill_invoked');
    assert.ok(skill, 'Expected fallback skill_invoked event');
    assert.strictEqual(skill.payload.skill_name, 'aw-investigate');
  }) ? passed++ : failed++);

  (test('inferShellFailureFromMessage only flags shell-style failures', () => {
    assert.strictEqual(
      inferShellFailureFromMessage('Bash', 'cat: /missing/file.txt: No such file or directory'),
      true,
    );
    assert.strictEqual(
      inferShellFailureFromMessage('Bash', 'package.json\nsrc/index.ts'),
      false,
    );
  }) ? passed++ : failed++);

  (test('normalizeToolResult preserves output from JSON-string tool_response', () => {
    const result = normalizeToolResult({
      tool_response: '{"exitCode":2,"output":"permission denied"}',
    });

    assert.strictEqual(result.exitCode, 2);
    assert.match(result.errorMessage, /permission denied/);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
