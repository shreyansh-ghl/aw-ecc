/**
 * Tests for compaction-extract.js Phase 1/3 memory additions
 *
 * Tests: stripTranscriptNoise, loadServedMemoryIds, run()
 *
 * Run with: node tests/hooks/compaction-extract-memory.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const repoRoot = path.resolve(__dirname, '..', '..');

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

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-compaction-test-'));
}

function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// Load module — compaction-extract.js exports { run, stripTranscriptNoise, loadServedMemoryIds }
const hookPath = path.join(repoRoot, 'scripts', 'hooks', 'compaction-extract.js');
const mod = require(hookPath);

console.log('\n=== Compaction Extract Memory Tests (Phase 1/3) ===\n');

// ──────────────────────────────────────────────────────
// Test group 1: stripTranscriptNoise
// ──────────────────────────────────────────────────────

console.log('--- stripTranscriptNoise ---');

test('Removes parentUuid JSON lines', () => {
  const input = 'normal text\n  {"parentUuid":"abc","isSidechain":true}\nmore text';
  const result = mod.stripTranscriptNoise(input);
  assert.ok(!result.includes('parentUuid'), `Should remove parentUuid line: ${result}`);
  assert.ok(result.includes('normal text'), 'Should keep normal text');
  assert.ok(result.includes('more text'), 'Should keep other text');
});

test('Removes jsonrpc lines', () => {
  const input = 'before\n  {"jsonrpc":"2.0","method":"tools/call","params":{}}\nafter';
  const result = mod.stripTranscriptNoise(input);
  assert.ok(!result.includes('jsonrpc'), `Should remove jsonrpc line: ${result}`);
});

test('Replaces base64 data with [binary-data]', () => {
  const base64 = 'A'.repeat(120);
  const input = `data: ${base64} end`;
  const result = mod.stripTranscriptNoise(input);
  assert.ok(result.includes('[binary-data]'), `Should replace base64 with [binary-data]: ${result}`);
  assert.ok(!result.includes(base64), 'Should not contain original base64');
});

test('Replaces embedding arrays with [embedding-vector]', () => {
  const embedding = '[' + Array.from({ length: 25 }, (_, i) => `0.${i}`).join(',') + ']';
  const input = `embedding: ${embedding} done`;
  const result = mod.stripTranscriptNoise(input);
  assert.ok(result.includes('[embedding-vector]'), `Should replace embedding array: ${result}`);
});

test('Removes line-numbered file output (Read tool output)', () => {
  const input = 'before\n     1→const x = 1;\n     2→const y = 2;\nafter';
  const result = mod.stripTranscriptNoise(input);
  assert.ok(!result.includes('→const x'), `Should remove numbered lines: ${result}`);
  assert.ok(result.includes('after'), 'Should keep surrounding text');
});

test('Collapses multiple blank lines to double newline', () => {
  const input = 'first\n\n\n\n\nsecond';
  const result = mod.stripTranscriptNoise(input);
  assert.ok(!result.includes('\n\n\n'), `Should collapse blank lines: ${JSON.stringify(result)}`);
});

test('Preserves normal transcript content', () => {
  const input = 'User asked about Redis caching patterns.\nAssistant explained SCAN vs KEYS.';
  const result = mod.stripTranscriptNoise(input);
  assert.strictEqual(result, input, 'Normal text should pass through unchanged');
});

// ──────────────────────────────────────────────────────
// Test group 2: loadServedMemoryIds
// ──────────────────────────────────────────────────────

console.log('\n--- loadServedMemoryIds ---');

test('Returns empty Set when no file exists', () => {
  const origEnv = process.env.CLAUDE_SESSION_ID;
  process.env.CLAUDE_SESSION_ID = 'nonexistent-session-' + Date.now();
  const result = mod.loadServedMemoryIds();
  assert.ok(result instanceof Set, 'Should return a Set');
  assert.strictEqual(result.size, 0, 'Should be empty');
  process.env.CLAUDE_SESSION_ID = origEnv;
});

test('Returns Set of IDs from valid JSON file', () => {
  const tmpDir = path.join(os.tmpdir(), 'aw-memory-feedback');
  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

  const sessionId = 'test-session-' + Date.now();
  const filePath = path.join(tmpDir, `${sessionId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ ids: ['id-1', 'id-2', 'id-3'] }));

  const origEnv = process.env.CLAUDE_SESSION_ID;
  process.env.CLAUDE_SESSION_ID = sessionId;

  const result = mod.loadServedMemoryIds();
  assert.ok(result instanceof Set, 'Should return a Set');
  assert.strictEqual(result.size, 3, 'Should have 3 IDs');
  assert.ok(result.has('id-1'), 'Should contain id-1');
  assert.ok(result.has('id-2'), 'Should contain id-2');

  // Cleanup
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  process.env.CLAUDE_SESSION_ID = origEnv;
});

test('Returns empty Set on malformed JSON', () => {
  const tmpDir = path.join(os.tmpdir(), 'aw-memory-feedback');
  try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

  const sessionId = 'test-bad-json-' + Date.now();
  const filePath = path.join(tmpDir, `${sessionId}.json`);
  fs.writeFileSync(filePath, 'not valid json');

  const origEnv = process.env.CLAUDE_SESSION_ID;
  process.env.CLAUDE_SESSION_ID = sessionId;

  const result = mod.loadServedMemoryIds();
  assert.ok(result instanceof Set, 'Should return a Set on error');
  assert.strictEqual(result.size, 0, 'Should be empty on parse error');

  try { fs.unlinkSync(filePath); } catch { /* ignore */ }
  process.env.CLAUDE_SESSION_ID = origEnv;
});

// ──────────────────────────────────────────────────────
// Test group 3: run() export
// ──────────────────────────────────────────────────────

console.log('\n--- run() ---');

test('run() returns input unchanged', () => {
  const input = '{"summary": "test compaction summary"}';
  const result = mod.run(input);
  assert.strictEqual(result, input, 'run() should return raw input as-is');
});

test('run() returns empty string for empty input', () => {
  const result = mod.run('');
  assert.strictEqual(result, '', 'run() should return empty string');
});

test('run() returns empty string for null input', () => {
  const result = mod.run(null);
  assert.strictEqual(result, '', 'run() should return empty string for null');
});

// ──────────────────────────────────────────────────────
// Test group 4: Structural — injectSupplementalMemories
// ──────────────────────────────────────────────────────

console.log('\n--- Structural checks ---');

test('injectSupplementalMemories function exists', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('function injectSupplementalMemories'), 'injectSupplementalMemories should be defined');
});

test('injectSupplementalMemories filters by content length < 300', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('content.length < 300'), 'Should filter memories > 300 chars');
});

test('injectSupplementalMemories limits to 3 supplemental memories', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('.slice(0, 3)'), 'Should limit to 3 supplemental memories');
});

test('injectSupplementalMemories deduplicates against served IDs', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('servedIds.has'), 'Should check against served memory IDs');
});

test('injectSupplementalMemories outputs supplemental-memories XML tag', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('<supplemental-memories'), 'Should output supplemental-memories tag');
});

// ──────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
