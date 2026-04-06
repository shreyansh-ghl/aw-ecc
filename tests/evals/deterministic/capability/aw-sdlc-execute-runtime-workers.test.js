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
  console.log(`\n=== AW SDLC Execute Runtime Workers (${REF}) ===\n`);

  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const executeCommand = snapshot.readFile('commands/execute.md');
  let passed = 0;
  let failed = 0;

  if (test('legacy execute remains a thin wrapper rather than a second worker runtime', () => {
    for (const phrase of [
      'compatibility layer',
      'aw-build',
      'Do not introduce a second implementation workflow.',
    ]) {
      assert.ok(executeSkill.includes(phrase) || executeCommand.includes(phrase), `aw-execute is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('legacy worker assets still exist for compatibility tooling', () => {
    for (const phrase of [
      'skills/aw-execute/references/worker-implementer.md',
      'skills/aw-execute/references/worker-spec-reviewer.md',
      'skills/aw-execute/references/worker-quality-reviewer.md',
      'skills/aw-execute/references/worker-parallel-worker.md',
    ]) {
      assert.ok(snapshot.fileExists(phrase), `missing execute compatibility asset ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
