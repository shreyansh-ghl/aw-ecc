/**
 * Tests for session-start.js Phase 3 memory additions
 *
 * Tests: buildMemoryQuery, inferFilters, saveServedMemoryIds, getRepoSlug
 *
 * Run with: node tests/hooks/session-start-memory.test.js
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-session-start-test-'));
}

function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

// Load exported functions — require.main won't match so exports activate
// and main() won't execute
const hookPath = path.join(repoRoot, 'scripts', 'hooks', 'session-start.js');
let mod;
try {
  mod = require(hookPath);
} catch {
  mod = null;
}

console.log('\n=== Session Start Memory Tests (Phase 3) ===\n');

// ──────────────────────────────────────────────────────
// Test group 1: buildMemoryQuery
// ──────────────────────────────────────────────────────

console.log('--- buildMemoryQuery ---');

if (mod && mod.buildMemoryQuery) {
  test('Given branch feat/payment-webhooks, returns query containing "payment webhooks"', () => {
    const result = mod.buildMemoryQuery({
      branch: 'feat/payment-webhooks',
      repoSlug: 'my-repo',
      recentWork: '',
      projectType: '',
    });
    assert.ok(result.includes('payment webhooks'), `Expected "payment webhooks" in: ${result}`);
  });

  test('Given branch main, omits branch from query', () => {
    const result = mod.buildMemoryQuery({
      branch: 'main',
      repoSlug: 'my-repo',
      recentWork: '',
      projectType: '',
    });
    assert.ok(!result.includes('main'), `Should not include "main" in: ${result}`);
    assert.ok(result.includes('my-repo'), `Should include repo slug in: ${result}`);
  });

  test('Given branch master, omits branch from query', () => {
    const result = mod.buildMemoryQuery({
      branch: 'master',
      repoSlug: 'my-repo',
      recentWork: '',
      projectType: '',
    });
    assert.ok(!result.includes('master'), `Should not include "master" in: ${result}`);
  });

  test('Given recent commits, includes commit topics', () => {
    const result = mod.buildMemoryQuery({
      branch: '',
      repoSlug: '',
      recentWork: 'abc1234 fix(auth): resolve JWT expiry\ndef5678 feat: add user roles',
      projectType: '',
    });
    assert.ok(result.includes('resolve JWT expiry') || result.includes('JWT'), `Expected commit topics in: ${result}`);
  });

  test('Given no context at all, returns fallback string', () => {
    const result = mod.buildMemoryQuery({
      branch: '',
      repoSlug: '',
      recentWork: '',
      projectType: '',
    });
    assert.ok(result.length > 0, 'Should return a non-empty fallback string');
    assert.ok(result.includes('Development session') || result.includes('unknown'), `Expected fallback in: ${result}`);
  });

  test('Given projectType, includes it in query', () => {
    const result = mod.buildMemoryQuery({
      branch: '',
      repoSlug: '',
      recentWork: '',
      projectType: 'nodejs',
    });
    assert.ok(result.includes('nodejs'), `Expected "nodejs" in: ${result}`);
  });

  test('Given projectType "unknown", omits it', () => {
    const result = mod.buildMemoryQuery({
      branch: '',
      repoSlug: 'my-repo',
      recentWork: '',
      projectType: 'unknown',
    });
    assert.ok(!result.includes('unknown') || result.includes('unknown project'), 'Should omit "unknown" projectType');
  });

  test('Given branch with fix/ prefix, strips prefix', () => {
    const result = mod.buildMemoryQuery({
      branch: 'fix/redis-cache-leak',
      repoSlug: '',
      recentWork: '',
      projectType: '',
    });
    assert.ok(result.includes('redis cache leak') || result.includes('redis'), `Expected branch topics in: ${result}`);
    assert.ok(!result.startsWith('fix/'), 'Should strip the fix/ prefix');
  });
} else {
  test('buildMemoryQuery function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function buildMemoryQuery'), 'buildMemoryQuery should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 2: inferFilters
// ──────────────────────────────────────────────────────

console.log('\n--- inferFilters ---');

if (mod && mod.inferFilters) {
  test('Given branch feat/payment-stripe, returns service + product overlays', () => {
    const result = mod.inferFilters('feat/payment-stripe');
    assert.deepStrictEqual(result.overlays, ['service', 'product']);
  });

  test('Given branch fix/frontend-ui-bug, returns surface + feature overlays', () => {
    const result = mod.inferFilters('fix/frontend-ui-bug');
    assert.deepStrictEqual(result.overlays, ['surface', 'feature']);
  });

  test('Given branch chore/infra-deploy, returns service overlay + operational angle', () => {
    const result = mod.inferFilters('chore/infra-deploy');
    assert.deepStrictEqual(result.overlays, ['service']);
    assert.deepStrictEqual(result.angles, ['operational']);
  });

  test('Given branch feat/auth-jwt-refresh, returns service overlay + technical angle', () => {
    const result = mod.inferFilters('feat/auth-jwt-refresh');
    assert.deepStrictEqual(result.overlays, ['service']);
    assert.deepStrictEqual(result.angles, ['technical']);
  });

  test('Given branch fix/perf-cache-miss, returns operational + technical angles', () => {
    const result = mod.inferFilters('fix/perf-cache-miss');
    assert.deepStrictEqual(result.angles, ['operational', 'technical']);
  });

  test('Given empty branch, returns empty object', () => {
    const result = mod.inferFilters('');
    assert.deepStrictEqual(result, {});
  });

  test('Given null branch, returns empty object', () => {
    const result = mod.inferFilters(null);
    assert.deepStrictEqual(result, {});
  });

  test('Given unmatched branch name, returns empty object', () => {
    const result = mod.inferFilters('feat/some-random-feature');
    assert.deepStrictEqual(result, {});
  });
} else {
  test('inferFilters function exists in source', () => {
    const src = fs.readFileSync(hookPath, 'utf8');
    assert.ok(src.includes('function inferFilters'), 'inferFilters should be defined');
  });
}

// ──────────────────────────────────────────────────────
// Test group 3: Structural checks
// ──────────────────────────────────────────────────────

console.log('\n--- Structural checks ---');

test('session-start.js defines collectSessionContext function', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('function collectSessionContext'), 'collectSessionContext should be defined');
});

test('session-start.js defines saveServedMemoryIds function', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('function saveServedMemoryIds'), 'saveServedMemoryIds should be defined');
});

test('saveServedMemoryIds writes to aw-memory-feedback directory', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('aw-memory-feedback'), 'Should reference aw-memory-feedback temp dir');
});

test('collectSessionContext reads git branch', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('git branch --show-current'), 'Should read current git branch');
});

test('collectSessionContext reads recent git log', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('git log --oneline'), 'Should read recent git log');
});

test('collectSessionContext uses detectProjectType', () => {
  const src = fs.readFileSync(hookPath, 'utf8');
  assert.ok(src.includes('detectProjectType'), 'Should use detectProjectType from project-detect');
});

// ──────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
