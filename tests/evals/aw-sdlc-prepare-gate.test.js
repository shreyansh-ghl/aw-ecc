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
  console.log(`\n=== AW SDLC Prepare Gate (${REF}) ===\n`);

  const prepareSkill = snapshot.readFile('skills/aw-prepare/SKILL.md');
  const shipSkill = snapshot.readFile('skills/aw-ship/SKILL.md');
  const shipCommand = snapshot.readFile('commands/ship.md');
  let passed = 0;
  let failed = 0;

  if (test('hidden preparation skill exists without adding a public prepare command', () => {
    assert.ok(prepareSkill.includes('name: aw-prepare'));
    assert.ok(!snapshot.fileExists('commands/prepare.md'), 'prepare should stay internal');
  })) passed++; else failed++;

  if (test('ship uses aw-prepare as an internal gate before risky work', () => {
    assert.ok(shipSkill.includes('Preparation Gate'), 'ship skill should define a preparation gate');
    assert.ok(shipSkill.includes('aw-prepare'), 'ship skill should call aw-prepare internally');
    assert.ok(shipCommand.includes('aw-prepare'), 'ship command should document aw-prepare as internal routing');
    assert.ok(shipCommand.includes('| `prepare` |'), 'ship command should include a prepare phase');
  })) passed++; else failed++;

  if (test('prepare guidance checks isolation, repo state, and artifact readiness', () => {
    for (const phrase of [
      'branch or worktree isolation',
      'dirty tracked or untracked state',
      'feature slug',
      'source snapshot or eval workspace',
      'degraded snapshot mode',
      'Recommended Next',
    ]) {
      assert.ok(prepareSkill.includes(phrase), `prepare skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
