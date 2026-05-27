const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function sanitizeId(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function withoutInheritedGitEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) {
      delete env[key];
    }
  }
  return env;
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
  const gitEnv = withoutInheritedGitEnv();
  execFileSync('git', ['clone', '--local', '--quiet', '--no-checkout', repoRoot, workspaceDir], {
    env: gitEnv,
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'sparse-checkout', 'init', '--no-cone'], {
    env: gitEnv,
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'sparse-checkout', 'set', '--no-cone', ...overlayPaths], {
    env: gitEnv,
    stdio: 'ignore',
  });

  execFileSync('git', ['-C', workspaceDir, 'checkout', '--quiet', 'HEAD'], {
    env: gitEnv,
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
    const gitEnv = withoutInheritedGitEnv();
    const worktreeRef = snapshot.isWorktree() ? 'HEAD' : snapshot.ref;
    execFileSync('git', ['-C', repoRoot, 'worktree', 'add', '--detach', workspaceDir, worktreeRef], {
      env: gitEnv,
      stdio: 'ignore',
    });

    // Keep real git metadata, but remove the full repo checkout so the eval
    // behaves like a minimal isolated workspace instead of a noisy full tree.
    pruneWorkspaceToGitRoot(workspaceDir);

    cleanup = () => {
      try {
        execFileSync('git', ['-C', repoRoot, 'worktree', 'remove', '--force', workspaceDir], {
          env: gitEnv,
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
      env: withoutInheritedGitEnv(),
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
