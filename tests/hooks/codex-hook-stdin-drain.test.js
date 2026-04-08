/**
 * Regression tests for Codex and shared AW hook shell entrypoints that do not
 * inspect their stdin payloads but still need to drain it to avoid EPIPE.
 *
 * Run with: node tests/hooks/codex-hook-stdin-drain.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const LARGE_PAYLOAD = JSON.stringify({
  hookEventName: 'RegressionPayload',
  data: 'x'.repeat(5 * 1024 * 1024),
});

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function runShellScript(scriptPath, { input = LARGE_PAYLOAD, env = {}, cwd = REPO_ROOT } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', [scriptPath], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let stdinError = null;

    proc.stdout.on('data', (data) => {
      stdout += data;
    });
    proc.stderr.on('data', (data) => {
      stderr += data;
    });
    proc.stdin.on('error', (error) => {
      stdinError = error;
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr, stdinError });
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function assertNoBrokenPipe(result) {
  assert.strictEqual(result.code, 0, result.stderr);
  assert.ok(!result.stdinError, `Expected stdin to drain cleanly, received ${result.stdinError?.code || 'unknown error'}`);
}

async function runTests() {
  console.log('\n=== Testing Codex hook stdin draining ===\n');

  let passed = 0;
  let failed = 0;

  if (await asyncTest('Codex session-start hook drains stdin before emitting AW context', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-session-start.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.ok(result.stdout.includes('"hookSpecificOutput"'));
    assert.ok(result.stdout.includes('AW Session Context'));
  })) passed++; else failed++;

  if (await asyncTest('Codex pre-tool-use hook drains stdin even though it is a reserved no-op', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-pre-tool-use.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.strictEqual(result.stdout, '');
  })) passed++; else failed++;

  if (await asyncTest('Codex post-tool-use hook drains stdin even though it is a reserved no-op', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-post-tool-use.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.strictEqual(result.stdout, '');
  })) passed++; else failed++;

  if (await asyncTest('Codex stop hook drains stdin even though it is a reserved no-op', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-stop.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.strictEqual(result.stdout, '');
  })) passed++; else failed++;

  if (await asyncTest('Codex prompt-submit hook drains stdin when the AW bundle is missing', async () => {
    const tempHome = createTempDir('codex-hook-home-');

    try {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-user-prompt-submit.sh');
      const result = await runShellScript(scriptPath, {
        env: { HOME: tempHome },
      });

      assertNoBrokenPipe(result);
      assert.strictEqual(result.stdout, '');
    } finally {
      cleanup(tempHome);
    }
  })) passed++; else failed++;

  if (await asyncTest('shared session-start hook drains stdin before delegating to the AW router hook', async () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'session-start.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.ok(result.stdout.includes('"hookSpecificOutput"'));
    assert.ok(result.stdout.includes('AW Session Context'));
  })) passed++; else failed++;

  if (await asyncTest('direct using-aw-skills session-start hook drains stdin before emitting context', async () => {
    const scriptPath = path.join(REPO_ROOT, 'skills', 'using-aw-skills', 'hooks', 'session-start.sh');
    const result = await runShellScript(scriptPath);

    assertNoBrokenPipe(result);
    assert.ok(result.stdout.includes('"hookSpecificOutput"'));
    assert.ok(result.stdout.includes('AW Session Context'));
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
