const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function createEvalWorkspace({ repoRoot, snapshot, caseId, overlayPaths, workspaceMode }) {
  const mode = workspaceMode || process.env.AW_SDLC_EVAL_WORKSPACE_MODE || 'tempdir';
  const keepWorkspace = process.env.AW_SDLC_EVAL_KEEP_WORKSPACE === '1';
  const safeId = sanitizeId(caseId);
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `aw-sdlc-${safeId}-`));

  let cleanup = () => fs.rmSync(workspaceDir, { recursive: true, force: true });

  if (mode === 'git-worktree') {
    const worktreeRef = snapshot.isWorktree() ? 'HEAD' : snapshot.ref;
    execFileSync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspaceDir, worktreeRef], {
      stdio: 'ignore',
    });

    cleanup = () => {
      try {
        execFileSync('git', ['-C', repoRoot, 'worktree', 'remove', '--force', workspaceDir], {
          stdio: 'ignore',
        });
      } catch {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    };
  }

  snapshot.materializePaths(workspaceDir, overlayPaths);

  if (keepWorkspace) {
    cleanup = () => {};
  }

  return {
    mode,
    workspaceDir,
    cleanup,
  };
}

module.exports = {
  createEvalWorkspace,
};
