const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);
const MANIFEST_PATH = 'tests/evals/suites.json';

function readJson(filePath) {
  return JSON.parse(snapshot.readFile(filePath));
}

function assertPathExists(filePath, label) {
  assert.ok(snapshot.fileExists(filePath), `${label} is missing ${filePath}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

function run() {
  console.log(`\n=== AW Eval Suite Manifest (${REF}) ===\n`);

  const manifest = readJson(MANIFEST_PATH);
  const suiteFiles = manifest.suiteFiles || [];
  const suites = suiteFiles.map(filePath => ({
    manifestPath: filePath,
    ...readJson(`tests/evals/${filePath}`),
  }));
  let passed = 0;
  let failed = 0;

  if (test('suite manifest exists and declares eval ownership suites', () => {
    assert.strictEqual(manifest.version, 2);
    assert.ok(Array.isArray(suiteFiles), 'suites.json should contain a suiteFiles array');
    assert.ok(suiteFiles.length >= 5, 'expected at least five suite entries');
    for (const filePath of suiteFiles) {
      assert.ok(filePath.startsWith('suites/'), `suite manifest should live under tests/evals/suites/: ${filePath}`);
      assertPathExists(`tests/evals/${filePath}`, 'suite manifest file');
    }
  })) passed++; else failed++;

  if (test('every suite points to real owners, tests, fixtures, and docs', () => {
    for (const suite of suites) {
      assert.ok(suite.id, 'suite id is required');
      assert.ok(suite.layer, `${suite.id} is missing layer`);
      assert.ok(Array.isArray(suite.modes) && suite.modes.length > 0, `${suite.id} needs modes`);
      assert.ok(suite.owners, `${suite.id} needs owners`);
      assert.ok(Array.isArray(suite.tests) && suite.tests.length > 0, `${suite.id} needs tests`);

      for (const ownerType of ['commands', 'skills', 'agents']) {
        assert.ok(Array.isArray(suite.owners[ownerType]), `${suite.id} owners.${ownerType} should be an array`);
        for (const ownerPath of suite.owners[ownerType]) {
          assertPathExists(ownerPath, `${suite.id} owner`);
        }
      }

      for (const testPath of suite.tests) {
        assertPathExists(testPath, `${suite.id} test`);
      }

      for (const fixturePath of suite.fixtures || []) {
        assertPathExists(fixturePath, `${suite.id} fixture`);
      }

      for (const docPath of suite.docs || []) {
        assertPathExists(docPath, `${suite.id} doc`);
      }
    }
  })) passed++; else failed++;

  if (test('manifest keeps ownership-first coverage for routing and history benchmarks', () => {
    const ids = new Set(suites.map(entry => entry.id));
    assert.ok(ids.has('core-routing-surface'), 'missing core-routing-surface suite');
    assert.ok(ids.has('router-and-shared-references'), 'missing router-and-shared-references suite');
    assert.ok(ids.has('owner-local-skill-and-agent-assets'), 'missing owner-local-skill-and-agent-assets suite');
    assert.ok(ids.has('revex-history-benchmark'), 'missing revex-history-benchmark suite');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
