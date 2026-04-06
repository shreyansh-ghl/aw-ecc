const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const SCORECARD_PATH = 'tests/evals/fixtures/aw-eval-benchmark-scorecard.json';
const VALIDATION_PATH = 'tests/evals/fixtures/aw-addy-validation-cases.json';
const ARCHETYPE_PATH = 'tests/evals/fixtures/aw-archetype-scenarios.json';
const PRODUCT_PATH = 'tests/evals/fixtures/aw-product-scenarios.json';
const REVEX_HISTORY_PATH = 'tests/evals/fixtures/aw-revex-history-benchmark.json';
const LIVE_CASES_PATH = 'tests/evals/fixtures/aw-live-craft-skill-cases.json';
const DOC_PATH = 'docs/aw-eval-benchmark-scorecard.md';

function readJson(filePath) {
  return JSON.parse(snapshot.readFile(filePath));
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
  console.log(`\n=== AW Eval Benchmark Scorecard (${REF}) ===\n`);

  const scorecard = readJson(SCORECARD_PATH);
  const validation = readJson(VALIDATION_PATH);
  const archetypes = readJson(ARCHETYPE_PATH);
  const products = readJson(PRODUCT_PATH);
  const revexHistory = readJson(REVEX_HISTORY_PATH);
  const liveCases = readJson(LIVE_CASES_PATH);
  const doc = snapshot.readFile(DOC_PATH);

  let passed = 0;
  let failed = 0;

  if (test('scorecard fixture defines deterministic and live targets', () => {
    assert.strictEqual(scorecard.benchmarkName, 'aw-ecc-addy-parity-benchmark');
    assert.ok(scorecard.deterministicTargets, 'missing deterministicTargets');
    assert.ok(scorecard.liveTargets, 'missing liveTargets');
    assert.ok(scorecard.sourceFixtures, 'missing sourceFixtures');
  })) passed++; else failed++;

  if (test('deterministic targets align with the current validation inventory', () => {
    assert.strictEqual(validation.skillCases.length, 19, 'validation matrix must keep 19 lifecycle skills');
    assert.ok(validation.topUseCases.length >= scorecard.deterministicTargets.topUseCaseCountMin, 'top use cases below target');
    assert.ok(archetypes.cases.length >= scorecard.deterministicTargets.archetypeScenarioCaseCountMin, 'archetype scenarios below target');
    assert.ok(products.cases.length >= scorecard.deterministicTargets.productScenarioCaseCountMin, 'product scenarios below target');
    assert.ok(revexHistory.cases.length >= scorecard.deterministicTargets.revexHistoryCaseCountMin, 'RevEx history cases below target');
    assert.ok(validation.autoIntentCases.length >= scorecard.deterministicTargets.autoIntentCaseCountMin, 'auto-intent cases below target');
    assert.strictEqual(scorecard.deterministicTargets.lifecycleSkillCoveragePercent, 100, 'lifecycle skill coverage target should be 100%');
    assert.strictEqual(scorecard.deterministicTargets.validationFixtureSyncPercent, 100, 'validation fixture sync target should be 100%');
    assert.strictEqual(scorecard.deterministicTargets.triggerMatrixCoveragePercent, 100, 'trigger matrix coverage target should be 100%');
  })) passed++; else failed++;

  if (test('live craft-skill benchmark pack covers the minimum target and key craft skills', () => {
    assert.ok(Array.isArray(liveCases.cases), 'live craft-skill cases missing');
    assert.ok(liveCases.cases.length >= scorecard.liveTargets.craftSkillCaseCountMin, 'live craft-skill case count below target');

    const supportingSkills = new Set(liveCases.cases.map(testCase => testCase.expectedSupportingSkill));
    for (const skill of [
      'idea-refine',
      'api-and-interface-design',
      'browser-testing-with-devtools',
      'code-simplification',
      'security-and-hardening',
      'performance-optimization',
      'git-workflow-and-versioning',
      'ci-cd-and-automation',
      'deprecation-and-migration',
      'documentation-and-adrs',
    ]) {
      assert.ok(supportingSkills.has(skill), `live benchmark missing ${skill}`);
    }
  })) passed++; else failed++;

  if (test('live benchmark thresholds are documented with sensible floors', () => {
    assert.ok(scorecard.liveTargets.routeAccuracyPercentMin >= 90, 'route accuracy target should be at least 90%');
    assert.ok(scorecard.liveTargets.primarySkillAccuracyPercentMin >= 90, 'primary skill accuracy target should be at least 90%');
    assert.ok(scorecard.liveTargets.supportingSkillAccuracyPercentMin >= 80, 'supporting skill accuracy target should be at least 80%');
    assert.ok(scorecard.liveTargets.recommendedRunsPerCase >= 3, 'recommended live runs should be at least 3');
  })) passed++; else failed++;

  if (test('benchmark scorecard doc stays aligned with the fixture', () => {
    assert.ok(doc.includes('Deterministic Benchmark'), 'scorecard doc missing deterministic section');
    assert.ok(doc.includes('Live Benchmark'), 'scorecard doc missing live section');
    assert.ok(doc.includes('archetype'), 'scorecard doc should mention archetype coverage');
    assert.ok(doc.includes('product'), 'scorecard doc should mention product coverage');
    assert.ok(doc.includes('RevEx'), 'scorecard doc should mention RevEx history coverage');
    assert.ok(doc.includes('90%'), 'scorecard doc should mention live thresholds');
    assert.ok(doc.includes('85%'), 'scorecard doc should mention supporting-skill threshold');
    assert.ok(doc.includes('3 runs per case'), 'scorecard doc should mention run count guidance');
    assert.ok(doc.includes('aw-live-craft-skill-cases.json'), 'scorecard doc should reference the live craft-skill fixture');
    assert.ok(doc.includes('aw-product-scenarios.json'), 'scorecard doc should reference the product fixture');
    assert.ok(doc.includes('aw-revex-history-benchmark.json'), 'scorecard doc should reference the RevEx history fixture');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
