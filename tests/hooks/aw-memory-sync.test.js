/**
 * Tests for scripts/hooks/aw-memory-sync.js
 *
 * Run with: node tests/hooks/aw-memory-sync.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildMemoryStorePayload,
  loadPendingLearningRows,
  stableLearningKey,
  syncAwLearningsToMemory,
} = require('../../scripts/hooks/aw-memory-sync');

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

function makeWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-sync-'));
  fs.mkdirSync(path.join(root, '.aw_docs', 'learnings'), { recursive: true });
  return root;
}

function writeQueue(root, lines) {
  const queuePath = path.join(root, '.aw_docs', 'learnings', '_pending-sync.jsonl');
  fs.writeFileSync(queuePath, `${lines.join('\n')}\n`, 'utf8');
  return queuePath;
}

function config(overrides = {}) {
  return {
    enabled: true,
    syncEnabled: true,
    dryRun: false,
    syncMaxPerRun: 10,
    mcp: { url: 'https://mcp.example.test', authHeaders: {} },
    ...overrides,
  };
}

async function runTests() {
  console.log('\n=== Testing aw-memory-sync.js ===\n');

  const results = [];

  results.push(await test('loads only pending sync JSONL rows and counts invalid rows', () => {
    const root = makeWorkspace();
    try {
      const queuePath = writeQueue(root, [
        JSON.stringify({ id: 'a', text: 'first learning' }),
        '{not-json',
        '',
        JSON.stringify({ id: 'b', content: 'second learning' }),
      ]);
      fs.writeFileSync(path.join(root, '.aw_docs', 'learnings', 'other.jsonl'), '{"id":"ignored"}\n');

      const result = loadPendingLearningRows(queuePath, fs);

      assert.strictEqual(result.rows.length, 2);
      assert.strictEqual(result.invalidRows, 1);
      assert.deepStrictEqual(result.rows.map((row) => row.id), ['a', 'b']);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }));

  results.push(await test('uses explicit ids or stable sha256 content hashes for receipts', () => {
    assert.strictEqual(stableLearningKey({ id: 'learning-123', text: 'same' }), 'learning-123');
    assert.strictEqual(
      stableLearningKey({ text: 'same learning' }),
      stableLearningKey({ text: 'same learning' })
    );
    assert.match(stableLearningKey({ text: 'same learning' }), /^sha256:[a-f0-9]{64}$/);
  }));

  results.push(await test('builds redacted memory_store payloads with repo metadata', () => {
    const payload = buildMemoryStorePayload(
      { id: 'safe', text: 'Use DTOs. Authorization: Bearer secret-token' },
      { repoName: 'api', branch: 'main' }
    );

    assert.strictEqual(payload.key, 'safe');
    assert.match(payload.text, /Use DTOs/);
    assert.doesNotMatch(payload.text, /secret-token/);
    assert.strictEqual(payload.metadata.source, 'aw-learnings');
    assert.strictEqual(payload.metadata.repoName, 'api');
    assert.strictEqual(payload.metadata.branch, 'main');
  }));

  results.push(await test('dry-run plans writes without calling memory_store', async () => {
    const root = makeWorkspace();
    try {
      writeQueue(root, [JSON.stringify({ id: 'a', text: 'dry run learning' })]);
      let calls = 0;

      const result = await syncAwLearningsToMemory(
        { cwd: root },
        {
          config: config({ dryRun: true }),
          fs,
          memoryStore: async () => {
            calls += 1;
            return { ok: true };
          },
        }
      );

      assert.strictEqual(calls, 0);
      assert.strictEqual(result.status, 'dry_run');
      assert.strictEqual(result.planned, 1);
      assert.strictEqual(result.stored, 0);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }));

  results.push(await test('stores only unsynced unique rows and writes receipts', async () => {
    const root = makeWorkspace();
    try {
      const hashedRow = { text: 'already synced by content' };
      const existingKey = stableLearningKey(hashedRow);
      writeQueue(root, [
        JSON.stringify({ id: 'a', text: 'store me' }),
        JSON.stringify({ id: 'a', text: 'duplicate id' }),
        JSON.stringify(hashedRow),
      ]);
      const cacheDir = path.join(root, '.aw_docs', 'cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(
        path.join(cacheDir, 'aw-memory-sync-state.json'),
        JSON.stringify({ receipts: { [existingKey]: { status: 'stored' } } }),
        'utf8'
      );

      const calls = [];
      const result = await syncAwLearningsToMemory(
        { cwd: root },
        {
          config: config(),
          fs,
          memoryStore: async (_config, payload) => {
            calls.push(payload);
            return { ok: true, result: { stored: true } };
          },
        }
      );

      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].key, 'a');
      assert.strictEqual(result.stored, 1);
      assert.strictEqual(result.duplicates, 1);
      assert.strictEqual(result.alreadySynced, 1);
      const state = JSON.parse(fs.readFileSync(path.join(cacheDir, 'aw-memory-sync-state.json'), 'utf8'));
      assert.strictEqual(state.receipts.a.status, 'stored');
      assert.strictEqual(state.receipts[existingKey].status, 'stored');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
