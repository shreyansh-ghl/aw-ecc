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

  if (test('verify is now a compatibility router to test and review', () => {
    assert.ok(verifySkill.includes('compatibility layer'));
    assert.ok(verifySkill.includes('aw-test'));
    assert.ok(verifySkill.includes('aw-review'));
    assert.ok(verifyCommand.includes('/aw:test'));
    assert.ok(verifyCommand.includes('/aw:review'));
    assert.ok(verifyCommand.includes('Compatibility Mapping'));
  })) passed++; else failed++;

  if (test('verify preserves the verification artifact contract while narrowing intent', () => {
    for (const phrase of [
      'verification.md',
      'state.json',
      'smallest correct modern verification flow',
      'must not preserve the old overloaded verify semantics',
    ]) {
      assert.ok(verifySkill.includes(phrase) || verifyCommand.includes(phrase), `Missing verify guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('verify stays a compatibility entrypoint instead of reclaiming the public stage surface', () => {
    assert.ok(verifyCommand.includes('/aw:deploy'));
    assert.ok(!verifyCommand.includes('recommend `/aw:execute` as the next stage'));
    assert.ok(!snapshot.fileExists('commands/re-review.md'), 're-review should stay inside verify, not become a public command');
    assert.ok(!snapshot.fileExists('commands/debug.md'), 'debug should stay internal, not become a public command');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
