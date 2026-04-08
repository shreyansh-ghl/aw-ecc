/**
 * Tests for scripts/sync-ecc-to-codex.sh
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'sync-ecc-to-codex.sh');

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runSync(homeDir, extraEnv = {}) {
  const env = {
    ...process.env,
    HOME: homeDir,
    CODEX_HOME: path.join(homeDir, '.codex'),
    ...extraEnv,
  };

  fs.mkdirSync(path.join(homeDir, '.codex'), { recursive: true });
  fs.writeFileSync(
    path.join(homeDir, '.codex', 'config.toml'),
    fs.readFileSync(path.join(REPO_ROOT, '.codex', 'config.toml'), 'utf8')
  );

  execFileSync('bash', [SCRIPT], {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30000,
  });
}

function runTests() {
  console.log('\n=== Testing sync-ecc-to-codex.sh ===\n');

  let passed = 0;
  let failed = 0;

  if (test('generates AW-namespaced prompts for /aw: commands', () => {
    const homeDir = createTempDir('sync-codex-home-');

    try {
      runSync(homeDir);

      const promptsDir = path.join(homeDir, '.codex', 'prompts');
      const manifest = fs.readFileSync(path.join(promptsDir, 'ecc-prompts-manifest.txt'), 'utf8');

      for (const fileName of ['aw-plan.md', 'aw-build.md', 'aw-investigate.md', 'aw-test.md', 'aw-review.md', 'aw-deploy.md', 'aw-ship.md']) {
        assert.ok(fs.existsSync(path.join(promptsDir, fileName)), `Expected ${fileName} to be generated`);
        assert.ok(manifest.includes(fileName), `Manifest should include ${fileName}`);
      }
    } finally {
      cleanup(homeDir);
    }
  })) passed++; else failed++;

  if (test('installs managed Codex hook phases and scripts from the neutral source', () => {
    const homeDir = createTempDir('sync-codex-home-');

    try {
      runSync(homeDir);

      const codexHome = path.join(homeDir, '.codex');
      const hooksJson = JSON.parse(fs.readFileSync(path.join(codexHome, 'hooks.json'), 'utf8'));
      for (const phaseName of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop']) {
        assert.ok(Array.isArray(hooksJson.hooks[phaseName]), `Expected hooks.json to define ${phaseName}`);
        assert.ok(hooksJson.hooks[phaseName].length > 0, `Expected ${phaseName} to have at least one entry`);
      }

      for (const fileName of ['aw-session-start.sh', 'aw-user-prompt-submit.sh', 'aw-pre-tool-use.sh', 'aw-post-tool-use.sh', 'aw-stop.sh']) {
        assert.ok(fs.existsSync(path.join(codexHome, 'hooks', fileName)), `Expected managed hook script ${fileName}`);
      }
    } finally {
      cleanup(homeDir);
    }
  })) passed++; else failed++;

  if (test('sync succeeds when ripgrep is unavailable on PATH', () => {
    const homeDir = createTempDir('sync-codex-home-');

    try {
      runSync(homeDir, { ECC_DISABLE_RG: '1' });

      const codexHome = path.join(homeDir, '.codex');
      assert.ok(fs.existsSync(path.join(codexHome, 'prompts', 'ecc-prompts-manifest.txt')));
      assert.ok(fs.existsSync(path.join(codexHome, 'hooks.json')));
    } finally {
      cleanup(homeDir);
    }
  })) passed++; else failed++;

  if (test('global Codex sanity check counts command prompts via the manifest', () => {
    const script = fs.readFileSync(path.join(REPO_ROOT, 'scripts', 'codex', 'check-codex-global-state.sh'), 'utf8');

    assert.ok(
      script.includes('ecc-prompts-manifest.txt'),
      'Sanity checker should count command prompts from the manifest'
    );
    assert.ok(
      !script.includes("find \"$PROMPTS_DIR\" -maxdepth 1 -type f -name 'ecc-*.md'"),
      'Sanity checker should not assume every command prompt is still ecc-*.md'
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
