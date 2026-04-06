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
  console.log(`\n=== AW SDLC Prepare Isolation Depth (${REF}) ===\n`);

  const prepareSkill = snapshot.readFile('skills/aw-prepare/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('prepare classifies isolation levels and recommends corrective actions', () => {
    for (const phrase of [
      '## Isolation Levels',
      'isolated-worktree',
      'shared-branch-dirty',
      'snapshot-degraded',
      '## Recommended Isolation Action',
      'create a feature branch',
      'switch to a dedicated worktree',
    ]) {
      assert.ok(prepareSkill.includes(phrase), `aw-prepare is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('prepare summary includes the isolation decision explicitly', () => {
    for (const phrase of [
      '`Isolation Level`',
      '`Recommended Isolation Action`',
      'do not treat a dirty shared branch as equivalent to an isolated worktree',
    ]) {
      assert.ok(prepareSkill.includes(phrase), `aw-prepare is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
