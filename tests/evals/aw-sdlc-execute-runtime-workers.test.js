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
  console.log(`\n=== AW SDLC Execute Runtime Workers (${REF}) ===\n`);

  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const executeCommand = snapshot.readFile('commands/execute.md');
  let passed = 0;
  let failed = 0;

  if (test('execute defines bounded internal worker roles', () => {
    for (const phrase of [
      '## Internal Worker Roles',
      '`implementer`',
      '`spec_reviewer`',
      '`quality_reviewer`',
      '`parallel_worker`',
      'They must not become new public commands',
    ]) {
      assert.ok(executeSkill.includes(phrase), `aw-execute is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('execute runtime discipline protects disjoint ownership and failure-first behavior', () => {
    for (const phrase of [
      '## Runtime Discipline',
      'disjoint file ownership',
      'do not run overlapping parallel workers on the same write scope',
      'record a concrete failing signal',
      '`Worker Roles`',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `missing execute runtime guidance for ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
