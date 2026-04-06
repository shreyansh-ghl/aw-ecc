const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { createEvalWorkspace } = require('../../lib/eval-workspace');

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function git(repoRoot, args) {
  return execFileSync('git', ['-C', repoRoot, ...args], { encoding: 'utf8' }).trim();
}

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
  console.log('\n=== AW SDLC Eval Workspace Isolation ===\n');

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-eval-repo-'));
  let passed = 0;
  let failed = 0;
  const previousMode = process.env.AW_SDLC_EVAL_WORKSPACE_MODE;

  try {
    git(repoRoot, ['init']);
    git(repoRoot, ['config', 'user.name', 'Codex']);
    git(repoRoot, ['config', 'user.email', 'codex@example.com']);

    writeFile(repoRoot, 'tracked.txt', 'old snapshot\n');
    git(repoRoot, ['add', 'tracked.txt']);
    git(repoRoot, ['commit', '-m', 'initial snapshot']);
    const snapshotRef = git(repoRoot, ['rev-parse', 'HEAD']);

    writeFile(repoRoot, 'tracked.txt', 'head content\n');
    writeFile(repoRoot, 'head-only.txt', 'should not leak\n');
    git(repoRoot, ['add', 'tracked.txt', 'head-only.txt']);
    git(repoRoot, ['commit', '-m', 'head changes']);

    process.env.AW_SDLC_EVAL_WORKSPACE_MODE = 'git-worktree';
    const snapshot = createRepoSnapshot(repoRoot, snapshotRef);
    const workspace = createEvalWorkspace({
      repoRoot,
      snapshot,
      caseId: 'ref-isolation',
      overlayPaths: ['tracked.txt'],
    });

    try {
      if (test('git-worktree mode materializes the requested ref instead of HEAD', () => {
        assert.strictEqual(
          fs.readFileSync(path.join(workspace.workspaceDir, 'tracked.txt'), 'utf8'),
          'old snapshot\n'
        );
        assert.ok(
          !fs.existsSync(path.join(workspace.workspaceDir, 'head-only.txt')),
          'head-only files should not leak into a historical snapshot workspace'
        );
      })) passed++; else failed++;
    } finally {
      workspace.cleanup();
    }
  } finally {
    if (previousMode === undefined) {
      delete process.env.AW_SDLC_EVAL_WORKSPACE_MODE;
    } else {
      process.env.AW_SDLC_EVAL_WORKSPACE_MODE = previousMode;
    }
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
