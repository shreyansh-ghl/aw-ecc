/**
 * Tests for .cursor/hooks/aw-phase-adapter.js
 *
 * Run with: node tests/lib/cursor-aw-phase-adapter.test.js
 */

const assert = require('assert');

const { runCursorAwPhase } = require('../../.cursor/hooks/aw-phase-adapter');

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Testing cursor aw phase adapter ===\n');

  let passed = 0;
  let failed = 0;

  if (await asyncTest('passes raw input through while running enabled Claude hook steps', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello', transcript_path: '/tmp/demo.jsonl' });
    const result = await runCursorAwPhase({
      raw,
      steps: [
        {
          hookId: 'session:start',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          scriptName: 'session-start.js',
        },
      ],
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: true, input };
        },
        hookEnabled(hookId, allowedProfiles) {
          calls.push({ type: 'enabled', hookId, allowedProfiles });
          return true;
        },
        runExistingHook(scriptName, payload) {
          calls.push({ type: 'run', scriptName, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      {
        type: 'transform',
        input: { prompt: 'hello', transcript_path: '/tmp/demo.jsonl' },
      },
      {
        type: 'enabled',
        hookId: 'session:start',
        allowedProfiles: ['minimal', 'standard', 'strict'],
      },
      {
        type: 'run',
        scriptName: 'session-start.js',
        payload: {
          transformed: true,
          input: { prompt: 'hello', transcript_path: '/tmp/demo.jsonl' },
        },
      },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('skips disabled steps but still passes raw input through', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello' });
    const result = await runCursorAwPhase({
      raw,
      steps: [
        {
          hookId: 'stop:session-end',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          scriptName: 'session-end.js',
        },
      ],
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: true };
        },
        hookEnabled(hookId, allowedProfiles) {
          calls.push({ type: 'enabled', hookId, allowedProfiles });
          return false;
        },
        runExistingHook() {
          calls.push({ type: 'run' });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      {
        type: 'transform',
        input: { prompt: 'hello' },
      },
      {
        type: 'enabled',
        hookId: 'stop:session-end',
        allowedProfiles: ['minimal', 'standard', 'strict'],
      },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('runs multiple steps in order with one transformed payload', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello' });
    const result = await runCursorAwPhase({
      raw,
      steps: [
        {
          hookId: 'stop:check-console-log',
          allowedProfiles: ['standard', 'strict'],
          scriptName: 'check-console-log.js',
        },
        {
          hookId: 'stop:cost-tracker',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          scriptName: 'cost-tracker.js',
        },
      ],
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: 'once' };
        },
        hookEnabled(hookId) {
          calls.push({ type: 'enabled', hookId });
          return true;
        },
        runExistingHook(scriptName, payload) {
          calls.push({ type: 'run', scriptName, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { prompt: 'hello' } },
      { type: 'enabled', hookId: 'stop:check-console-log' },
      { type: 'run', scriptName: 'check-console-log.js', payload: { transformed: 'once' } },
      { type: 'enabled', hookId: 'stop:cost-tracker' },
      { type: 'run', scriptName: 'cost-tracker.js', payload: { transformed: 'once' } },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('returns the original raw input when JSON parsing fails', async () => {
    const raw = '{not-json';
    const result = await runCursorAwPhase({
      raw,
      steps: [],
      deps: {
        transformToClaude() {
          throw new Error('should not run');
        },
        hookEnabled() {
          throw new Error('should not run');
        },
        runExistingHook() {
          throw new Error('should not run');
        },
      },
    });

    assert.strictEqual(result, raw);
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
