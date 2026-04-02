const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

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
  console.log(`\n=== AW SDLC Execute Orchestration (${REF}) ===\n`);

  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const executeCommand = snapshot.readFile('commands/execute.md');
  let passed = 0;
  let failed = 0;

  if (test('execute uses task-unit orchestration rather than one-shot implementation wording', () => {
    assert.ok(executeSkill.includes('Task-Unit Orchestration'));
    assert.ok(executeCommand.includes('## Internal Task Loop'));
    assert.ok(executeSkill.includes('task units completed'));
    assert.ok(executeCommand.includes('task_unit'));
    assert.ok(executeSkill.includes('mark it as `in_progress`'));
    assert.ok(executeCommand.includes('Mark the active task unit in progress'));
  })) passed++; else failed++;

  if (test('execute requires spec and quality review before handoff', () => {
    for (const phrase of [
      'spec_review',
      'quality_review',
      'spec-compliance review',
      'code-quality review',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `Missing execute guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute reviews plans critically before coding and routes back on critical gaps', () => {
    for (const phrase of [
      'Plan Intake Review',
      'route back to `aw-plan`',
      'missing file scope for a non-trivial task',
      'undefined helper, interface, type, or command',
      'do not guess through a broken plan',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `Missing execute intake guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute keeps TDD policy inside the existing /aw:execute stage', () => {
    assert.ok(executeSkill.includes('TDD Policy'));
    assert.ok(executeCommand.includes('Test Discipline'));
    assert.ok(!snapshot.fileExists('commands/task-unit.md'), 'task units should stay internal to execute');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
