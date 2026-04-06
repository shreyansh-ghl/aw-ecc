/**
 * Tests for session-end-feedback.js memory feedback hook
 *
 * Tests: sessionUsedMemory, sessionHadError, loadServedMemoryIds
 *
 * Run with: node tests/hooks/session-end-feedback-memory.test.js
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

const hookPath = path.join(repoRoot, 'scripts', 'hooks', 'session-end-feedback.js');

// Load exported functions
let mod;
try {
  mod = require(hookPath);
} catch {
  mod = null;
}

console.log('\n=== Session End Feedback Memory Tests ===\n');

// ──────────────────────────────────────────────────────
// Test group 1: sessionUsedMemory
// ──────────────────────────────────────────────────────

console.log('--- sessionUsedMemory ---');

if (mod && mod.sessionUsedMemory) {
  test('Returns true for content with <team-memory> tag', () => {
    const content = 'Some context...\n<team-memory source="local-cache">\nMemory content\n</team-memory>';
    assert.strictEqual(mod.sessionUsedMemory(content), true);
  });

  test('Returns true for content with <memory-context> tag', () => {
    const content = 'Some context...\n<memory-context>\nMemory content\n</memory-context>';
    assert.strictEqual(mod.sessionUsedMemory(content), true);
  });

  test('Returns false for content without memory tags', () => {
    const content = 'Normal session transcript without any memory injection.';
    assert.strictEqual(mod.sessionUsedMemory(content), false);
  });

  test('Returns false for empty content', () => {
    assert.strictEqual(mod.sessionUsedMemory(''), false);
  });

  test('Returns true for self-closing team-memory tag', () => {
    const content = 'Data...\n<team-memory source="mcp" />\nMore data';
    assert.strictEqual(mod.sessionUsedMemory(content), true);
  });
} else {
  test('sessionUsedMemory function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function sessionUsedMemory'), 'sessionUsedMemory should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 2: sessionHadError
// ──────────────────────────────────────────────────────

console.log('\n--- sessionHadError ---');

if (mod && mod.sessionHadError) {
  test('Returns true for transcript with "fatal error" in tail', () => {
    const content = 'A'.repeat(3000) + '\nProcess exited with fatal error\nDone.';
    assert.strictEqual(mod.sessionHadError(content), true);
  });

  test('Returns true for transcript with "unhandled exception"', () => {
    const content = 'Long transcript...' + 'A'.repeat(1500) + '\nunhandled exception occurred';
    assert.strictEqual(mod.sessionHadError(content), true);
  });

  test('Returns true for transcript with "ENOENT"', () => {
    const content = 'x'.repeat(500) + 'Error: ENOENT: no such file or directory';
    assert.strictEqual(mod.sessionHadError(content), true);
  });

  test('Returns true for transcript with "segmentation fault"', () => {
    const content = 'Running...\nsegmentation fault (core dumped)';
    assert.strictEqual(mod.sessionHadError(content), true);
  });

  test('Returns false for clean transcript', () => {
    const content = 'User: Fix the bug\nAssistant: Done, all tests pass.\nSession complete.';
    assert.strictEqual(mod.sessionHadError(content), false);
  });

  test('Returns false for empty content', () => {
    assert.strictEqual(mod.sessionHadError(''), false);
  });

  test('Only checks last 2000 characters', () => {
    // Error in the beginning but not in the last 2000 chars
    const content = 'fatal error at start\n' + 'A'.repeat(3000) + '\nAll good at the end.';
    assert.strictEqual(mod.sessionHadError(content), false);
  });
} else {
  test('sessionHadError function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function sessionHadError'), 'sessionHadError should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 3: loadServedMemoryIds
// ──────────────────────────────────────────────────────

console.log('\n--- loadServedMemoryIds ---');

if (mod && mod.loadServedMemoryIds) {
  test('Returns null when no temp file exists', () => {
    const origEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = 'nonexistent-feedback-' + Date.now();
    const result = mod.loadServedMemoryIds();
    assert.strictEqual(result, null, 'Should return null');
    process.env.CLAUDE_SESSION_ID = origEnv;
  });

  test('Returns data with ids array from valid file', () => {
    const tmpDir = path.join(os.tmpdir(), 'aw-memory-feedback');
    try { fs.mkdirSync(tmpDir, { recursive: true }); } catch { /* exists */ }

    const sessionId = 'test-feedback-ids-' + Date.now();
    const filePath = path.join(tmpDir, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ ids: ['mem-a', 'mem-b'], timestamp: Date.now() }));

    const origEnv = process.env.CLAUDE_SESSION_ID;
    process.env.CLAUDE_SESSION_ID = sessionId;

    const result = mod.loadServedMemoryIds();
    assert.ok(result !== null, 'Should return non-null');
    assert.deepStrictEqual(result.ids, ['mem-a', 'mem-b'], 'Should contain correct IDs');

    // File should be cleaned up by loadServedMemoryIds
    assert.ok(!fs.existsSync(filePath), 'Should clean up temp file after reading');

    process.env.CLAUDE_SESSION_ID = origEnv;
  });
} else {
  test('loadServedMemoryIds function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function loadServedMemoryIds'), 'loadServedMemoryIds should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 4: Structural
// ──────────────────────────────────────────────────────

console.log('\n--- Structural checks ---');

test('sendFeedback function exists', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('function sendFeedback'), 'sendFeedback should be defined');
});

test('sendFeedback calls memory_feedback MCP tool', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes("'memory_feedback'") || src.includes('"memory_feedback"'), 'Should call memory_feedback tool');
});

test('Feedback type is agent_success or agent_failure based on session outcome', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes("'agent_failure'") || src.includes('"agent_failure"'), 'Should use agent_failure');
  assert.ok(src.includes("'agent_success'") || src.includes('"agent_success"'), 'Should use agent_success');
});

// ──────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
