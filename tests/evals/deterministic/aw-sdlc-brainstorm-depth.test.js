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
  console.log(`\n=== AW SDLC Brainstorm Depth (${REF}) ===\n`);

  const brainstormSkill = snapshot.readFile('skills/aw-brainstorm/SKILL.md');
  const brainstormCommand = snapshot.readFile('commands/brainstorm.md');
  let passed = 0;
  let failed = 0;

  if (test('brainstorm stays internal and hands approved direction to aw-plan', () => {
    assert.ok(brainstormCommand.includes('status: internal'));
    assert.ok(brainstormSkill.includes('canonical public route for planning remains `/aw:plan`'));
    assert.ok(brainstormSkill.includes('invoke `aw-plan`'));
  })) passed++; else failed++;

  if (test('brainstorm uses a deeper discovery loop without creating duplicate planning artifacts', () => {
    for (const phrase of [
      'ask at most one clarifying question at a time',
      'propose 2-3 distinct approaches',
      'assumptions and open questions',
      'should not create a second planning file system',
      '.aw_docs/features/<feature_slug>/state.json',
    ]) {
      assert.ok(brainstormSkill.includes(phrase), `brainstorm skill is missing ${phrase}`);
    }

    assert.ok(!brainstormSkill.includes('docs/specs/'), 'brainstorm should not write legacy docs/specs artifacts');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
