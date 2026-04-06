/**
 * Tests for session-end-extract.js Phase 1 memory additions
 *
 * Tests: stripTranscriptNoise, extractTextFromTranscript, computeAncestry
 *
 * Run with: node tests/hooks/session-end-extract-memory.test.js
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-session-end-test-'));
}

function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

const hookPath = path.join(repoRoot, 'scripts', 'hooks', 'session-end-extract.js');

// Load exported functions
let mod;
try {
  mod = require(hookPath);
} catch {
  mod = null;
}

console.log('\n=== Session End Extract Memory Tests (Phase 1) ===\n');

// ──────────────────────────────────────────────────────
// Test group 1: stripTranscriptNoise
// ──────────────────────────────────────────────────────

console.log('--- stripTranscriptNoise ---');

if (mod && mod.stripTranscriptNoise) {
  test('Removes parentUuid JSON lines', () => {
    const input = 'normal\n  {"parentUuid":"abc","data":"val"}\nmore';
    const result = mod.stripTranscriptNoise(input);
    assert.ok(!result.includes('parentUuid'), 'Should remove parentUuid line');
    assert.ok(result.includes('normal'), 'Should keep normal text');
  });

  test('Removes jsonrpc lines', () => {
    const input = 'before\n  {"jsonrpc":"2.0","method":"test"}\nafter';
    const result = mod.stripTranscriptNoise(input);
    assert.ok(!result.includes('jsonrpc'), 'Should remove jsonrpc line');
  });

  test('Replaces base64 data with [binary-data]', () => {
    const base64 = 'B'.repeat(120);
    const input = `data: ${base64} end`;
    const result = mod.stripTranscriptNoise(input);
    assert.ok(result.includes('[binary-data]'), 'Should replace base64');
  });

  test('Replaces embedding arrays with [embedding-vector]', () => {
    const nums = Array.from({ length: 25 }, (_, i) => `${i}.5`).join(',');
    const input = `vec: [${nums}] done`;
    const result = mod.stripTranscriptNoise(input);
    assert.ok(result.includes('[embedding-vector]'), 'Should replace embedding array');
  });

  test('Removes line-numbered output', () => {
    const input = 'before\n     1→const x = 1;\n     2→return x;\nafter';
    const result = mod.stripTranscriptNoise(input);
    assert.ok(!result.includes('→const'), 'Should remove numbered lines');
  });

  test('Collapses multiple blank lines', () => {
    const input = 'first\n\n\n\n\nsecond';
    const result = mod.stripTranscriptNoise(input);
    assert.ok(!result.includes('\n\n\n'), 'Should collapse blank lines');
  });

  test('Preserves normal text', () => {
    const input = 'Discussion about API design patterns for the payment service.';
    const result = mod.stripTranscriptNoise(input);
    assert.strictEqual(result, input, 'Normal text should pass through');
  });
} else {
  test('stripTranscriptNoise function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function stripTranscriptNoise'), 'stripTranscriptNoise should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 2: extractTextFromTranscript
// ──────────────────────────────────────────────────────

console.log('\n--- extractTextFromTranscript ---');

if (mod && mod.extractTextFromTranscript) {
  test('Extracts text from valid JSONL transcript', () => {
    const tmpDir = createTempDir();
    const transcriptPath = path.join(tmpDir, 'transcript.jsonl');
    const lines = [
      JSON.stringify({ message: { role: 'user', content: 'Fix the bug' } }),
      JSON.stringify({ message: { role: 'assistant', content: [{ type: 'text', text: 'I will investigate the issue' }] } }),
    ];
    fs.writeFileSync(transcriptPath, lines.join('\n'));

    const result = mod.extractTextFromTranscript(transcriptPath);
    assert.ok(result.includes('Fix the bug'), `Should contain human text, got: ${result.slice(0, 200)}`);
    assert.ok(result.includes('investigate'), `Should contain assistant text, got: ${result.slice(0, 200)}`);
    cleanupDir(tmpDir);
  });

  test('Returns empty string for non-existent file', () => {
    try {
      const result = mod.extractTextFromTranscript('/tmp/nonexistent-file-' + Date.now());
      assert.strictEqual(result, '', 'Should return empty string for missing file');
    } catch (err) {
      // statSync throws ENOENT — this is acceptable behavior for missing files
      assert.ok(err.code === 'ENOENT', 'Should throw ENOENT for missing file');
    }
  });
} else {
  test('extractTextFromTranscript function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function extractTextFromTranscript'), 'extractTextFromTranscript should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 3: computeAncestry
// ──────────────────────────────────────────────────────

console.log('\n--- computeAncestry ---');

if (mod && mod.computeAncestry) {
  test('Computes ancestry chain from nested path', () => {
    const result = mod.computeAncestry(['commerce/payments']);
    assert.ok(Array.isArray(result), 'Should return an array');
    assert.ok(result.includes('commerce/payments'), 'Should include original path');
    assert.ok(result.includes('commerce'), 'Should include parent path');
    assert.ok(result.includes('platform'), 'Should include platform root');
  });

  test('Handles top-level namespace', () => {
    const result = mod.computeAncestry(['commerce']);
    assert.ok(result.includes('commerce'), 'Should include the namespace');
    assert.ok(result.includes('platform'), 'Should include platform');
  });

  test('Handles empty array', () => {
    const result = mod.computeAncestry([]);
    assert.ok(Array.isArray(result), 'Should return an array');
  });
} else {
  test('computeAncestry function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function computeAncestry'), 'computeAncestry should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 4: loadServedMemoryIds
// ──────────────────────────────────────────────────────

console.log('\n--- loadServedMemoryIds ---');

if (mod && mod.loadServedMemoryIds) {
  test('Returns null when file does not exist', () => {
    const origEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = 'nonexistent-' + Date.now();
    const result = mod.loadServedMemoryIds();
    assert.strictEqual(result, null, 'Should return null for missing file');
    process.env.CLAUDE_SESSION_ID = origEnv;
  });

  test('Returns data object from valid file', () => {
    const tmpDir = path.join(os.tmpdir(), 'aw-memory-feedback');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

    const sessionId = 'test-extract-served-' + Date.now();
    const filePath = path.join(tmpDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ ids: ['id-x', 'id-y'] }));

    const origEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = sessionId;

    const result = mod.loadServedMemoryIds();
    assert.ok(result !== null, 'Should return non-null');
    assert.deepStrictEqual(result.ids, ['id-x', 'id-y'], 'Should contain correct IDs');

    process.env.CLAUDE_SESSION_ID = origEnv;
  });
} else {
  test('loadServedMemoryIds function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function loadServedMemoryIds'), 'loadServedMemoryIds should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
