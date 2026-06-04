#!/usr/bin/env node
/**
 * Output-contract tests for scripts/hooks/run-with-flags.js
 *
 * Regression guard for the Cursor "hook returned invalid JSON" bug:
 * the wrapper must NEVER echo the raw input event to stdout. Harness
 * contract for both Cursor and Claude Code:
 *   - allow / no opinion = empty stdout + exit 0
 *   - block             = exit 2 (reason on stderr), empty stdout
 *
 * Run with: node tests/hooks/run-with-flags-output.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const WRAPPER = path.join(REPO_ROOT, 'scripts', 'hooks', 'run-with-flags.js');

// PreToolUse hooks wired to Write/Edit/MultiEdit in hooks/hooks.json that pass
// through run-with-flags.js. These are exactly the ids that surfaced in the
// Cursor "returned invalid JSON" reports, plus suggest-compact.
const PRE_WRITE_HOOKS = [
  ['pre:write:doc-file-warning', 'scripts/hooks/doc-file-warning.js'],
  ['pre:edit-write:suggest-compact', 'scripts/hooks/suggest-compact.js'],
  ['pre:insaits-security', 'scripts/hooks/insaits-security-wrapper.js'],
  ['pre:governance-capture', 'scripts/hooks/governance-capture.js'],
  ['pre:config-protection', 'scripts/hooks/config-protection.js'],
  ['pre:mcp-health-check', 'scripts/hooks/mcp-health-check.js'],
];

const WRITE_EVENT = JSON.stringify({
  hook_event_name: 'PreToolUse',
  tool_name: 'Write',
  tool_input: { file_path: 'apps/users/src/users.service.ts', content: 'export const x = 1;\n' },
});

function runWrapper(hookId, relScript, profiles, input, extraEnv = {}) {
  const result = spawnSync('node', [WRAPPER, hookId, relScript, profiles], {
    input,
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT, ...extraEnv },
  });
  return {
    code: Number.isInteger(result.status) ? result.status : (result.signal ? `signal:${result.signal}` : 0),
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

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
  console.log('\n=== Testing run-with-flags.js output contract ===\n');
  let passed = 0;
  let failed = 0;

  // 1. Allow path: every routed pre-write hook must emit zero stdout + exit 0.
  for (const [hookId, relScript] of PRE_WRITE_HOOKS) {
    (test(`${hookId}: allow path emits empty stdout + exit 0`, () => {
      const { code, stdout, stderr } = runWrapper(hookId, relScript, 'standard,strict', WRITE_EVENT);
      assert.strictEqual(stdout.length, 0, `expected empty stdout, got ${stdout.length} bytes: ${stdout.slice(0, 200)}`);
      assert.strictEqual(code, 0, `expected exit 0, got ${code} (stderr: ${stderr.slice(0, 200)})`);
      assert.ok(
        !/chunk must be string\/Buffer/.test(stderr),
        `wrapper crashed on object stdout write: ${stderr.slice(0, 200)}`
      );
    }) ? passed++ : failed++);
  }

  // 2. Block path: config-protection on a protected file must exit 2 with a
  //    reason on stderr and still no event echo on stdout.
  (test('config-protection: blocks protected config via exit 2 with empty stdout', () => {
    const event = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '.eslintrc.json', content: '{}' },
    });
    const { code, stdout, stderr } = runWrapper(
      'pre:config-protection',
      'scripts/hooks/config-protection.js',
      'standard,strict',
      event
    );
    assert.strictEqual(code, 2, `expected exit 2 (block), got ${code}`);
    assert.strictEqual(stdout.length, 0, `expected empty stdout on block, got: ${stdout.slice(0, 200)}`);
    assert.ok(/BLOCKED/.test(stderr), `expected block reason on stderr, got: ${stderr.slice(0, 200)}`);
  }) ? passed++ : failed++);

  // 3. config-protection allow path: a normal source file is not blocked.
  (test('config-protection: allows non-config file (exit 0, empty stdout)', () => {
    const { code, stdout } = runWrapper(
      'pre:config-protection',
      'scripts/hooks/config-protection.js',
      'standard,strict',
      WRITE_EVENT
    );
    assert.strictEqual(code, 0, `expected exit 0, got ${code}`);
    assert.strictEqual(stdout.length, 0, `expected empty stdout, got: ${stdout.slice(0, 200)}`);
  }) ? passed++ : failed++);

  // 4. Disabled hook (ECC_DISABLED_HOOKS) must short-circuit with empty stdout.
  (test('disabled hook emits empty stdout + exit 0 (no event echo)', () => {
    const { code, stdout } = runWrapper(
      'pre:write:doc-file-warning',
      'scripts/hooks/doc-file-warning.js',
      'standard,strict',
      WRITE_EVENT,
      { ECC_DISABLED_HOOKS: 'pre:write:doc-file-warning' }
    );
    assert.strictEqual(code, 0, `expected exit 0, got ${code}`);
    assert.strictEqual(stdout.length, 0, `expected empty stdout for disabled hook, got: ${stdout.slice(0, 200)}`);
  }) ? passed++ : failed++);

  // 5. Profile gating off (hook not in active profile) also yields empty stdout.
  (test('profile-gated-off hook emits empty stdout + exit 0', () => {
    const { code, stdout } = runWrapper(
      'pre:bash:tmux-reminder',
      'scripts/hooks/pre-bash-tmux-reminder.js',
      'strict',
      WRITE_EVENT,
      { ECC_HOOK_PROFILE: 'minimal' }
    );
    assert.strictEqual(code, 0, `expected exit 0, got ${code}`);
    assert.strictEqual(stdout.length, 0, `expected empty stdout when profile-gated off, got: ${stdout.slice(0, 200)}`);
  }) ? passed++ : failed++);

  // 6. Missing-args guard must not echo the event either.
  (test('missing args emits empty stdout + exit 0', () => {
    const result = spawnSync('node', [WRAPPER], {
      input: WRITE_EVENT,
      encoding: 'utf8',
      timeout: 10000,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT },
    });
    assert.strictEqual(result.status, 0, `expected exit 0, got ${result.status}`);
    assert.strictEqual((result.stdout || '').length, 0, `expected empty stdout, got: ${(result.stdout || '').slice(0, 200)}`);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
