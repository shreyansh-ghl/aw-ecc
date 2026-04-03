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
  console.log(`\n=== AW SDLC Verify Review Loop (${REF}) ===\n`);

  const verifySkill = snapshot.readFile('skills/aw-verify/SKILL.md');
  const reviewLoopSkill = snapshot.readFile('skills/aw-review/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('verify uses an explicit review-loop helper and tracks re-review resolution state', () => {
    assert.ok(verifySkill.includes('aw-review'));
    for (const phrase of [
      'review scope requested',
      'mark prior findings as resolved, partially resolved, or unresolved',
      'finding resolution state during re-review',
      'fresh evidence after repair',
    ]) {
      assert.ok(verifySkill.includes(phrase), `verify skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('review-loop helper defines targeted review request and resolution rules', () => {
    for (const phrase of [
      'spec compliance',
      'code quality',
      'translate blocking findings into a repair scope',
      'resolved, partially resolved, or unresolved',
      'Requested Review Pattern',
      'Receiving Findings',
      'Re-review Discipline',
    ]) {
      assert.ok(reviewLoopSkill.includes(phrase), `review-loop skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
