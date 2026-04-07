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
  console.log(`\n=== AW SDLC Finish Compatibility (${REF}) ===\n`);

  const finishCommand = snapshot.readFile('commands/finish.md');
  const finishSkill = snapshot.readFile('skills/aw-finish/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('finish stays deprecated publicly while remaining a branch-completion helper internally', () => {
    assert.ok(finishCommand.includes('status: deprecated'));
    assert.ok(finishSkill.includes('legacy compatibility skill'));
    assert.ok(finishSkill.includes('canonical public release stage remains `/aw:deploy`'));
  })) passed++; else failed++;

  if (test('finish verifies tests first and offers explicit completion choices', () => {
    for (const phrase of [
      'verify tests and validation signals still pass',
      'merge locally',
      'push and create PR',
      'keep as branch',
      'discard',
      'require explicit confirmation',
      'Only clean up the worktree automatically',
    ]) {
      assert.ok(finishSkill.includes(phrase), `finish skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
