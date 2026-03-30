const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function createRepoSnapshot(repoRoot, ref) {
  function isWorktree() {
    return ref === 'WORKTREE';
  }

  function gitFileExists(filePath) {
    try {
      execFileSync('git', ['-C', repoRoot, 'cat-file', '-e', `${ref}:${filePath}`], {
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  function readGitFile(filePath) {
    return execFileSync('git', ['-C', repoRoot, 'show', `${ref}:${filePath}`], {
      encoding: 'utf8',
    });
  }

  function fileExists(filePath) {
    if (isWorktree()) {
      return fs.existsSync(path.join(repoRoot, filePath));
    }
    return gitFileExists(filePath);
  }

  function readFile(filePath) {
    if (isWorktree()) {
      return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
    }
    return readGitFile(filePath);
  }

  function materializePaths(destinationRoot, relativePaths) {
    for (const relativePath of relativePaths) {
      if (!fileExists(relativePath)) continue;
      const destinationPath = path.join(destinationRoot, relativePath);
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.writeFileSync(destinationPath, readFile(relativePath), 'utf8');
    }
  }

  return {
    repoRoot,
    ref,
    isWorktree,
    fileExists,
    readFile,
    materializePaths,
  };
}

module.exports = {
  createRepoSnapshot,
};
