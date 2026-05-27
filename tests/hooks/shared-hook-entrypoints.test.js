/**
 * Tests for shared AW hook shell entrypoints.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');

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

function runBash(scriptPath, input = '', env = {}) {
  return spawnSync('bash', [scriptPath], {
    cwd: REPO_ROOT,
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function withTempRulesDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-aw-hook-'));
  const rulesDir = path.join(tempDir, '.aw_rules', 'platform', 'backend');
  fs.mkdirSync(rulesDir, { recursive: true });

  try {
    return fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('\n=== Testing shared AW hook entrypoints ===\n');

  let passed = 0;
  let failed = 0;

  if (test('shared session-start wrapper resolves to the AW router session-start hook', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'session-start.sh');
    const result = runBash(scriptPath);

    assert.strictEqual(result.status, 0, result.stderr);
    assert.ok(result.stdout.includes('"hookSpecificOutput"'));
    assert.ok(result.stdout.includes('EXTREMELY_IMPORTANT') || result.stdout.includes('AW Session Context'));
  })) passed++; else failed++;

  if (test('shared user-prompt-submit wrapper emits compact AW reminders', () => {
    withTempRulesDir((cwd) => {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'user-prompt-submit.sh');
      const raw = JSON.stringify({
        cwd,
        prompt: 'update this backend service and fix the dto validation',
      });

      const result = runBash(scriptPath, raw);

      assert.strictEqual(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes('[AW Router reminder]'));
      assert.ok(result.stdout.includes('[Rule reminder'));
      assert.ok(result.stdout.includes('.aw_rules/platform/universal/AGENTS.md'));
      assert.ok(result.stdout.includes('.aw_rules/platform/security/AGENTS.md'));
      assert.ok(result.stdout.includes('references/ on demand'));
    });
  })) passed++; else failed++;

  if (test('shared user-prompt-submit reminds Codex to include remote docs for completed Echo handoffs', () => {
    withTempRulesDir((cwd) => {
      const featureDir = path.join(cwd, '.aw_docs', 'features', 'teamofone-awdocs-file-browser-side-drawer');
      fs.mkdirSync(featureDir, { recursive: true });
      fs.writeFileSync(
        path.join(featureDir, 'state.json'),
        JSON.stringify({
          html_companion_artifacts: [
            {
              status: 'generated',
              owner: 'platform-core:echo-direct',
              execution_mode: 'skill',
              runner: 'platform-core:echo-direct',
              publish_status: 'published',
              remote_url: 'https://github.com/GoHighLevel/ghl-aw-docs/blob/master-sync/aw_docs/teamofone/user/features/teamofone-awdocs-file-browser-side-drawer/tasks.html',
              teamofone_url: '/too/docs/GoHighLevel/ghl-aw-docs/aw_docs/teamofone/user/features/teamofone-awdocs-file-browser-side-drawer/tasks.html',
            },
          ],
        }),
        'utf8'
      );

      const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'user-prompt-submit.sh');
      const raw = JSON.stringify({
        cwd,
        prompt: 'can we create plan for add functionality to open side drawer when click on file icon to browser files and folder',
      });

      const result = runBash(scriptPath, raw);

      assert.strictEqual(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes('[AW Remote Docs reminder]'));
      assert.ok(result.stdout.includes('plain-text absolute TeamOfOne remote docs URLs'));
      assert.ok(result.stdout.includes('compact GitHub links'));
      assert.ok(result.stdout.includes('do not hide TeamOfOne behind Markdown labels'));
      assert.ok(result.stdout.includes('Relative `/too/docs/...` paths are not enough'));
      assert.ok(result.stdout.includes('do not only say "plan already exists"'));
      assert.ok(result.stdout.includes('teamofone-awdocs-file-browser-side-drawer/state.json'));
    });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
