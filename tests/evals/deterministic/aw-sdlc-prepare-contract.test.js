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
  console.log(`\n=== AW SDLC Prepare Contract (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  const prepareSkill = snapshot.readFile('skills/aw-prepare/SKILL.md');
  const shipCommand = snapshot.readFile('commands/ship.md');
  const shipSkill = snapshot.readFile('skills/aw-ship/SKILL.md');

  if (test('aw-prepare exists as an internal skill only', () => {
    assert.ok(prepareSkill.includes('name: aw-prepare'));
    assert.ok(
      prepareSkill.includes('internal setup gate') ||
        prepareSkill.includes('do not create a new public command'),
      'aw-prepare should explicitly remain internal'
    );
    assert.ok(!snapshot.fileExists('commands/prepare.md'), 'aw-prepare must not create a new public command');
  })) passed++; else failed++;

  if (test('aw-prepare validates isolation and setup prerequisites', () => {
    for (const phrase of [
      'branch or worktree isolation',
      'dirty',
      'prerequisites',
      'Recommended Next',
    ]) {
      assert.ok(prepareSkill.includes(phrase), `aw-prepare is missing "${phrase}"`);
    }
  })) passed++; else failed++;

  if (test('ship command and skill route through aw-prepare without expanding the public surface', () => {
    assert.ok(shipCommand.includes('`aw-prepare`'));
    assert.ok(shipSkill.includes('`aw-prepare`'));
    assert.ok(!shipCommand.includes('/aw:prepare'));
    assert.ok(!shipSkill.includes('/aw:prepare'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
