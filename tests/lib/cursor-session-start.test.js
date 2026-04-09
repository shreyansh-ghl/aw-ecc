/**
 * Tests for .cursor/hooks/session-start.sh
 *
 * Run with: node tests/lib/cursor-session-start.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runSessionStart(raw = '{}', env = {}) {
  const scriptPath = path.join(__dirname, '..', '..', '.cursor', 'hooks', 'session-start.sh');
  const result = spawnSync('bash', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, ...env },
  });

  return {
    code: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runTests() {
  console.log('\n=== Testing cursor session-start hook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('emits Cursor additional_context JSON for the AW session bridge', () => {
    const result = runSessionStart();
    const payload = JSON.parse(result.stdout || '{}');

    assert.strictEqual(result.code, 0);
    assert.ok(payload.additional_context, 'Expected additional_context in session-start payload');
    assert.ok(payload.additional_context.includes('AW Session Context'), 'Expected AW session context content');
    assert.ok(!payload.hookSpecificOutput, 'Expected Cursor wrapper to emit Cursor-shaped output only');
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
