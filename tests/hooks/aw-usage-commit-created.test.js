const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'hooks', 'aw-usage-commit-created.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function runTests() {
  console.log('\n=== Testing aw-usage commit_created hook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('exports commit_created event builder with full SHA, project_hash, and git harness', () => {
    const home = makeTempDir('aw-ecc-commit-home-');
    const repo = makeTempDir('aw-ecc-commit-repo-');
    try {
      spawnSync('git', ['init', '-q'], { cwd: repo, stdio: 'ignore' });
      spawnSync('git', ['config', 'user.name', 'aw-test-user'], { cwd: repo, stdio: 'ignore' });
      spawnSync('git', ['config', 'user.email', 'aw-test@example.com'], { cwd: repo, stdio: 'ignore' });

      const commitSha = '0123456789abcdef0123456789abcdef01234567';
      const script = `
        const { buildCommitCreatedEvent } = require(${JSON.stringify(SCRIPT_PATH)});
        const event = buildCommitCreatedEvent({ commitHash: ${JSON.stringify(commitSha)}, branch: 'main', cwd: process.cwd() });
        process.stdout.write(JSON.stringify(event));
      `;
      const child = spawnSync(process.execPath, ['-e', script], {
        cwd: repo,
        env: {
          ...process.env,
          HOME: home,
          USERPROFILE: home,
          AW_VERSION: '1.4.66-test.0',
        },
        encoding: 'utf8',
      });

      assert.strictEqual(child.status, 0, child.stderr);
      const event = JSON.parse(child.stdout);
      const expectedProjectHash = crypto.createHash('sha256')
        .update(fs.realpathSync(repo))
        .digest('hex')
        .slice(0, 16);

      assert.strictEqual(event.event, 'commit_created');
      assert.strictEqual(event.harness, 'git');
      assert.strictEqual(event.session_id, null);
      assert.strictEqual(event.github_user, 'aw-test-user');
      assert.strictEqual(event.github_email, 'aw-test@example.com');
      assert.strictEqual(event.project_hash, expectedProjectHash);
      assert.strictEqual(event.aw_version, '1.4.66-test.0');
      assert.deepStrictEqual(event.payload, {
        commit_hash: commitSha,
        commit_sha: commitSha,
        branch: 'main',
      });
    } finally {
      cleanup(home);
      cleanup(repo);
    }
  })) passed++; else failed++;

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  runTests();
}
