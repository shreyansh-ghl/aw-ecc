const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const JSON_ASSETS = [
  'skills/using-platform-skills/evals/platform-selection-cases.json',
  'skills/aw-build/evals/build-stage-cases.json',
  'skills/aw-deploy/evals/deploy-stage-cases.json',
  'agents/evals/code-reviewer-scenarios.json',
];

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
  console.log(`\n=== AW Owner-Local Eval Assets (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('owner-local eval assets exist for key skills and agents', () => {
    assert.ok(snapshot.fileExists('skills/using-aw-skills/evals/skill-trigger-cases.tsv'));
    assert.ok(snapshot.fileExists('skills/using-aw-skills/evals/test-skill-triggers.sh'));
    for (const asset of JSON_ASSETS) {
      assert.ok(snapshot.fileExists(asset), `missing ${asset}`);
    }
  })) passed++; else failed++;

  if (test('owner-local JSON assets contain non-trivial scenario data', () => {
    const platformCases = readJson('skills/using-platform-skills/evals/platform-selection-cases.json');
    const buildCases = readJson('skills/aw-build/evals/build-stage-cases.json');
    const deployCases = readJson('skills/aw-deploy/evals/deploy-stage-cases.json');
    const agentCases = readJson('agents/evals/code-reviewer-scenarios.json');

    assert.ok(platformCases.cases.length >= 5, 'platform router should have multiple cases');
    assert.ok(buildCases.cases.length >= 3, 'build should have local stage cases');
    assert.ok(deployCases.cases.length >= 3, 'deploy should have local stage cases');
    assert.ok(agentCases.scenarios.length >= 3, 'agent-local scenarios should be populated');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
