const assert = require('assert');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

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
  console.log(`\n=== AW SDLC Plan Richness (${REF}) ===\n`);

  const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
  const planCommand = snapshot.readFile('commands/plan.md');
  let passed = 0;
  let failed = 0;

  if (test('plan requires execution-ready technical and task artifacts', () => {
    for (const phrase of [
      'execution-ready',
      'Plan Richness',
      'Execution-Ready Tasks',
      'validation command or evidence target',
      'parallel_candidate',
      'Internal Skill Graph',
      'aw-spec-author',
      'aw-task-planner',
    ]) {
      assert.ok(planSkill.includes(phrase), `aw-plan is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('plan requires recipe-level task depth instead of vague implementation bullets', () => {
    for (const phrase of [
      '2-5 minutes',
      'exact file paths',
      'exact commands and expected outcomes',
      'commit boundaries',
      'No Placeholders',
      'Plan Self-Review',
      'Execution Handoff',
    ]) {
      assert.ok(planSkill.includes(phrase), `aw-plan is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('public plan command stays thin while requiring concrete planning depth', () => {
    assert.ok(planCommand.includes('## Planning Depth'));
    assert.ok(planCommand.includes('exact file paths'));
    assert.ok(planCommand.includes('2-5 minute checkbox steps'));
    assert.ok(planCommand.includes('exact commands with expected failure or pass signals'));
    assert.ok(planCommand.includes('validation commands or evidence targets'));
    assert.ok(planCommand.includes('Execution Readiness'));
    assert.ok(planCommand.includes('aw-brainstorm'));
    assert.ok(planCommand.includes('aw-spec-author'));
    assert.ok(planCommand.includes('aw-task-planner'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
