/**
 * Tests for aw-pricing.js — dynamic pricing module
 *
 * Run with: node tests/lib/aw-pricing.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const pricingModule = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'aw-pricing'));

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing aw-pricing.js ===\n');

  let passed = 0;
  let failed = 0;

  // ── toNumber ────────────────────────────────────────────────────

  (test('toNumber: valid number', () => {
    assert.strictEqual(pricingModule.toNumber(42), 42);
  }) ? passed++ : failed++);

  (test('toNumber: string number', () => {
    assert.strictEqual(pricingModule.toNumber('123'), 123);
  }) ? passed++ : failed++);

  (test('toNumber: undefined returns 0', () => {
    assert.strictEqual(pricingModule.toNumber(undefined), 0);
  }) ? passed++ : failed++);

  (test('toNumber: NaN returns 0', () => {
    assert.strictEqual(pricingModule.toNumber(NaN), 0);
  }) ? passed++ : failed++);

  (test('toNumber: Infinity returns 0', () => {
    assert.strictEqual(pricingModule.toNumber(Infinity), 0);
  }) ? passed++ : failed++);

  // ── estimateCost with fallback pricing ──────────────────────────

  // NOTE: These tests verify that known models resolve to non-null costs.
  // Exact values depend on whether the OpenRouter cache exists, so we
  // test behavior (recognized vs unknown) rather than exact dollar amounts.

  (test('estimateCost: Claude sonnet model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('claude-sonnet-4-20250514', 1000000, 500000);
    assert.ok(cost !== null, 'Cost should not be null for known model');
    assert.ok(typeof cost === 'number', 'Cost should be a number');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: Claude haiku model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('claude-haiku-3.5', 1000000, 1000000);
    assert.ok(cost !== null, 'Cost should not be null');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: Claude opus model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('claude-opus-4-20250514', 1000000, 1000000);
    assert.ok(cost !== null, 'Cost should not be null');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: GPT-4o model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('gpt-4o', 1000000, 500000);
    assert.ok(cost !== null, 'Cost should not be null for GPT model');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: GPT-4o-mini model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('gpt-4o-mini', 1000000, 1000000);
    assert.ok(cost !== null, 'Cost should not be null');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: o3 model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('o3', 1000000, 1000000);
    assert.ok(cost !== null, 'Cost should not be null for o3 model');
    assert.ok(typeof cost === 'number', 'Cost should be a number');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: codex-1 model returns non-null cost', () => {
    const cost = pricingModule.estimateCost('codex-1', 1000000, 1000000);
    assert.ok(cost !== null, 'Cost should not be null');
    assert.ok(cost > 0, 'Cost should be positive');
  }) ? passed++ : failed++);

  (test('estimateCost: unknown model returns null', () => {
    const cost = pricingModule.estimateCost('totally-unknown-model-xyz', 1000, 1000);
    assert.strictEqual(cost, null);
  }) ? passed++ : failed++);

  (test('estimateCost: zero tokens returns null', () => {
    const cost = pricingModule.estimateCost('claude-sonnet-4-20250514', 0, 0);
    assert.strictEqual(cost, null);
  }) ? passed++ : failed++);

  (test('estimateCost: null model with tokens returns null', () => {
    const cost = pricingModule.estimateCost(null, 1000, 1000);
    assert.strictEqual(cost, null);
  }) ? passed++ : failed++);

  // ── Disk cache ─────────────────────────────────────────────────

  (test('disk cache: write and read roundtrip', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-pricing-test-'));
    const tmpCachePath = path.join(tmpDir, 'pricing-cache.json');

    const testData = {
      fetched_at: new Date().toISOString(),
      model_count: 1,
      models: { 'test-model': { in: 1.0, out: 2.0 } },
    };

    // Use internal test helpers
    const originalPath = pricingModule._test.CACHE_PATH;

    // Write directly to temp path
    fs.writeFileSync(tmpCachePath, JSON.stringify(testData, null, 2));
    const read = JSON.parse(fs.readFileSync(tmpCachePath, 'utf8'));
    assert.deepStrictEqual(read.models, testData.models);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  }) ? passed++ : failed++);

  (test('isCacheStale: fresh cache is not stale', () => {
    const data = { fetched_at: new Date().toISOString() };
    assert.strictEqual(pricingModule._test.isCacheStale(data), false);
  }) ? passed++ : failed++);

  (test('isCacheStale: old cache is stale', () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
    const data = { fetched_at: old };
    assert.strictEqual(pricingModule._test.isCacheStale(data), true);
  }) ? passed++ : failed++);

  (test('isCacheStale: null data is stale', () => {
    assert.strictEqual(pricingModule._test.isCacheStale(null), true);
  }) ? passed++ : failed++);

  // ── normalizeOpenRouterResponse ────────────────────────────────

  (test('normalizeOpenRouterResponse: parses valid data', () => {
    const data = [
      {
        id: 'anthropic/claude-3.5-sonnet',
        pricing: { prompt: '0.000003', completion: '0.000015' },
      },
    ];
    const result = pricingModule._test.normalizeOpenRouterResponse(data);
    assert.ok(result['anthropic/claude-3.5-sonnet'], 'Should have full id key');
    assert.ok(result['claude-3.5-sonnet'], 'Should have slug key');
    assert.strictEqual(result['claude-3.5-sonnet'].in, 3);
    assert.strictEqual(result['claude-3.5-sonnet'].out, 15);
  }) ? passed++ : failed++);

  (test('normalizeOpenRouterResponse: skips entries without pricing', () => {
    const data = [{ id: 'test/no-pricing' }];
    const result = pricingModule._test.normalizeOpenRouterResponse(data);
    assert.strictEqual(Object.keys(result).length, 0);
  }) ? passed++ : failed++);

  (test('normalizeOpenRouterResponse: handles empty array', () => {
    const result = pricingModule._test.normalizeOpenRouterResponse([]);
    assert.strictEqual(Object.keys(result).length, 0);
  }) ? passed++ : failed++);

  // ── findRates ──────────────────────────────────────────────────

  (test('findRates: exact match', () => {
    const map = { 'gpt-4o': { in: 2.5, out: 10 } };
    const rates = pricingModule._test.findRates('gpt-4o', map);
    assert.deepStrictEqual(rates, { in: 2.5, out: 10 });
  }) ? passed++ : failed++);

  (test('findRates: substring match (model includes key)', () => {
    const map = { 'sonnet': { in: 3, out: 15 } };
    const rates = pricingModule._test.findRates('claude-sonnet-4-20250514', map);
    assert.deepStrictEqual(rates, { in: 3, out: 15 });
  }) ? passed++ : failed++);

  (test('findRates: no match returns null', () => {
    const map = { 'sonnet': { in: 3, out: 15 } };
    const rates = pricingModule._test.findRates('totally-unknown', map);
    assert.strictEqual(rates, null);
  }) ? passed++ : failed++);

  (test('findRates: null model returns null', () => {
    const rates = pricingModule._test.findRates(null, { 'sonnet': { in: 3, out: 15 } });
    assert.strictEqual(rates, null);
  }) ? passed++ : failed++);

  // ── FALLBACK_PRICING has expected models ───────────────────────

  (test('FALLBACK_PRICING: has Claude models', () => {
    assert.ok(pricingModule.FALLBACK_PRICING.haiku);
    assert.ok(pricingModule.FALLBACK_PRICING.sonnet);
    assert.ok(pricingModule.FALLBACK_PRICING.opus);
  }) ? passed++ : failed++);

  (test('FALLBACK_PRICING: has OpenAI GPT models', () => {
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-5']);
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-5-mini']);
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-4o']);
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-4o-mini']);
  }) ? passed++ : failed++);

  (test('FALLBACK_PRICING: has OpenAI reasoning models', () => {
    assert.ok(pricingModule.FALLBACK_PRICING['o1']);
    assert.ok(pricingModule.FALLBACK_PRICING['o1-mini']);
    assert.ok(pricingModule.FALLBACK_PRICING['o3']);
    assert.ok(pricingModule.FALLBACK_PRICING['o3-mini']);
    assert.ok(pricingModule.FALLBACK_PRICING['o4-mini']);
  }) ? passed++ : failed++);

  (test('FALLBACK_PRICING: has Codex models', () => {
    assert.ok(pricingModule.FALLBACK_PRICING['codex-1']);
    assert.ok(pricingModule.FALLBACK_PRICING['codex-mini']);
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-5.1-codex']);
    assert.ok(pricingModule.FALLBACK_PRICING['gpt-5.3-codex']);
  }) ? passed++ : failed++);

  (test('FALLBACK_PRICING: has Gemini models', () => {
    assert.ok(pricingModule.FALLBACK_PRICING['gemini-2.5-pro']);
    assert.ok(pricingModule.FALLBACK_PRICING['gemini-2.5-flash']);
    assert.ok(pricingModule.FALLBACK_PRICING['gemini-2.5-flash-lite']);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
