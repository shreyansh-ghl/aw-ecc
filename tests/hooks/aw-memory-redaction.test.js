/**
 * Tests for scripts/hooks/aw-memory-redaction.js
 *
 * Run with: node tests/hooks/aw-memory-redaction.test.js
 */

const assert = require('assert');

const {
  redactForMemory,
  truncateForMemory,
  summarizeRedaction,
} = require('../../scripts/hooks/aw-memory-redaction');

function test(name, fn) {
  try {
    fn();
    console.log(`  ok ${name}`);
    return true;
  } catch (err) {
    console.log(`  fail ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing aw-memory-redaction.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('redacts authorization headers and known token env assignments', () => {
    const input = [
      'Authorization: Bearer abc.def.ghi',
      'GHL_AI_MCP_BEARER_TOKEN=secret-value',
      'GITHUB_TOKEN=ghp_secret',
      'normal context stays visible',
    ].join('\n');

    const result = redactForMemory(input, { maxChars: 1000 });

    assert.ok(result.value.includes('[REDACTED_AUTH_HEADER]'));
    assert.ok(result.value.includes('GHL_AI_MCP_BEARER_TOKEN=[REDACTED_SECRET]'));
    assert.ok(result.value.includes('GITHUB_TOKEN=[REDACTED_SECRET]'));
    assert.ok(result.value.includes('normal context stays visible'));
    assert.ok(!result.value.includes('abc.def.ghi'));
    assert.ok(!result.value.includes('secret-value'));
    assert.ok(!result.value.includes('ghp_secret'));
    assert.ok(result.redactions >= 3);
  })) passed++; else failed++;

  if (test('redacts private key blocks', () => {
    const input = [
      'before',
      '-----BEGIN PRIVATE KEY-----',
      'abc123',
      '-----END PRIVATE KEY-----',
      'after',
    ].join('\n');

    const result = redactForMemory(input, { maxChars: 1000 });

    assert.ok(result.value.includes('[REDACTED_PRIVATE_KEY]'));
    assert.ok(result.value.includes('before'));
    assert.ok(result.value.includes('after'));
    assert.ok(!result.value.includes('abc123'));
    assert.strictEqual(result.redactions, 1);
  })) passed++; else failed++;

  if (test('truncates long content deterministically after redaction', () => {
    const result = redactForMemory('x'.repeat(200), { maxChars: 50 });

    assert.strictEqual(result.truncated, true);
    assert.ok(result.value.length <= 80);
    assert.ok(result.value.includes('[TRUNCATED'));
  })) passed++; else failed++;

  if (test('truncateForMemory handles non-positive caps safely', () => {
    const result = truncateForMemory('abcdef', 0);

    assert.deepStrictEqual(result, {
      value: '',
      truncated: true,
    });
  })) passed++; else failed++;

  if (test('summarizeRedaction returns metadata only', () => {
    const summary = summarizeRedaction({
      redactions: 2,
      truncated: true,
      value: 'sensitive text',
    });

    assert.deepStrictEqual(summary, {
      redactions: 2,
      truncated: true,
    });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();

