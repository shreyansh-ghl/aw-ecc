/**
 * Tests for .cursor/hooks/aw-phase-adapter.js
 *
 * Run with: node tests/lib/cursor-aw-phase-adapter.test.js
 */

const assert = require('assert');

const { runCursorAwPhase, runNamedCursorAwPhase } = require('../../.cursor/hooks/aw-phase-adapter');

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

  if (await asyncTest('returns Cursor additional_context for session-start while still delegating through the shared phase steps', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello', transcript_path: '/tmp/demo.jsonl' });
    const result = await runCursorAwPhase({
      raw,
      steps: [
        {
          hookId: 'session:start',
          allowedProfiles: ['minimal', 'standard', 'strict'],
          runner: 'shell',
          relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
          payloadMode: 'raw',
          outputMode: 'cursor-session-start',
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
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
          return { stdout: '', stderr: '' };
        },
        runManagedShellHook(relativeScriptPath, payload) {
          calls.push({ type: 'shell', relativeScriptPath, payload });
          return {
            stdout: JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'SessionStart',
                additionalContext: 'Use the AW router first.',
              },
            }),
            stderr: '',
          };
        },
      },
    });

    assert.deepStrictEqual(JSON.parse(result), {
      additional_context: 'Use the AW router first.',
    });
    assert.deepStrictEqual(calls, [
      {
        type: 'enabled',
        hookId: 'session:start',
        allowedProfiles: ['minimal', 'standard', 'strict'],
      },
      {
        type: 'shell',
        relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
        payload: raw,
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
          runner: 'node',
          relativeScriptPath: 'scripts/hooks/session-end.js',
          payloadMode: 'claude',
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
        runManagedNodeHook() {
          calls.push({ type: 'node' });
        },
        runManagedShellHook() {
          calls.push({ type: 'shell' });
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
          runner: 'node',
          relativeScriptPath: 'scripts/hooks/check-console-log.js',
          payloadMode: 'claude',
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
          return { transformed: 'once' };
        },
        hookEnabled(hookId) {
          calls.push({ type: 'enabled', hookId });
          return true;
        },
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
        },
        runManagedShellHook(relativeScriptPath, payload) {
          calls.push({ type: 'shell', relativeScriptPath, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { prompt: 'hello' } },
      { type: 'enabled', hookId: 'stop:check-console-log' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/check-console-log.js', payload: { transformed: 'once' } },
      { type: 'enabled', hookId: 'stop:cost-tracker' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/cost-tracker.js', payload: { transformed: 'once' } },
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

  if (await asyncTest('runs named Cursor AW phases through shared step definitions', async () => {
    const calls = [];
    const raw = JSON.stringify({ prompt: 'hello' });
    const result = await runNamedCursorAwPhase({
      phaseName: 'stop',
      raw,
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: true };
        },
        hookEnabled(hookId) {
          calls.push({ type: 'enabled', hookId });
          return true;
        },
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
        },
        runManagedShellHook(relativeScriptPath, payload) {
          calls.push({ type: 'shell', relativeScriptPath, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { prompt: 'hello' } },
      { type: 'enabled', hookId: 'stop:check-console-log' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/check-console-log.js', payload: { transformed: true } },
      { type: 'enabled', hookId: 'stop:session-end' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/session-end.js', payload: { transformed: true } },
      { type: 'enabled', hookId: 'stop:evaluate-session' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/evaluate-session.js', payload: { transformed: true } },
      { type: 'enabled', hookId: 'stop:cost-tracker' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/cost-tracker.js', payload: { transformed: true } },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('throws for unknown named Cursor AW phases', async () => {
    let error = null;
    try {
      await runNamedCursorAwPhase({ phaseName: 'bogus', raw: '{}' });
    } catch (err) {
      error = err;
    }

    assert.ok(error, 'Expected unknown phase to throw');
    assert.ok(error.message.includes('Unknown shared AW phase'));
  })) passed++; else failed++;

  if (await asyncTest('routes pre-tool-use shell phases through the shared shell step definitions', async () => {
    const calls = [];
    const raw = JSON.stringify({ command: 'npm run dev' });
    const result = await runNamedCursorAwPhase({
      phaseName: 'pre-tool-use-shell',
      raw,
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: 'shell' };
        },
        hookEnabled(hookId) {
          calls.push({ type: 'enabled', hookId });
          return true;
        },
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { command: 'npm run dev' } },
      { type: 'enabled', hookId: 'pre:bash:dev-server-block' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/pre-bash-dev-server-block.js', payload: { transformed: 'shell' } },
      { type: 'enabled', hookId: 'pre:bash:tmux-reminder' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/pre-bash-tmux-reminder.js', payload: { transformed: 'shell' } },
      { type: 'enabled', hookId: 'pre:bash:git-push-reminder' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/pre-bash-git-push-reminder.js', payload: { transformed: 'shell' } },
    ]);
  })) passed++; else failed++;

  if (await asyncTest('routes post-tool-use file edit phases through quality gate and edit follow-ups', async () => {
    const calls = [];
    const raw = JSON.stringify({ path: 'src/demo.ts' });
    const result = await runNamedCursorAwPhase({
      phaseName: 'post-tool-use-file-edit',
      raw,
      deps: {
        transformToClaude(input) {
          calls.push({ type: 'transform', input });
          return { transformed: 'edit' };
        },
        hookEnabled(hookId) {
          calls.push({ type: 'enabled', hookId });
          return true;
        },
        runManagedNodeHook(relativeScriptPath, payload) {
          calls.push({ type: 'node', relativeScriptPath, payload });
        },
      },
    });

    assert.strictEqual(result, raw);
    assert.deepStrictEqual(calls, [
      { type: 'transform', input: { path: 'src/demo.ts' } },
      { type: 'enabled', hookId: 'post:quality-gate' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/quality-gate.js', payload: { transformed: 'edit' } },
      { type: 'enabled', hookId: 'post:edit:format' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/post-edit-format.js', payload: { transformed: 'edit' } },
      { type: 'enabled', hookId: 'post:edit:typecheck' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/post-edit-typecheck.js', payload: { transformed: 'edit' } },
      { type: 'enabled', hookId: 'post:edit:console-warn' },
      { type: 'node', relativeScriptPath: 'scripts/hooks/post-edit-console-warn.js', payload: { transformed: 'edit' } },
    ]);
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
