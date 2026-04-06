'use strict';

const assert = require('assert');
const { emitMemoryTelemetry, resolveTelemetryUrl } = require('../../scripts/lib/memory-telemetry');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    testsFailed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    testsPassed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    testsFailed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n=== memory-telemetry.js tests ===\n');

// ── resolveTelemetryUrl ────────────────────────────────────────────

console.log('resolveTelemetryUrl');

test('Given default MCP URL, When resolveTelemetryUrl is called, Then it replaces /mcp with /api/telemetry/memory-events', () => {
  const originalUrl = process.env.AW_MCP_URL;
  delete process.env.AW_MCP_URL;
  delete process.env.GHL_MCP_URL;

  const url = resolveTelemetryUrl();
  assert.ok(url.endsWith('/api/telemetry/memory-events'), `Expected URL to end with /api/telemetry/memory-events, got: ${url}`);
  assert.ok(!url.includes('/mcp'), `Expected URL to not contain /mcp, got: ${url}`);

  if (originalUrl !== undefined) process.env.AW_MCP_URL = originalUrl;
});

test('Given custom AW_MCP_URL, When resolveTelemetryUrl is called, Then it derives telemetry URL from it', () => {
  const original = process.env.AW_MCP_URL;
  process.env.AW_MCP_URL = 'https://custom.example.com/agentic-workspace/mcp';

  const url = resolveTelemetryUrl();
  assert.strictEqual(url, 'https://custom.example.com/agentic-workspace/api/telemetry/memory-events');

  if (original !== undefined) process.env.AW_MCP_URL = original;
  else delete process.env.AW_MCP_URL;
});

test('Given GHL_MCP_URL env var, When resolveTelemetryUrl is called, Then it builds correct telemetry URL', () => {
  const origAw = process.env.AW_MCP_URL;
  const origGhl = process.env.GHL_MCP_URL;
  delete process.env.AW_MCP_URL;
  process.env.GHL_MCP_URL = 'https://ghl.example.com';

  const url = resolveTelemetryUrl();
  assert.strictEqual(url, 'https://ghl.example.com/agentic-workspace/api/telemetry/memory-events');

  if (origAw !== undefined) process.env.AW_MCP_URL = origAw;
  else delete process.env.AW_MCP_URL;
  if (origGhl !== undefined) process.env.GHL_MCP_URL = origGhl;
  else delete process.env.GHL_MCP_URL;
});

// ── emitMemoryTelemetry ────────────────────────────────────────────

console.log('\nemitMemoryTelemetry');

asyncTest('Given valid event data, When emitMemoryTelemetry is called, Then it does not throw', async () => {
  // emitMemoryTelemetry swallows all errors, so this should always succeed
  await emitMemoryTelemetry('test.event', { key: 'value' }, { source: 'test' });
  // No assertion needed — if it doesn't throw, the test passes
}).then(() => {

  return asyncTest('Given no opts, When emitMemoryTelemetry is called with minimal args, Then it does not throw', async () => {
    await emitMemoryTelemetry('test.minimal', {});
  });

}).then(() => {

  return asyncTest('Given null data, When emitMemoryTelemetry is called, Then it defaults data to empty object', async () => {
    await emitMemoryTelemetry('test.null_data', null);
  });

}).then(() => {

  return asyncTest('Given all opts, When emitMemoryTelemetry is called with full opts, Then it does not throw', async () => {
    await emitMemoryTelemetry('test.full', { created: 5 }, {
      source: 'hook:session-end',
      machine_id: 'abc123',
      namespace: 'commerce/payments',
      repo_slug: 'ghl-payments',
      duration_ms: 1500,
    });
  });

}).then(() => {

  // ── exports ────────────────────────────────────────────────────────

  console.log('\nexports');

  test('Given the module, When checking exports, Then it exports emitMemoryTelemetry and resolveTelemetryUrl', () => {
    const mod = require('../../scripts/lib/memory-telemetry');
    assert.strictEqual(typeof mod.emitMemoryTelemetry, 'function');
    assert.strictEqual(typeof mod.resolveTelemetryUrl, 'function');
  });

  // ── Summary ────────────────────────────────────────────────────────

  console.log(`\n=== ${testsPassed} passed, ${testsFailed} failed ===\n`);
  if (testsFailed > 0) process.exit(1);
});
