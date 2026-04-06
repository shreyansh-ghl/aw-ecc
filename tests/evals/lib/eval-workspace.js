const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function pruneWorkspaceToGitRoot(workspaceDir) {
  for (const entry of fs.readdirSync(workspaceDir)) {
    if (entry === '.git') {
      continue;
    }

    fs.rmSync(path.join(workspaceDir, entry), { recursive: true, force: true });
  }
}

function checkoutSparseClone({ repoRoot, workspaceDir, overlayPaths }) {
  execFileSync('git', ['clone', '--local', '--quiet', '--no-checkout', repoRoot, workspaceDir], {
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'sparse-checkout', 'init', '--no-cone'], {
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'sparse-checkout', 'set', '--no-cone', ...overlayPaths], {
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'checkout', '--quiet', 'HEAD'], {
    stdio: 'ignore',
  });
}

function createEvalWorkspace({ repoRoot, snapshot, caseId, overlayPaths, workspaceMode }) {
  const mode = process.env.AW_SDLC_EVAL_WORKSPACE_MODE || 'tempdir';
  const keepWorkspace = process.env.AW_SDLC_EVAL_KEEP_WORKSPACE === '1';
  const effectiveMode = workspaceMode || mode;
  const safeId = sanitizeId(caseId);
  const workspaceBaseDir = process.env.AW_SDLC_EVAL_WORKSPACE_BASE_DIR || os.tmpdir();
  fs.mkdirSync(workspaceBaseDir, { recursive: true });
  const workspaceDir = fs.mkdtempSync(path.join(workspaceBaseDir, `aw-sdlc-${safeId}-`));

  let cleanup = () => fs.rmSync(workspaceDir, { recursive: true, force: true });

  if (effectiveMode === 'git-worktree') {
    const worktreeRef = snapshot.isWorktree() ? 'HEAD' : snapshot.ref;
    execFileSync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspaceDir, worktreeRef], {
      stdio: 'ignore',
    });

    // Keep real git metadata, but remove the full repo checkout so the eval
    // behaves like a minimal isolated workspace instead of a noisy full tree.
    pruneWorkspaceToGitRoot(workspaceDir);

    cleanup = () => {
      try {
        execFileSync('git', ['-C', repoRoot, 'worktree', 'remove', '--force', workspaceDir], {
          stdio: 'ignore',
        });
      } catch {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    };
  } else if (effectiveMode === 'git-clone') {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
    checkoutSparseClone({ repoRoot, workspaceDir, overlayPaths });

    cleanup = () => fs.rmSync(workspaceDir, { recursive: true, force: true });
  } else if (effectiveMode === 'git-init') {
    execFileSync('git', ['-c', 'init.defaultBranch=main', 'init', '--quiet', workspaceDir], {
      stdio: 'ignore',
    });

    cleanup = () => fs.rmSync(workspaceDir, { recursive: true, force: true });
  }

  snapshot.materializePaths(workspaceDir, overlayPaths);

  if (keepWorkspace) {
    cleanup = () => {};
  }

  return {
    mode: effectiveMode,
    workspaceDir,
    cleanup,
  };
}

module.exports = {
  createEvalWorkspace,
};
