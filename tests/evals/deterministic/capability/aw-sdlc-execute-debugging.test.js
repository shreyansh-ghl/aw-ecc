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
  console.log(`\n=== AW SDLC Execute Debugging (${REF}) ===\n`);

  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const buildSkill = snapshot.readFile('skills/aw-build/SKILL.md');
  const debugSkill = snapshot.readFile('skills/aw-debug/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('build keeps failure-first evidence expectations while execute routes to it', () => {
    assert.ok(executeSkill.includes('Route to `aw-build`.'));
    for (const phrase of [
      'failing signal',
      'RED-GREEN',
      '../../references/testing-patterns.md',
    ]) {
      assert.ok(buildSkill.includes(phrase) || debugSkill.includes(phrase), `build/debug skill is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('debugging is now shared across investigate, build, test, and review', () => {
    assert.ok(debugSkill.includes('Invoked by aw-investigate, aw-build, aw-test, or aw-review'));
    for (const phrase of [
      'Capture a reproduction or equivalent failure signal.',
      'Define expected vs actual behavior.',
      'Run the next confirming probe.',
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
