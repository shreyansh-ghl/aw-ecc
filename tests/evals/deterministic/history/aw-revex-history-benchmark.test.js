const assert = require('assert');
const Ajv = require('ajv');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const FIXTURE_PATH = 'tests/evals/fixtures/aw-revex-history-benchmark.json';
const SCHEMA_PATH = 'tests/evals/schemas/aw-revex-history-benchmark.schema.json';
const DOC_PATH = 'docs/aw-revex-history-benchmark.md';
const RUBRIC_PATH = 'tests/evals/fixtures/aw-revex-history-judge-rubric.md';

function readJson(filePath) {
  return JSON.parse(snapshot.readFile(filePath));
}

function repoSelectionMinimum(fixture) {
  return Math.min(Math.max(fixture.requestedPerRepo || 1, 1), 8);
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
  console.log(`\n=== AW RevEx History Benchmark (${REF}) ===\n`);

  const fixture = readJson(FIXTURE_PATH);
  const schema = readJson(SCHEMA_PATH);
  const doc = snapshot.readFile(DOC_PATH);
  const rubric = snapshot.readFile(RUBRIC_PATH);
  const packs = readJson(fixture.packsPath);
  const selectedPack = (packs.packs || []).find(pack => pack.packKey === fixture.packKey);
  const ajv = new Ajv({ allErrors: true, strict: false });

  let passed = 0;
  let failed = 0;

  if (test('fixture validates against the benchmark schema', () => {
    const validate = ajv.compile(schema);
    const valid = validate(fixture);
    if (!valid) {
      throw new Error((validate.errors || []).map(error => `${error.instancePath || '/'} ${error.message}`).join('; '));
    }
  })) passed++; else failed++;

  if (test('fixture resolves a concrete benchmark pack with matching repo summaries and at least one case', () => {
    assert.ok(selectedPack, `selected pack ${fixture.packKey} should exist in ${fixture.packsPath}`);
    assert.strictEqual(fixture.packLabel, selectedPack.packLabel, 'fixture pack label should match pack registry');
    assert.strictEqual(fixture.comparisonMode, selectedPack.comparisonMode, 'fixture comparison mode should match pack registry');

    const repoKeys = new Set(fixture.repos.map(repo => repo.repoKey));
    for (const repo of selectedPack.repos || []) {
      assert.ok(repoKeys.has(repo.repoKey), `expected repo summary for ${repo.repoKey}`);
    }
    assert.ok(fixture.cases.length >= 1, 'expected at least one benchmark case');
  })) passed++; else failed++;

  if (test('history benchmark volume stays healthy and repo limitations remain explicit', () => {
    const minimumSelectedCases = repoSelectionMinimum(fixture);

    for (const repo of fixture.repos) {
      assert.ok(repo.selectedCaseCount >= 1, `${repo.repoKey} should contribute at least one case`);
      if (!repo.shallow && repo.visibleCommitCount >= fixture.requestedPerRepo) {
        assert.ok(
          repo.selectedCaseCount >= minimumSelectedCases,
          `${repo.repoKey} should contribute at least ${minimumSelectedCases} cases when history is healthy`
        );
      }
      if (repo.shallow || repo.visibleCommitCount < fixture.requestedPerRepo) {
        assert.ok(
          repo.warnings.some(warning => warning.includes('visible_commit_count_below_target') || warning.includes('shallow_history_visible')),
          `${repo.repoKey} limitations should be explicit in warnings`
        );
      }
    }
  })) passed++; else failed++;

  if (test('every case points to stored baseline artifacts that exist and carries concrete ticket/baseline cards', () => {
    for (const caseRecord of fixture.cases) {
      const problem = snapshot.readFile(caseRecord.storedArtifacts.problem);
      const baselinePr = snapshot.readFile(caseRecord.storedArtifacts.baselinePr);
      const metadata = readJson(caseRecord.storedArtifacts.baselineMetadata);

      assert.ok(problem.includes('# Sparse Ticket Prompt'), `${caseRecord.id} prompt file is missing its heading`);
      assert.ok(problem.includes('## Task'), `${caseRecord.id} prompt file is missing task guidance`);
      assert.ok(problem.includes('## Success Criteria'), `${caseRecord.id} prompt file is missing success criteria`);
      assert.ok(problem.includes('## Verification Expectations'), `${caseRecord.id} prompt file is missing verification expectations`);
      assert.ok(baselinePr.includes('# Baseline PR'), `${caseRecord.id} baseline PR is missing its heading`);
      assert.ok(baselinePr.includes('## Changed Files'), `${caseRecord.id} baseline PR is missing changed file summary`);
      assert.strictEqual(metadata.commit.sha, caseRecord.commitSha, `${caseRecord.id} metadata sha mismatch`);
      assert.strictEqual(metadata.promptLevel, caseRecord.promptLevel, `${caseRecord.id} metadata prompt level mismatch`);
      assert.strictEqual(metadata.userPrompt, caseRecord.userPrompt, `${caseRecord.id} metadata prompt mismatch`);
      assert.deepStrictEqual(metadata.successCriteria, caseRecord.successCriteria, `${caseRecord.id} metadata success criteria mismatch`);
      assert.deepStrictEqual(
        metadata.verificationExpectations,
        caseRecord.verificationExpectations,
        `${caseRecord.id} metadata verification expectations mismatch`
      );
      assert.strictEqual(caseRecord.taskCard.taskType, caseRecord.changeKind, `${caseRecord.id} taskCard taskType mismatch`);
      assert.strictEqual(
        caseRecord.taskCard.expectedSurface,
        caseRecord.affectedSurface,
        `${caseRecord.id} taskCard expectedSurface mismatch`
      );
      assert.strictEqual(
        caseRecord.taskCard.routeExpectation,
        caseRecord.inferredRoute,
        `${caseRecord.id} taskCard route expectation mismatch`
      );
      assert.strictEqual(caseRecord.taskCard.comparisonMode, fixture.comparisonMode, `${caseRecord.id} taskCard comparison mode mismatch`);
      assert.deepStrictEqual(
        caseRecord.taskCard.baselineChangedFiles,
        caseRecord.changedFiles,
        `${caseRecord.id} taskCard baseline changed files mismatch`
      );
      assert.deepStrictEqual(
        caseRecord.taskCard.successSignals,
        caseRecord.successCriteria,
        `${caseRecord.id} taskCard success signals mismatch`
      );
      assert.strictEqual(caseRecord.baselineCard.commitSha, caseRecord.commitSha, `${caseRecord.id} baselineCard commitSha mismatch`);
      assert.strictEqual(caseRecord.baselineCard.parentSha, caseRecord.parentSha, `${caseRecord.id} baselineCard parentSha mismatch`);
      assert.strictEqual(
        caseRecord.baselineCard.changedFileCount,
        caseRecord.changedFileCount,
        `${caseRecord.id} baselineCard changed file count mismatch`
      );
      assert.deepStrictEqual(
        caseRecord.baselineCard.changedFiles,
        caseRecord.changedFiles,
        `${caseRecord.id} baselineCard changed files mismatch`
      );
      assert.ok(!/vague problem statement/i.test(problem), `${caseRecord.id} prompt file should not use the old vague heading`);
      assert.ok(caseRecord.userPrompt.includes('RevEx'), `${caseRecord.id} userPrompt should stay grounded in repo context`);
      assert.ok(caseRecord.userPrompt.includes('Success criteria:'), `${caseRecord.id} userPrompt should inline success criteria`);
      assert.ok(caseRecord.userPrompt.includes('Verification expectations:'), `${caseRecord.id} userPrompt should inline verification expectations`);
    }
  })) passed++; else failed++;

  if (test('judge rubric, pack registry, and benchmark doc stay aligned with the fixture', () => {
    assert.ok(rubric.includes('problem_coverage'));
    assert.ok(rubric.includes('verification_quality'));
    assert.ok(doc.includes('Phase 1'));
    assert.ok(doc.includes('Phase 2'));
    assert.ok(doc.includes('shallow'));
    assert.ok(doc.includes('baseline PR'));
    assert.ok(doc.includes('judge'));
    assert.ok(doc.includes('sparse ticket'));
    assert.ok(doc.includes('benchmark pack'));
    assert.ok(doc.includes('task card'));
    assert.ok(doc.includes('result card'));
    assert.ok(Array.isArray(packs.packs) && packs.packs.length >= 1, 'pack registry should include at least one pack');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
