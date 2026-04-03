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
  console.log(`\n=== AW SDLC Superpowers Audit (${REF}) ===\n`);

  const audit = snapshot.readFile('docs/aw-sdlc-superpowers-file-parity-audit.md');
  let passed = 0;
  let failed = 0;

  if (test('audit maps every compared Superpowers workflow file', () => {
    for (const phrase of [
      'skills/using-superpowers/SKILL.md',
      'skills/brainstorming/SKILL.md',
      'skills/writing-plans/SKILL.md',
      'skills/executing-plans/SKILL.md',
      'skills/subagent-driven-development/SKILL.md',
      'skills/test-driven-development/SKILL.md',
      'skills/systematic-debugging/SKILL.md',
      'skills/requesting-code-review/SKILL.md',
      'skills/receiving-code-review/SKILL.md',
      'skills/verification-before-completion/SKILL.md',
      'skills/using-git-worktrees/SKILL.md',
      'skills/finishing-a-development-branch/SKILL.md',
    ]) {
      assert.ok(audit.includes(phrase), `audit is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('audit preserves AW-specific adaptation and harness-native delta notes', () => {
    assert.ok(audit.includes('AW-Specific Adaptations'));
    assert.ok(audit.includes('Remaining Harness-Native Deltas'));
    assert.ok(audit.includes('closed (repo-side)'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
