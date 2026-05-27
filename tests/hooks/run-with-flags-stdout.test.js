/**
 * Tests for run-with-flags stdout contract (Cursor preToolUse/postToolUse).
 *
 * Run with: node tests/hooks/run-with-flags-stdout.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUN_WITH_FLAGS = path.join(REPO_ROOT, 'scripts', 'hooks', 'run-with-flags.js');

function runHook(stdin) {
  return spawnSync(
    'node',
    [
      RUN_WITH_FLAGS,
      'pre:governance-capture',
      'scripts/hooks/governance-capture.js',
      'standard,strict',
    ],
    {
      input: stdin,
      encoding: 'utf8',
      cwd: REPO_ROOT,
    }
  );
}

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing run-with-flags stdout ===\n');

  let passed = 0;
  let failed = 0;

  if (test('empty stdin emits valid JSON', () => {
    const result = runHook('');
    assert.strictEqual(result.status, 0);
    assert.doesNotThrow(() => JSON.parse(result.stdout.trim()));
    assert.deepStrictEqual(JSON.parse(result.stdout.trim()), {});
  })) passed++; else failed++;

  if (test('hook input event stdin emits no-op JSON', () => {
    const input = { tool_name: 'Read', tool_input: { path: '/tmp/x' } };
    const result = runHook(JSON.stringify(input));
    assert.strictEqual(result.status, 0);
    assert.deepStrictEqual(JSON.parse(result.stdout.trim()), {});
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
