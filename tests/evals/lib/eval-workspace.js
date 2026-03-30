const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function createEvalWorkspace({ repoRoot, snapshot, caseId, overlayPaths }) {
  const mode = process.env.AW_SDLC_EVAL_WORKSPACE_MODE || 'tempdir';
  const safeId = sanitizeId(caseId);
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `aw-sdlc-${safeId}-`));

  let cleanup = () => fs.rmSync(workspaceDir, { recursive: true, force: true });

  if (mode === 'git-worktree') {
    execFileSync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspaceDir, 'HEAD'], {
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

  return {
    mode,
    workspaceDir,
    cleanup,
  };
}

module.exports = {
  createEvalWorkspace,
};
