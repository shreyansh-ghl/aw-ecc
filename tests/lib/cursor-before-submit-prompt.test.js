/**
 * Tests for .cursor/hooks/before-submit-prompt.js
 *
 * Run with: node tests/lib/cursor-before-submit-prompt.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// On Windows, bash's $(pwd) returns POSIX-style paths (/c/Users/...) while
// Node's path.join returns Windows-style (C:\Users\...). Normalize for assertions.
function toPosix(p) {
  if (process.platform !== 'win32') return p;
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runBeforeSubmit(raw, env = {}, cwd = path.join(__dirname, '..', '..')) {
  const scriptPath = path.join(__dirname, '..', '..', '.cursor', 'hooks', 'before-submit-prompt.js');
  const result = spawnSync('node', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    cwd,
    env: { ...process.env, ...env },
  });

  return {
    code: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function withTempRulesDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-before-submit-'));
  const rulesDir = path.join(tempDir, '.aw_rules', 'platform');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# Repo Instructions\n');
  fs.mkdirSync(path.join(rulesDir, 'universal'), { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, 'universal', 'AGENTS.md'),
    [
      '# Universal Rules',
      '',
      '- Handle every error explicitly. [MUST]',
      '',
    ].join('\n')
  );
  fs.mkdirSync(path.join(rulesDir, 'security'), { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, 'security', 'AGENTS.md'),
    [
      '# Security Rules',
      '',
      '- Never hardcode secrets. [MUST]',
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
  console.log('\n=== Testing cursor before-submit prompt hook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('passes raw stdin through while emitting AW prompt reminder to stderr', () => {
    withTempRulesDir((cwd) => {
      const raw = JSON.stringify({
        cwd,
        prompt: 'update this backend service and fix the dto validation',
      });

      const result = runBeforeSubmit(raw, {}, cwd);

      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.stdout, raw);
      assert.ok(result.stderr.includes('[AW Router reminder]'), 'Expected AW routing reminder on stderr');
      assert.ok(result.stderr.includes('[Rules reminder]'), 'Expected rules reminder on stderr');
      assert.ok(result.stderr.includes(`${toPosix(cwd)}/AGENTS.md`), 'Expected repo AGENTS path in reminder');
      assert.ok(result.stderr.includes(`${toPosix(cwd)}/.aw_rules/platform/universal/AGENTS.md`), 'Expected universal rules path in reminder');
      assert.ok(result.stderr.includes(`${toPosix(cwd)}/.aw_rules/platform/security/AGENTS.md`), 'Expected security rules path in reminder');
    });
  })) passed++; else failed++;

  if (test('warns on potential secrets without changing stdout passthrough', () => {
    withTempRulesDir((cwd) => {
      const raw = JSON.stringify({
        cwd,
        prompt: 'update this backend service and use sk-1234567890123456789012345 for testing',
      });

      const result = runBeforeSubmit(raw, {}, cwd);

      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.stdout, raw);
      assert.ok(result.stderr.includes('Potential secret detected in prompt'), 'Expected secret warning on stderr');
      assert.ok(result.stderr.includes('Remove secrets before submitting'), 'Expected secret remediation guidance');
    });
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
