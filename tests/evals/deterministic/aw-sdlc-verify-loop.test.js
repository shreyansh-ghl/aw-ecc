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
  console.log(`\n=== AW SDLC Verify Loop (${REF}) ===\n`);

  const verifySkill = snapshot.readFile('skills/aw-verify/SKILL.md');
  const verifyCommand = snapshot.readFile('commands/verify.md');
  let passed = 0;
  let failed = 0;

  if (test('verify defines an explicit findings and re-review loop', () => {
    assert.ok(verifySkill.includes('Findings and Re-Review Loop'));
    assert.ok(verifyCommand.includes('## Repair Loop'));
    assert.ok(verifySkill.includes('repair-focused handoff back to `aw-execute`'));
    assert.ok(verifyCommand.includes('recommend `/aw:execute` as the next stage'));
    assert.ok(verifySkill.includes('verification is not complete until that failure is captured'));
    assert.ok(verifyCommand.includes('failed verify artifact is the evidence'));
    assert.ok(verifySkill.includes('Fresh Evidence Rule'));
    assert.ok(verifyCommand.includes('stale evidence'));
  })) passed++; else failed++;

  if (test('verify strengthens debugging and TDD-as-policy expectations', () => {
    for (const phrase of [
      'TDD and Debugging Expectations',
      'test-first or failure-first discipline',
      'root-cause hypothesis',
      'confirming evidence',
    ]) {
      assert.ok(verifySkill.includes(phrase) || verifyCommand.includes(phrase), `Missing verify guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('verify stays inside the existing public stage surface', () => {
    assert.ok(verifyCommand.includes('/aw:deploy'));
    assert.ok(verifyCommand.includes('/aw:execute'));
    assert.ok(!snapshot.fileExists('commands/re-review.md'), 're-review should stay inside verify, not become a public command');
    assert.ok(!snapshot.fileExists('commands/debug.md'), 'debug should stay internal, not become a public command');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
