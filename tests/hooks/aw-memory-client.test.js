/**
 * Tests for scripts/hooks/aw-memory-client.js
 *
 * Run with: node tests/hooks/aw-memory-client.test.js
 */

const assert = require('assert');

const {
  callMemoryTool,
  memorySearch,
  memoryStore,
} = require('../../scripts/hooks/aw-memory-client');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => {
          console.log(`  ok ${name}`);
          return true;
        })
        .catch((err) => {
          console.log(`  fail ${name}`);
          console.log(`    Error: ${err.message}`);
          return false;
        });
    }
    console.log(`  ok ${name}`);
    return true;
  } catch (err) {
    console.log(`  fail ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function baseConfig(overrides = {}) {
  return {
    enabled: true,
    timeoutMs: 10000,
    mcp: {
      url: 'https://services.example.test/agentic-workspace/mcp',
      authHeaders: {
        Authorization: 'Bearer secret-token',
      },
    },
    ...overrides,
  };
}

async function runTests() {
  console.log('\n=== Testing aw-memory-client.js ===\n');

  let passed = 0;
  let failed = 0;

  if (await test('calls JSON-RPC tools/call with underscore memory tool names', async () => {
    let captured = null;
    const fetchImpl = async (url, options) => {
      captured = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: '2.0',
          id: JSON.parse(options.body).id,
          result: { content: [{ type: 'text', text: '{"memories":[]}' }] },
        }),
      };
    };

    const result = await memorySearch(baseConfig(), { query: 'hooks', limit: 3 }, { fetch: fetchImpl });

    const body = JSON.parse(captured.options.body);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(captured.url, 'https://services.example.test/agentic-workspace/mcp');
    assert.strictEqual(captured.options.method, 'POST');
    assert.strictEqual(captured.options.headers.Authorization, 'Bearer secret-token');
    assert.strictEqual(captured.options.headers.accept, 'application/json, text/event-stream');
    assert.strictEqual(body.method, 'tools/call');
    assert.strictEqual(body.params.name, 'memory_search');
    assert.deepStrictEqual(body.params.arguments, { query: 'hooks', limit: 3 });
  })) passed++; else failed++;

  if (await test('memoryStore dispatches memory_store', async () => {
    let toolName = null;
    const fetchImpl = async (_url, options) => {
      toolName = JSON.parse(options.body).params.name;
      return {
        ok: true,
        status: 200,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: { ok: true } }),
      };
    };

    const result = await memoryStore(baseConfig(), { content: 'learning' }, { fetch: fetchImpl });

    assert.strictEqual(result.ok, true);
    assert.strictEqual(toolName, 'memory_store');
  })) passed++; else failed++;

  if (await test('fails open when MCP config is missing', async () => {
    const result = await callMemoryTool({ enabled: true, mcp: {} }, 'memory_search', {}, {
      fetch: async () => {
        throw new Error('should not call fetch');
      },
    });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'config_missing');
  })) passed++; else failed++;

  if (await test('converts timeout aborts into structured timeout status', async () => {
    const fetchImpl = async (_url, options) => {
      await new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    };

    const result = await callMemoryTool(baseConfig({ timeoutMs: 1 }), 'memory_search', {}, { fetch: fetchImpl });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'timeout');
  })) passed++; else failed++;

  if (await test('maps auth and server errors without exposing request secrets', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 401,
      text: async () => 'Bearer secret-token rejected',
    });

    const result = await callMemoryTool(baseConfig(), 'memory_search', {}, { fetch: fetchImpl });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'auth_failed');
    assert.ok(!JSON.stringify(result).includes('secret-token'));
  })) passed++; else failed++;

  if (await test('maps MCP unknown tool errors to unknown_tool', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32602, message: 'Unknown tool: memory_search' },
      }),
    });

    const result = await callMemoryTool(baseConfig(), 'memory_search', {}, { fetch: fetchImpl });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'unknown_tool');
  })) passed++; else failed++;

  if (await test('parses streamable HTTP SSE JSON-RPC responses', async () => {
    const fetchImpl = async (_url, options) => ({
      ok: true,
      status: 200,
      headers: {
        get: (name) => (name.toLowerCase() === 'content-type' ? 'text/event-stream' : ''),
      },
      text: async () => [
        'event: message',
        `data: ${JSON.stringify({
          jsonrpc: '2.0',
          id: JSON.parse(options.body).id,
          result: { stored: true },
        })}`,
        '',
      ].join('\n'),
    });

    const result = await memoryStore(baseConfig(), { content: 'learning' }, { fetch: fetchImpl });

    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.result, { stored: true });
  })) passed++; else failed++;

  if (await test('maps MCP isError results to unknown_tool without false success', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          isError: true,
          content: [{ type: 'text', text: 'Error: Unknown or disabled tool: memory_store' }],
        },
      }),
    });

    const result = await callMemoryTool(baseConfig(), 'memory_store', { content: 'learning' }, { fetch: fetchImpl });

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.status, 'unknown_tool');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
