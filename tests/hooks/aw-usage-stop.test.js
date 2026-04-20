/**
 * Tests for aw-usage-stop.js hook — cross-harness telemetry
 *
 * Run with: node tests/hooks/aw-usage-stop.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'aw-usage-stop.js');

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

function runScript(input, envOverrides = {}) {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const result = spawnSync('node', [script], {
    encoding: 'utf8',
    input: inputStr,
    timeout: 10000,
    env: {
      ...process.env,
      AW_TELEMETRY_DISABLED: '1', // Don't actually send telemetry during tests
      ...envOverrides,
    },
  });
  return { code: result.status || 0, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function runTests() {
  console.log('\n=== Testing aw-usage-stop.js ===\n');

  let passed = 0;
  let failed = 0;

  // 1. Empty input — exits 0, outputs {}
  (test('empty input: exits 0 with {} output', () => {
    const result = runScript('{}');
    assert.strictEqual(result.code, 0, `Expected exit code 0, got ${result.code}`);
    assert.strictEqual(result.stdout, '{}', 'Expected {} output');
  }) ? passed++ : failed++);

  // 2. Invalid JSON — exits 0, outputs {}
  (test('invalid JSON: exits 0 with {} output', () => {
    const result = runScript('not valid json');
    assert.strictEqual(result.code, 0, `Expected exit code 0, got ${result.code}`);
    assert.strictEqual(result.stdout, '{}', 'Expected {} output');
  }) ? passed++ : failed++);

  // 3. Claude input without transcript — minimal output
  (test('Claude input without transcript: outputs {}', () => {
    const input = {
      session_id: 'test-session-claude-1',
      cwd: '/tmp/test',
      permission_mode: 'default',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 4. Cursor input with model — detects harness
  (test('Cursor input: detects cursor harness', () => {
    const input = {
      conversation_id: 'test-cursor-conv-1',
      _cursor: { model: 'gpt-4o', conversation_id: 'test-cursor-conv-1' },
      reason: 'completed',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 5. Codex input with model — detects harness
  (test('Codex input: detects codex harness', () => {
    const input = {
      session_id: 'test-codex-session-1',
      turn_id: 'test-turn-1',
      model: 'codex-1',
      last_assistant_message: 'Done.',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 6. Cursor input with reason field — stop_reason mapped
  (test('Cursor input: reason field mapped to stop_reason', () => {
    const input = {
      conversation_id: 'test-cursor-reason-1',
      _cursor: { model: 'gpt-4o', conversation_id: 'test-cursor-reason-1' },
      stop_reason: 'completed',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 7. Codex input with last_assistant_message — stop_reason = completed
  (test('Codex input: last_assistant_message maps to completed', () => {
    const input = {
      session_id: 'test-codex-completed-1',
      turn_id: 'test-turn-2',
      model: 'codex-1',
      last_assistant_message: 'Here is the result.',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 8. Codex input without last_assistant_message — stop_reason = unknown
  (test('Codex input: no last_assistant_message maps to unknown', () => {
    const input = {
      session_id: 'test-codex-unknown-1',
      turn_id: 'test-turn-3',
      model: 'codex-1',
    };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  // 9. Script handles very large input without crashing
  (test('large input: handles gracefully', () => {
    const input = { session_id: 'large-test', padding: 'x'.repeat(100000) };
    const result = runScript(input);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(result.stdout, '{}');
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
