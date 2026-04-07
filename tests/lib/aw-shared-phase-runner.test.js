/**
 * Tests for scripts/hooks/shared/aw-phase-runner.js
 */

const assert = require('assert');

const {
  SHARED_AW_PHASE_STEPS,
  getSharedAwPhaseSteps,
} = require('../../scripts/hooks/shared/aw-phase-definitions');
const { runSharedAwPhase } = require('../../scripts/hooks/shared/aw-phase-runner');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Testing shared AW phase runner ===\n');

  let passed = 0;
  let failed = 0;

  if (test('defines the shared AW phases we route through adapters', () => {
    assert.deepStrictEqual(Object.keys(SHARED_AW_PHASE_STEPS), [
      'session-start',
      'user-prompt-submit',
      'pre-compact',
      'session-end',
      'stop',
    ]);
  })) passed++; else failed++;

  if (test('user-prompt-submit phase uses the shared shell entrypoint', () => {
    const steps = getSharedAwPhaseSteps('user-prompt-submit');
    assert.strictEqual(steps.length, 1);
    assert.strictEqual(steps[0].runner, 'shell');
    assert.strictEqual(steps[0].relativeScriptPath, '.cursor/hooks/shared/user-prompt-submit.sh');
    assert.strictEqual(steps[0].payloadMode, 'raw');
  })) passed++; else failed++;

  if (await asyncTest('runs shell and node steps through the injected runtime', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello' });
    const result = await runSharedAwPhase({
      raw,
      steps: [
        {
          hookId: 'session:start',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          runner: 'shell',
          relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
          payloadMode: 'raw',
        },
        {
          hookId: 'stop:cost-tracker',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          runner: 'node',
          relativeScriptPath: 'scripts/hooks/cost-tracker.js',
          payloadMode: 'claude',
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
        runManagedShellHook(relativeScriptPath, payload) {
          calls.push({ type: 'shell', relativeScriptPath, payload });
        },
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { prompt: 'hello' } },
      { type: 'enabled', hookId: 'session:start', allowedProfiles: ['minimal', 'standard', 'strict'] },
      { type: 'shell', relativeScriptPath: '.cursor/hooks/shared/session-start.sh', payload: raw },
      { type: 'enabled', hookId: 'stop:cost-tracker', allowedProfiles: ['minimal', 'standard', 'strict'] },
      { type: 'node', relativeScriptPath: 'scripts/hooks/cost-tracker.js', payload: { transformed: true, input: { prompt: 'hello' } } },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('returns the original input when the payload is not valid JSON', async () => {
    const raw = '{invalid';
    const result = await runSharedAwPhase({
      raw,
      steps: getSharedAwPhaseSteps('stop'),
      deps: {
        transformToClaude() {
          throw new Error('should not run');
        },
        hookEnabled() {
          throw new Error('should not run');
        },
        runManagedShellHook() {
          throw new Error('should not run');
        },
        runManagedNodeHook() {
          throw new Error('should not run');
        },
      },
    });

    assert.strictEqual(result, raw);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
