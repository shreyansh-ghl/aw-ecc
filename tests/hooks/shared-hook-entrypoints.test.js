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
  const universalRulesDir = path.join(tempDir, '.aw_rules', 'platform', 'universal');
  const securityRulesDir = path.join(tempDir, '.aw_rules', 'platform', 'security');
  fs.mkdirSync(universalRulesDir, { recursive: true });
  fs.mkdirSync(securityRulesDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# Root Agents\n');
  fs.writeFileSync(
    path.join(universalRulesDir, 'AGENTS.md'),
    [
      '# Universal Rules',
      '',
      '- Use structured logging via @platform-core/logger MUST',
      '',
    ].join('\n')
  );
  fs.writeFileSync(
    path.join(securityRulesDir, 'AGENTS.md'),
    [
      '# Security Rules',
      '',
      '- Never hardcode secrets Never',
      '',
    ].join('\n')
  );

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
    assert.ok(result.stdout.includes('AW Session Context'));
  })) passed++; else failed++;

  if (test('shared user-prompt-submit wrapper emits compact AW reminders', () => {
    withTempRulesDir((cwd) => {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'user-prompt-submit.sh');
      const raw = JSON.stringify({
        prompt: 'update this backend service and fix the dto validation',
      });

      const result = spawnSync('bash', [scriptPath], {
        cwd,
        input: raw,
        encoding: 'utf8',
        env: process.env,
      });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.ok(result.stdout.includes('[AW Router reminder]'));
      assert.ok(result.stdout.includes('[Rules reminder]'));
      assert.ok(result.stdout.includes(`${cwd}/AGENTS.md`));
      assert.ok(result.stdout.includes(`${cwd}/.aw_rules/platform/universal/AGENTS.md`));
      assert.ok(result.stdout.includes(`${cwd}/.aw_rules/platform/security/AGENTS.md`));
    });
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
