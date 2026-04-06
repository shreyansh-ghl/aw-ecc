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
  console.log(`\n=== AW SDLC Verify Review Loop (${REF}) ===\n`);

  const verifySkill = snapshot.readFile('skills/aw-verify/SKILL.md');
  const reviewLoopSkill = snapshot.readFile('skills/aw-review/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('verify delegates findings-oriented work to review', () => {
    assert.ok(verifySkill.includes('aw-review'));
    for (const phrase of [
      'aw-test',
      'aw-review',
      'If it is mostly findings, governance, or readiness, route to `aw-review`',
      'If both are clearly needed, use `aw-test -> aw-review`',
    ]) {
      assert.ok(verifySkill.includes(phrase), `verify skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('review stage defines targeted findings and fresh-evidence behavior', () => {
    for (const phrase of [
      'Review the evidence first.',
      'Classify findings explicitly.',
      'Request fresh testing when needed.',
      'severity',
    ]) {
      assert.ok(reviewLoopSkill.includes(phrase), `review-loop skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
