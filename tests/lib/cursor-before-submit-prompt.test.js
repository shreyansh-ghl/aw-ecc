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

function runBeforeSubmit(raw, env = {}) {
  const scriptPath = path.join(__dirname, '..', '..', '.cursor', 'hooks', 'before-submit-prompt.js');
  const result = spawnSync('node', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, ECC_HOOK_DEBUG: '1', ...env },
  });

  return {
    code: result.status || 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function withTempRulesDir(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-before-submit-'));
  const rulesDir = path.join(tempDir, '.aw_registry', '.aw_rules', 'platform', 'backend');
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(
    path.join(rulesDir, 'AGENTS.md'),
    [
      '# Backend Rules',
      '',
      '- Use structured logging via @platform-core/logger MUST',
      '- Never trust client payload locationId Never',
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

      const result = runBeforeSubmit(raw);

      // Diagnostic output for CI debugging
      console.log(`    [DEBUG] cwd=${cwd}`);
      console.log(`    [DEBUG] platform=${process.platform}`);
      console.log(`    [DEBUG] exit_code=${result.code}`);
      console.log(`    [DEBUG] stdout=${JSON.stringify(result.stdout)}`);
      console.log(`    [DEBUG] stderr=${JSON.stringify(result.stderr)}`);

      assert.strictEqual(result.code, 0);
      assert.strictEqual(result.stdout, raw);
      assert.ok(result.stderr.includes('[AW Router reminder]'), 'Expected AW routing reminder on stderr');
      assert.ok(result.stderr.includes('[Rule reminder'), 'Expected rule reminder on stderr');
      assert.ok(result.stderr.includes('.aw_registry/.aw_rules/platform/backend'), 'Expected backend rules path in reminder');
    });
  })) passed++; else failed++;

  if (test('warns on potential secrets without changing stdout passthrough', () => {
    withTempRulesDir((cwd) => {
      const raw = JSON.stringify({
        cwd,
        prompt: 'update this backend service and use sk-1234567890123456789012345 for testing',
      });

      const result = runBeforeSubmit(raw);

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
