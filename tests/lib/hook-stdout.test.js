/**
 * Tests for scripts/lib/hook-stdout.js
 *
 * Run with: node tests/lib/hook-stdout.test.js
 */

const assert = require('assert');
const { normalizeToolHookStdout } = require('../../scripts/lib/hook-stdout');

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
  console.log('\n=== Testing hook-stdout ===\n');

  let passed = 0;
  let failed = 0;

  if (test('empty string becomes {}', () => {
    assert.strictEqual(normalizeToolHookStdout(''), '{}');
  })) passed++; else failed++;

  if (test('whitespace-only becomes {}', () => {
    assert.strictEqual(normalizeToolHookStdout(' \n\t '), '{}');
  })) passed++; else failed++;

  if (test('null and undefined become {}', () => {
    assert.strictEqual(normalizeToolHookStdout(null), '{}');
    assert.strictEqual(normalizeToolHookStdout(undefined), '{}');
  })) passed++; else failed++;

  if (test('valid JSON passes through unchanged', () => {
    const input = '{"tool_name":"Read","tool_input":{"path":"a.ts"}}';
    assert.strictEqual(normalizeToolHookStdout(input), input);
  })) passed++; else failed++;

  if (test('invalid JSON becomes {}', () => {
    assert.strictEqual(normalizeToolHookStdout('not json'), '{}');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
