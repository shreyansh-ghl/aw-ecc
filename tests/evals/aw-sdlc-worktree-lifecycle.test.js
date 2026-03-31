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
  console.log(`\n=== AW SDLC Worktree Lifecycle (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('repo ships real orchestration helpers for branch-backed worktrees', () => {
    for (const filePath of [
      'scripts/lib/tmux-worktree-orchestrator.js',
      'scripts/orchestrate-worktrees.js',
      'scripts/orchestration-status.js',
    ]) {
      assert.ok(snapshot.fileExists(filePath), `Missing ${filePath}`);
    }
  })) passed++; else failed++;

  if (test('aw-prepare points to concrete worktree lifecycle commands and workspace metadata', () => {
    const prepareSkill = snapshot.readFile('skills/aw-prepare/SKILL.md');
    for (const phrase of [
      'node scripts/orchestrate-worktrees.js <plan.json>',
      'node scripts/orchestrate-worktrees.js <plan.json> --execute',
      'node scripts/orchestration-status.js <plan.json|session-name>',
      '.aw_docs/features/<feature_slug>/workspace.json',
      '`Workspace Metadata`',
    ]) {
      assert.ok(prepareSkill.includes(phrase), `aw-prepare is missing "${phrase}"`);
    }
  })) passed++; else failed++;

  if (test('ship and finish reuse workspace lifecycle metadata instead of ad hoc cleanup', () => {
    const finishSkill = snapshot.readFile('skills/aw-finish/SKILL.md');
    const shipSkill = snapshot.readFile('skills/aw-ship/SKILL.md');
    const shipCommand = snapshot.readFile('commands/ship.md');

    for (const phrase of [
      '.aw_docs/features/<feature_slug>/workspace.json',
      'node scripts/orchestration-status.js',
    ]) {
      assert.ok(
        finishSkill.includes(phrase) || shipSkill.includes(phrase) || shipCommand.includes(phrase),
        `Expected lifecycle reuse guidance for "${phrase}"`
      );
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
