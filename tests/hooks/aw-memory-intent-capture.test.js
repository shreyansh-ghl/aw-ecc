/**
 * Tests for scripts/hooks/aw-memory-intent-capture.js
 *
 * Run with: node tests/hooks/aw-memory-intent-capture.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildMemoryIntentCaptureArgs,
  captureAwMemoryIntent,
  extractTranscriptFromHookInput,
  readClaudeJsonlTranscript,
} = require('../../scripts/hooks/aw-memory-intent-capture');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          console.log(`  ok ${name}`);
          return true;
        },
        (error) => {
          console.log(`  not ok ${name}`);
          console.log(`    ${error.stack || error.message}`);
          return false;
        }
      );
    }
    console.log(`  ok ${name}`);
    return true;
  } catch (error) {
    console.log(`  not ok ${name}`);
    console.log(`    ${error.stack || error.message}`);
    return false;
  }
}

function config(overrides = {}) {
  return {
    enabled: true,
    intentEnabled: true,
    captureEnabled: true,
    dryRun: false,
    captureMaxChars: 12000,
    timeoutMs: 10000,
    mcp: { url: 'https://mcp.example.test', authHeaders: {} },
    ...overrides,
  };
}

function fakeGit() {
  return (_command, args) => {
    if (args.includes('--show-toplevel')) {
      return { status: 0, stdout: '/work/acme-service\n', stderr: '' };
    }
    if (args.includes('--abbrev-ref')) {
      return { status: 0, stdout: 'feature/memory-hooks\n', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: 'unsupported' };
  };
}

async function runTests() {
  console.log('\n=== Testing aw-memory-intent-capture.js ===\n');

  const results = [];

  results.push(await test('extracts Claude JSONL transcript user and assistant messages', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-intent-capture-'));
    try {
      const transcriptPath = path.join(dir, 'transcript.jsonl');
      fs.writeFileSync(transcriptPath, [
        JSON.stringify({ type: 'user', message: { role: 'user', content: 'i like when u speak caveman dude' } }),
        JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Caveman happy.' }] } }),
      ].join('\n'));

      const transcript = readClaudeJsonlTranscript(transcriptPath);
      assert.match(transcript, /User: i like when u speak caveman dude/);
      assert.match(transcript, /Assistant: Caveman happy/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }));

  results.push(await test('builds redacted memory_intent_capture payload with namespace and repo metadata', () => {
    const args = buildMemoryIntentCaptureArgs(
      { session_id: 'session-1' },
      config({ namespace: 'revex/courses' }),
      { repoName: 'acme-service', branch: 'feature/memory-hooks' },
      'User: remember that Authorization: Bearer should-not-leak',
      { AW_HARNESS: 'claude' }
    );

    assert.strictEqual(args.harness, 'claude');
    assert.strictEqual(args.namespace, 'revex/courses');
    assert.strictEqual(args.repo_slug, 'acme-service');
    assert.strictEqual(args.branch, 'feature/memory-hooks');
    assert.strictEqual(args.session_id, 'session-1');
    assert.match(args.transcript, /Authorization: \[REDACTED_AUTH_HEADER\]/);
    assert.doesNotMatch(args.transcript, /should-not-leak/);
  }));

  results.push(await test('calls memory_intent_capture for caveman transcript and writes receipt', async () => {
    const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-intent-workspace-'));
    const statePath = path.join(workspace, '.aw_docs', 'cache', 'aw-memory-intent-state.json');
    const calls = [];
    try {
      const result = await captureAwMemoryIntent(
        {
          cwd: workspace,
          transcript: 'User: i like when u speak caveman dude',
        },
        {
          config: config({ namespace: 'revex/courses' }),
          spawnSync: fakeGit(),
          statePath,
          memoryIntentCapture: async (_config, args) => {
            calls.push(args);
            return { ok: true, result: { stored: 1, skipped: 0 } };
          },
        }
      );

      assert.strictEqual(result.ok, true);
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].namespace, 'revex/courses');
      assert.match(calls[0].transcript, /caveman/);
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      assert.strictEqual(state.status, 'captured');
      assert.deepStrictEqual(state.result, { stored: 1, skipped: 0 });
    } finally {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
  }));

  results.push(await test('skips cleanly when transcript is unavailable', async () => {
    let called = false;
    const result = await captureAwMemoryIntent(
      { cwd: process.cwd() },
      {
        config: config(),
        memoryIntentCapture: async () => {
          called = true;
          return { ok: true, result: {} };
        },
      }
    );

    assert.strictEqual(result.status, 'transcript_unavailable');
    assert.strictEqual(called, false);
  }));

  results.push(await test('extracts transcript from message arrays and prompt fallback', () => {
    assert.strictEqual(
      extractTranscriptFromHookInput({ messages: [{ role: 'user', content: 'remember this' }] }),
      'User: remember this'
    );
    assert.strictEqual(
      extractTranscriptFromHookInput({ prompt: 'remember fallback' }),
      'User: remember fallback'
    );
  }));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
