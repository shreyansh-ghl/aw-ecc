/**
 * Tests for scripts/hooks/aw-memory-recall.js
 *
 * Run with: node tests/hooks/aw-memory-recall.test.js
 */

const assert = require('assert');

const {
  buildAwMemoryRecallContext,
  formatAwMemoryRecall,
} = require('../../scripts/hooks/aw-memory-recall');

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
    recallEnabled: true,
    maxResults: 2,
    timeoutMs: 800,
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
  console.log('\n=== Testing aw-memory-recall.js ===\n');

  const results = [];

  results.push(await test('does nothing when memory hooks or recall are disabled', async () => {
    let called = false;
    const output = await buildAwMemoryRecallContext(
      { prompt: 'use DTO validation' },
      {
        config: config({ enabled: false, recallEnabled: false }),
        memorySearch: async () => {
          called = true;
          return { ok: true, result: { results: [{ text: 'should not appear' }] } };
        },
      }
    );

    assert.strictEqual(output, '');
    assert.strictEqual(called, false);
  }));

  results.push(await test('uses sanitized prompt and repo metadata for memory_search', async () => {
    const calls = [];
    const output = await buildAwMemoryRecallContext(
      {
        cwd: '/work/acme-service/apps/api',
        prompt: 'Fix locationId validation. GITHUB_TOKEN=ghp_secret1234567890',
      },
      {
        config: config(),
        spawnSync: fakeGit(),
        memorySearch: async (_config, args) => {
          calls.push(args);
          return {
            ok: true,
            result: {
              results: [
                { text: 'Always scope writes by locationId.' },
                { content: 'Authorization: Bearer should-not-leak' },
                { text: 'third result should be capped' },
              ],
            },
          };
        },
      }
    );

    assert.strictEqual(calls.length, 1);
    assert.match(calls[0].query, /Fix locationId validation/);
    assert.doesNotMatch(calls[0].query, /ghp_secret/);
    assert.deepStrictEqual(calls[0].metadata, {
      cwd: '/work/acme-service/apps/api',
      repoPath: '/work/acme-service',
      repoName: 'acme-service',
      branch: 'feature/memory-hooks',
    });
    assert.strictEqual(calls[0].limit, 2);
    assert.match(output, /^AW Memory Recall\n- Always scope writes by locationId\.\n- Authorization: \[REDACTED_AUTH_HEADER\]$/);
    assert.doesNotMatch(output, /should-not-leak/);
    assert.doesNotMatch(output, /third result/);
  }));

  results.push(await test('returns empty output for no results and fail-open statuses', async () => {
    const noResults = await buildAwMemoryRecallContext(
      { prompt: 'anything' },
      {
        config: config(),
        memorySearch: async () => ({ ok: true, result: { results: [] } }),
      }
    );
    const timeout = await buildAwMemoryRecallContext(
      { prompt: 'anything' },
      {
        config: config(),
        memorySearch: async () => ({ ok: false, status: 'timeout' }),
      }
    );

    assert.strictEqual(noResults, '');
    assert.strictEqual(timeout, '');
  }));

  results.push(await test('formats bounded recall and ignores malformed entries', () => {
    const output = formatAwMemoryRecall(
      [
        null,
        { text: 'first\nsecond line' },
        { text: '' },
        { content: [{ type: 'text', text: 'nested content' }] },
      ],
      { maxResults: 2, maxItemChars: 20 }
    );

    assert.strictEqual(output, 'AW Memory Recall\n- first second line\n- nested content');
  }));

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
