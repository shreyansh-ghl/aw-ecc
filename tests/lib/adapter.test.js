/**
 * Tests for .cursor/hooks/adapter.js — runExistingHook graceful degradation
 *
 * Run with: node tests/lib/adapter.test.js
 */

const assert = require('assert');
const path = require('path');

// We test runExistingHook indirectly by requiring the adapter module.
// The adapter uses getPluginRoot() which resolves to the repo root when
// package.json + scripts/hooks + .cursor/hooks exist.
const { runExistingHook } = require('../../.cursor/hooks/adapter');

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

function runTests() {
  console.log('\n=== Testing adapter.js runExistingHook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('returns undefined when hook script does not exist', () => {
    const result = runExistingHook('nonexistent-hook-script-that-will-never-exist.js', '{}');
    assert.strictEqual(result, undefined, 'should return undefined for missing script');
  })) { passed++; } else { failed++; }

  if (test('returns result object when hook script exists', () => {
    // scripts/hooks/aw-usage-telemetry-send.js exists in the repo — use it as a canary.
    // It expects specific stdin format but will still return a result (possibly with stderr).
    const fs = require('fs');
    const root = path.resolve(__dirname, '..', '..');
    const candidatePath = path.join(root, 'scripts', 'hooks', 'aw-usage-telemetry-send.js');

    if (!fs.existsSync(candidatePath)) {
      console.log('    (skipped — aw-usage-telemetry-send.js not found in repo)');
      return;
    }

    const result = runExistingHook('aw-usage-telemetry-send.js', '{}');
    assert.notStrictEqual(result, undefined, 'should return a result object, not undefined');
    assert.ok(typeof result === 'object', 'result should be an object');
  })) { passed++; } else { failed++; }

  if (test('does not write to stderr by default when script missing', () => {
    // Save and clear AW_HOOK_DEBUG
    const prev = process.env.AW_HOOK_DEBUG;
    delete process.env.AW_HOOK_DEBUG;

    // Capture stderr
    const writes = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); };

    try {
      runExistingHook('nonexistent-debug-test.js', '{}');
      assert.strictEqual(writes.length, 0, 'should not write to stderr without AW_HOOK_DEBUG');
    } finally {
      process.stderr.write = origWrite;
      if (prev !== undefined) process.env.AW_HOOK_DEBUG = prev;
      else delete process.env.AW_HOOK_DEBUG;
    }
  })) { passed++; } else { failed++; }

  if (test('writes to stderr when AW_HOOK_DEBUG=1 and script missing', () => {
    const prev = process.env.AW_HOOK_DEBUG;
    process.env.AW_HOOK_DEBUG = '1';

    const writes = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); };

    try {
      runExistingHook('nonexistent-debug-test.js', '{}');
      assert.ok(writes.length > 0, 'should write to stderr with AW_HOOK_DEBUG=1');
      assert.ok(writes[0].includes('nonexistent-debug-test.js'), 'should mention the script name');
      assert.ok(writes[0].includes('[aw]'), 'should include [aw] prefix');
    } finally {
      process.stderr.write = origWrite;
      if (prev !== undefined) process.env.AW_HOOK_DEBUG = prev;
      else delete process.env.AW_HOOK_DEBUG;
    }
  })) { passed++; } else { failed++; }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
