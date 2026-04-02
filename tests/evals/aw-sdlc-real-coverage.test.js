const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REAL_OUTCOMES = path.join(REPO_ROOT, 'tests/evals/aw-sdlc-real-outcomes.test.js');
const CHECKLIST_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-real-eval-checklist.md');
const CONFIDENCE_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-confidence-plan.md');
const COMMUNITIES_PROMPTS_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-real-prompts-communities.md');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'tests/evals/run-aw-sdlc-evals.sh');

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

function listCases() {
  const result = spawnSync('node', [REAL_OUTCOMES, '--list-cases'], {
    encoding: 'utf8',
    timeout: 15000,
  });

  if (result.status !== 0) {
    throw new Error(`failed to list real cases\n${result.stdout}\n${result.stderr}`);
  }

  return result.stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function run() {
  console.log('\n=== AW SDLC Real Coverage ===\n');

  let passed = 0;
  let failed = 0;

  const cases = listCases();
  const checklist = fs.readFileSync(CHECKLIST_DOC, 'utf8');
  const confidencePlan = fs.readFileSync(CONFIDENCE_DOC, 'utf8');
  const communitiesPrompts = fs.readFileSync(COMMUNITIES_PROMPTS_DOC, 'utf8');
  const runner = fs.readFileSync(RUNNER_SCRIPT, 'utf8');

  if (test('real-outcome suite contains at least 10 examples', () => {
    assert.ok(cases.length >= 10, `expected at least 10 cases, found ${cases.length}`);
  })) passed++; else failed++;

  if (test('real checklist doc exists', () => {
    assert.ok(fs.existsSync(CHECKLIST_DOC), 'real checklist doc is missing');
  })) passed++; else failed++;

  if (test('real checklist doc defines 10 universal checkpoints', () => {
    const checkpoints = checklist.match(/^\d+\.\s/mg) || [];
    assert.ok(checkpoints.length >= 10, `expected at least 10 checklist points, found ${checkpoints.length}`);
  })) passed++; else failed++;

  if (test('real checklist guards artifact quality and PR quality', () => {
    assert.ok(checklist.includes('artifact quality'), 'artifact quality checklist guidance is missing');
    assert.ok(checklist.includes('production-ready'), 'production-ready PR guidance is missing');
  })) passed++; else failed++;

  if (test('real checklist guards testing artifacts and GitHub or CI evidence', () => {
    assert.ok(checklist.includes('Testing artifacts'), 'testing artifacts guidance is missing');
    assert.ok(checklist.includes('GitHub or CI status evidence'), 'GitHub/CI evidence guidance is missing');
  })) passed++; else failed++;

  if (test('real checklist guards versioned staging deployment evidence', () => {
    assert.ok(checklist.includes('versioned deployment path'), 'versioned deployment path guidance is missing');
    assert.ok(checklist.includes('deploy version or version-routing signal'), 'deploy version evidence guidance is missing');
    assert.ok(checklist.includes('versioned links are recorded in `release.md`'), 'versioned links guidance is missing');
    assert.ok(checklist.includes('deployment build links are recorded in `release.md`'), 'deployment build links guidance is missing');
    assert.ok(checklist.includes('testing automation build links are recorded in `release.md`'), 'testing automation links guidance is missing');
    assert.ok(checklist.includes('build status is recorded for each relevant automation entry'), 'build status guidance is missing');
  })) passed++; else failed++;

  if (test('real checklist requires exact live external artifact links', () => {
    assert.ok(checklist.includes('PR URL'), 'PR URL requirement is missing');
    assert.ok(checklist.includes('Jenkins Queue URL'), 'Jenkins queue URL requirement is missing');
    assert.ok(checklist.includes('Jenkins Build URL'), 'Jenkins build URL requirement is missing');
    assert.ok(checklist.includes('Testing Automation URL'), 'testing automation URL requirement is missing');
    assert.ok(checklist.includes('Versioned Staging Link'), 'versioned staging link requirement is missing');
    assert.ok(checklist.includes('These fields should not be represented as only `NOT_AVAILABLE`'), 'live non-placeholder guidance is missing');
  })) passed++; else failed++;

  if (test('real checklist doc names every real example case', () => {
    for (const caseId of cases) {
      assert.ok(checklist.includes(`\`${caseId}\``), `missing case in checklist doc: ${caseId}`);
    }
  })) passed++; else failed++;

  if (test('Communities prompt pack exists and stays intent-first', () => {
    assert.ok(fs.existsSync(COMMUNITIES_PROMPTS_DOC), 'Communities prompt doc is missing');
    assert.ok(communitiesPrompts.includes('Communities Moderation API'), 'backend Communities app is missing');
    assert.ok(communitiesPrompts.includes('Communities Feed MFA'), 'frontend Communities app is missing');
    assert.ok(!/\/aw:/.test(communitiesPrompts), 'Communities prompt doc should not use slash commands');
  })) passed++; else failed++;

  if (test('confidence plan includes live PR quality and versioned staging gates', () => {
    assert.ok(confidencePlan.includes('PR-quality / production-readiness'), 'confidence plan is missing PR-quality gate');
    assert.ok(confidencePlan.includes('versioned staging deployment evidence'), 'confidence plan is missing versioned staging gate');
    assert.ok(confidencePlan.includes('GitHub or CI status evidence'), 'confidence plan is missing GitHub/CI evidence gate');
    assert.ok(confidencePlan.includes('testing automation links'), 'confidence plan is missing testing automation link gate');
    assert.ok(confidencePlan.includes('build status'), 'confidence plan is missing build status gate');
    assert.ok(confidencePlan.includes('Jenkins queue URL'), 'confidence plan is missing Jenkins queue URL gate');
    assert.ok(confidencePlan.includes('Jenkins build URL'), 'confidence plan is missing Jenkins build URL gate');
    assert.ok(confidencePlan.includes('AW_SDLC_LIVE_RELEASE_FILE'), 'confidence plan is missing live artifact gate command');
  })) passed++; else failed++;

  if (test('runner exposes a live-artifacts mode', () => {
    assert.ok(runner.includes('run_live_artifacts'), 'runner is missing live-artifacts function');
    assert.ok(runner.includes('live-artifacts'), 'runner is missing live-artifacts mode');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
