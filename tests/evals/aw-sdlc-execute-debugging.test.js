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
  console.log(`\n=== AW SDLC Execute Debugging (${REF}) ===\n`);

  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const debugSkill = snapshot.readFile('skills/aw-systematic-debugging/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('execute strengthens red-green-refactor and failure-first evidence', () => {
    for (const phrase of [
      'RED-GREEN-REFACTOR',
      'record the `RED` signal',
      'failing-test signal',
      'debugging trace',
    ]) {
      assert.ok(executeSkill.includes(phrase), `execute skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute can invoke systematic debugging for bug-oriented work', () => {
    assert.ok(executeSkill.includes('aw-systematic-debugging'));
    for (const phrase of [
      'capture a reproduction signal',
      'current hypothesis',
      'confirming probe',
    ]) {
      assert.ok(debugSkill.includes(phrase), `debug skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
