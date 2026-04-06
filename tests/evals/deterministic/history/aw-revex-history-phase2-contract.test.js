const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { SMOKE_PRESET_CASE_IDS } = require('../../lib/revex-history-phase2');
const { loadRevexHistoryBenchmark } = require('../../lib/revex-history-benchmark');

const RUNNER_PATH = path.join(REPO_ROOT, 'tests/evals/run-aw-sdlc-evals.sh');
const OUTCOME_TEST_PATH = path.join(REPO_ROOT, 'tests/evals/outcomes/aw-revex-history-phase2.test.js');
const LIB_PATH = path.join(REPO_ROOT, 'tests/evals/lib/revex-history-phase2.js');
const CANDIDATE_SCHEMA_PATH = path.join(REPO_ROOT, 'tests/evals/schemas/aw-revex-history-candidate-output.schema.json');
const JUDGE_SCHEMA_PATH = path.join(REPO_ROOT, 'tests/evals/schemas/aw-revex-history-judge-output.schema.json');
const DOC_PATH = path.join(REPO_ROOT, 'docs/aw-revex-history-benchmark.md');
  const README_PATH = path.join(REPO_ROOT, 'tests/evals/README.md');

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
  console.log('\n=== AW RevEx History Phase 2 Contract ===\n');

  const runner = fs.readFileSync(RUNNER_PATH, 'utf8');
  const doc = fs.readFileSync(DOC_PATH, 'utf8');
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const fixture = loadRevexHistoryBenchmark();
  const packs = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, fixture.packsPath), 'utf8'));
  const selectedPack = (packs.packs || []).find(pack => pack.packKey === fixture.packKey);

  let passed = 0;
  let failed = 0;

  const checks = [
    ['phase 2 runner files exist', () => {
      for (const target of [OUTCOME_TEST_PATH, LIB_PATH, CANDIDATE_SCHEMA_PATH, JUDGE_SCHEMA_PATH]) {
        assert.ok(fs.existsSync(target), `missing file: ${path.relative(REPO_ROOT, target)}`);
      }
    }],
    ['top-level eval runner exposes a revex-history mode', () => {
      assert.ok(runner.includes('run_revex_history'), 'run-aw-sdlc-evals.sh should define run_revex_history');
      assert.ok(runner.includes('revex-history'), 'run-aw-sdlc-evals.sh should expose revex-history mode');
    }],
    ['smoke preset points at valid frontend and backend cases', () => {
      assert.ok(Array.isArray(SMOKE_PRESET_CASE_IDS), 'SMOKE_PRESET_CASE_IDS should be exported');
      assert.ok(selectedPack, `selected pack ${fixture.packKey} should exist`);
      assert.deepStrictEqual(
        SMOKE_PRESET_CASE_IDS,
        selectedPack.smokeCaseIds || [],
        'smoke preset should follow the pack registry'
      );
      assert.ok(SMOKE_PRESET_CASE_IDS.length >= 1, 'smoke preset should contain at least one case');
      for (const caseId of SMOKE_PRESET_CASE_IDS) {
        const caseRecord = fixture.cases.find(item => item.id === caseId);
        assert.ok(caseRecord, `missing smoke case ${caseId}`);
      }
      const smokeDomains = new Set(
        SMOKE_PRESET_CASE_IDS
          .map(caseId => fixture.cases.find(item => item.id === caseId))
          .map(caseRecord => caseRecord.domain)
      );
      if ((selectedPack.repos || []).some(repo => repo.domain === 'frontend')) {
        assert.ok(smokeDomains.has('frontend'), 'smoke preset should include a frontend case when the pack includes one');
      }
      if ((selectedPack.repos || []).some(repo => repo.domain === 'backend')) {
        assert.ok(smokeDomains.has('backend'), 'smoke preset should include a backend case when the pack includes one');
      }
      assert.ok(runner.includes('revex-history-smoke'), 'run-aw-sdlc-evals.sh should expose revex-history-smoke mode');
    }],
    ['docs describe phase 2 candidate generation and score artifacts', () => {
      assert.ok(doc.includes('candidate PR'), 'benchmark doc should mention candidate PR output');
      assert.ok(doc.includes('tests/results/'), 'benchmark doc should mention score artifact storage');
      assert.ok(doc.includes('Phase 2'), 'benchmark doc should describe phase 2');
      assert.ok(doc.includes('result card'), 'benchmark doc should mention result cards');
      assert.ok(doc.includes('ledger'), 'benchmark doc should mention the run ledger');
    }],
    ['eval README mentions the RevEx phase 2 outcome runner', () => {
      assert.ok(readme.includes('aw-revex-history-phase2.test.js'), 'README should mention the RevEx phase 2 outcomes test');
    }],
  ];

  for (const [name, fn] of checks) {
    if (test(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
