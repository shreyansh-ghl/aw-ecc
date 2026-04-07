const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

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

  if (test('execute is now a compatibility shim to build', () => {
    assert.ok(executeSkill.includes('compatibility layer'));
    assert.ok(executeSkill.includes('aw-build'));
    assert.ok(executeCommand.includes('canonical implementation stage is `/aw:build`'));
    assert.ok(executeCommand.includes('Compatibility Route'));
  })) passed++; else failed++;

  if (test('execute preserves the canonical artifact and handoff contract', () => {
    for (const phrase of [
      'execution.md',
      'state.json',
      'aw-test',
      'aw-review',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `Missing execute guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute no longer owns a separate implementation workflow', () => {
    for (const phrase of [
      'Preserve legacy muscle memory',
      'Do not introduce a second implementation workflow.',
      'must not drift into a separate execute-only workflow',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `Missing execute intake guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute points legacy TDD expectations into build instead of staying special', () => {
    assert.ok(executeCommand.includes('old `/aw:tdd` expectations -> stay inside `/aw:build`'));
    assert.ok(!snapshot.fileExists('commands/task-unit.md'), 'task units should stay internal to execute');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
