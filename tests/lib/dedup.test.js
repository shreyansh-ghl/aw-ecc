/**
 * Tests for scripts/lib/dedup.js
 *
 * Tests: hashContent, isDuplicate, recordExtraction, cleanupDedup,
 *        enqueueForExtraction, flushQueue, getQueueStats
 *
 * Run with: node tests/lib/dedup.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');
const dedup = require(path.join(repoRoot, 'scripts', 'lib', 'dedup'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  \u2713 ${name}`);
    passed++;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    failed++;
  }
}

console.log('\n=== Dedup Module Tests ===\n');

// ──────────────────────────────────────────────────────
// Test group 1: hashContent
// ──────────────────────────────────────────────────────

console.log('--- hashContent ---');

test('Returns consistent SHA-256 hex for same input', () => {
  const hash1 = dedup.hashContent('hello world');
  const hash2 = dedup.hashContent('hello world');
  assert.strictEqual(hash1, hash2, 'Same input should produce same hash');
  assert.strictEqual(typeof hash1, 'string', 'Should return a string');
  assert.ok(hash1.length > 0, 'Hash should be non-empty');
});

test('Returns different hashes for different content', () => {
  const hash1 = dedup.hashContent('content A');
  const hash2 = dedup.hashContent('content B');
  assert.notStrictEqual(hash1, hash2, 'Different input should produce different hashes');
});

test('Returns hex string', () => {
  const hash = dedup.hashContent('test');
  assert.ok(/^[a-f0-9]+$/.test(hash), `Hash should be hex: ${hash}`);
});

// ──────────────────────────────────────────────────────
// Test group 2: isDuplicate / recordExtraction
// ──────────────────────────────────────────────────────

console.log('\n--- isDuplicate / recordExtraction ---');

test('isDuplicate returns false for new content', () => {
  const sessionId = 'test-dedup-' + Date.now();
  const result = dedup.isDuplicate(sessionId, 'brand new content ' + Date.now());
  assert.strictEqual(result, false, 'New content should not be duplicate');
  dedup.cleanupDedup(sessionId);
});

test('recordExtraction followed by isDuplicate returns true', () => {
  const sessionId = 'test-record-' + Date.now();
  const content = 'repeated content ' + Date.now();

  dedup.recordExtraction(sessionId, content);
  const result = dedup.isDuplicate(sessionId, content);
  assert.strictEqual(result, true, 'Recorded content should be detected as duplicate');
  dedup.cleanupDedup(sessionId);
});

test('Different content is not a duplicate after recording something else', () => {
  const sessionId = 'test-diff-' + Date.now();

  dedup.recordExtraction(sessionId, 'content alpha');
  const result = dedup.isDuplicate(sessionId, 'content beta');
  assert.strictEqual(result, false, 'Different content should not be duplicate');
  dedup.cleanupDedup(sessionId);
});

// ──────────────────────────────────────────────────────
// Test group 3: cleanupDedup
// ──────────────────────────────────────────────────────

console.log('\n--- cleanupDedup ---');

test('After cleanup, previously-seen content returns false', () => {
  const sessionId = 'test-cleanup-' + Date.now();
  const content = 'cleanup test content';

  dedup.recordExtraction(sessionId, content);
  assert.strictEqual(dedup.isDuplicate(sessionId, content), true, 'Should be duplicate before cleanup');

  dedup.cleanupDedup(sessionId);
  assert.strictEqual(dedup.isDuplicate(sessionId, content), false, 'Should not be duplicate after cleanup');
});

// ──────────────────────────────────────────────────────
// Test group 4: enqueueForExtraction / getQueueStats
// ──────────────────────────────────────────────────────

console.log('\n--- enqueueForExtraction / getQueueStats ---');

test('enqueueForExtraction increments queue count', () => {
  const before = dedup.getQueueStats().pending;
  dedup.enqueueForExtraction('test content for queue', 'session-end', { cwd: '/tmp' });
  const after = dedup.getQueueStats().pending;
  assert.ok(after >= before + 1, `Queue count should increase: before=${before}, after=${after}`);
});

test('getQueueStats returns object with pending count', () => {
  const stats = dedup.getQueueStats();
  assert.strictEqual(typeof stats, 'object', 'Should return an object');
  assert.strictEqual(typeof stats.pending, 'number', 'pending should be a number');
  assert.ok(stats.pending >= 0, 'pending should be non-negative');
});

// ──────────────────────────────────────────────────────
// Test group 5: flushQueue
// ──────────────────────────────────────────────────────

console.log('\n--- flushQueue ---');

async function runFlushQueueTests() {
  await testAsync('flushQueue calls MCP for each entry', async () => {
    // Enqueue an item first
    dedup.enqueueForExtraction('flush test content', 'test-source', { cwd: '/tmp' });

    let callCount = 0;
    const mockMcp = async (toolName, params) => {
      callCount++;
      assert.strictEqual(toolName, 'memory_batch_extract', 'Should call memory_batch_extract');
      return { extracted: 1 };
    };

    const result = await dedup.flushQueue(mockMcp);
    assert.ok(result.processed >= 1, `Should process at least 1 item: ${JSON.stringify(result)}`);
    assert.ok(callCount >= 1, 'Should have called MCP');
  });

  await testAsync('flushQueue returns 0s for empty queue', async () => {
    // Flush everything first
    await dedup.flushQueue(async () => ({}));

    const result = await dedup.flushQueue(async () => ({}));
    assert.strictEqual(result.processed, 0, 'Should process 0 items from empty queue');
    assert.strictEqual(result.failed, 0, 'Should have 0 failures');
  });

  await testAsync('flushQueue retains failed items', async () => {
    dedup.enqueueForExtraction('will-fail content', 'test-source', {});

    const failMcp = async () => { throw new Error('Network error'); };
    const result = await dedup.flushQueue(failMcp);
    assert.ok(result.failed >= 1, 'Should have at least 1 failure');

    const stats = dedup.getQueueStats();
    assert.ok(stats.pending >= 1, 'Failed items should remain in queue');

    // Clean up — flush with success
    await dedup.flushQueue(async () => ({}));
  });
}

// Run async tests then print summary
runFlushQueueTests().then(() => {
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}).catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
