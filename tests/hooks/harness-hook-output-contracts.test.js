/**
 * Tests the concrete output shapes AW emits for Cursor, Codex, and Claude hook surfaces.
 *
 * Run with: node tests/hooks/harness-hook-output-contracts.test.js
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

function runBash(scriptPath, input = '', env = {}, cwd = REPO_ROOT) {
  return spawnSync('bash', [scriptPath], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

function withTempWorkspace(fn) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-hook-contract-'));
  try {
    const rulesDir = path.join(tempDir, '.aw', '.aw_rules', 'platform', 'backend');
    const universalDir = path.join(tempDir, '.aw', '.aw_rules', 'platform', 'universal');
    const securityDir = path.join(tempDir, '.aw', '.aw_rules', 'platform', 'security');
    fs.mkdirSync(rulesDir, { recursive: true });
    fs.mkdirSync(universalDir, { recursive: true });
    fs.mkdirSync(securityDir, { recursive: true });
    fs.writeFileSync(
      path.join(rulesDir, 'AGENTS.md'),
      '# Backend\n\n- Use @platform-core/logger. [MUST]\n- Never use console.log. [MUST]\n',
      'utf8'
    );
    fs.writeFileSync(path.join(universalDir, 'AGENTS.md'), '# Universal\n', 'utf8');
    fs.writeFileSync(path.join(securityDir, 'AGENTS.md'), '# Security\n', 'utf8');
    return fn(tempDir);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseJson(output) {
  try {
    return JSON.parse(output);
  } catch (_error) {
    throw new Error(`Expected valid JSON, received: ${output.slice(0, 300)}`);
  }
}

function runTests() {
  console.log('\n=== Testing harness hook output contracts ===\n');

  let passed = 0;
  let failed = 0;

  if (test('root session-start emits hookSpecificOutput JSON by default', () => {
    const scriptPath = path.join(REPO_ROOT, 'hooks', 'session-start');
    const result = runBash(scriptPath);

    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.equal(payload.hookSpecificOutput.hookEventName, 'SessionStart');
    assert.ok(typeof payload.hookSpecificOutput.additionalContext === 'string');
    assert.match(payload.hookSpecificOutput.additionalContext, /AW Session Context/);
  })) passed++; else failed++;

  if (test('Cursor before-submit-prompt returns valid rewritten prompt JSON and advisory reminders on stderr', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'cursor-aw-hooks', 'before-submit-prompt.sh');
    const raw = JSON.stringify({
      prompt: 'Plan a new backend service',
      workspace_roots: ['/tmp/example'],
      hook_event_name: 'beforeSubmitPrompt',
    });

    const result = runBash(scriptPath, raw);

    assert.strictEqual(result.status, 0, result.stderr);
    const payload = parseJson(result.stdout);
    assert.ok(typeof payload.prompt === 'string');
    assert.equal(payload.prompt, 'Plan a new backend service');
    assert.match(result.stderr, /\[AW Router reminder\]/);
    assert.match(result.stderr, /\[Rule reminder/);
  })) passed++; else failed++;

  if (test('Claude/Codex prompt reminder emits hookSpecificOutput JSON', () => {
    withTempWorkspace((cwd) => {
      const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'session-start-rules-context.sh');
      const raw = JSON.stringify({
        cwd,
        prompt: 'Fix this backend service and DTO validation',
      });

      const result = runBash(scriptPath, raw, {}, cwd);

      assert.strictEqual(result.status, 0, result.stderr);
      const payload = parseJson(result.stdout);
      assert.equal(payload.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
      assert.match(payload.hookSpecificOutput.additionalContext, /\[AW Router reminder\]/);
      assert.match(payload.hookSpecificOutput.additionalContext, /\[Rule reminder/);
      assert.match(payload.hookSpecificOutput.additionalContext, /\.aw\/\.aw_rules\/platform\/universal\/AGENTS\.md/);
      assert.match(payload.hookSpecificOutput.additionalContext, /\.aw\/\.aw_rules\/platform\/security\/AGENTS\.md/);
    });
  })) passed++; else failed++;

  if (test('Codex home prompt-submit wrapper preserves JSON contract from the managed hook target', () => {
    withTempWorkspace((cwd) => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-codex-home-'));
      try {
        const targetDir = path.join(fakeHome, '.aw-ecc', 'scripts', 'hooks');
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(
          path.join(REPO_ROOT, 'scripts', 'hooks', 'session-start-rules-context.sh'),
          path.join(targetDir, 'session-start-rules-context.sh')
        );
        const sharedDir = path.join(targetDir, 'shared');
        fs.mkdirSync(sharedDir, { recursive: true });
        fs.copyFileSync(
          path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'user-prompt-submit.sh'),
          path.join(sharedDir, 'user-prompt-submit.sh')
        );

        const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-user-prompt-submit.sh');
        const raw = JSON.stringify({
          cwd,
          prompt: 'Review a NestJS controller that trusts locationId from req.body',
        });

        const result = runBash(scriptPath, raw, { HOME: fakeHome }, cwd);

        assert.strictEqual(result.status, 0, result.stderr);
        const payload = parseJson(result.stdout);
        assert.equal(payload.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
        assert.match(payload.hookSpecificOutput.additionalContext, /\[AW Router reminder\]/);
      } finally {
        fs.rmSync(fakeHome, { recursive: true, force: true });
      }
    });
  })) passed++; else failed++;

  if (test('shared prompt reminder prefers .aw/.aw_rules over legacy .aw_rules paths', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-hook-rules-root-'));
    try {
      const modernUniversal = path.join(tempDir, '.aw', '.aw_rules', 'platform', 'universal');
      const modernSecurity = path.join(tempDir, '.aw', '.aw_rules', 'platform', 'security');
      const legacyUniversal = path.join(tempDir, '.aw_rules', 'platform', 'universal');
      const legacySecurity = path.join(tempDir, '.aw_rules', 'platform', 'security');

      fs.mkdirSync(modernUniversal, { recursive: true });
      fs.mkdirSync(modernSecurity, { recursive: true });
      fs.mkdirSync(legacyUniversal, { recursive: true });
      fs.mkdirSync(legacySecurity, { recursive: true });

      fs.writeFileSync(path.join(modernUniversal, 'AGENTS.md'), '# Modern Universal\n', 'utf8');
      fs.writeFileSync(path.join(modernSecurity, 'AGENTS.md'), '# Modern Security\n', 'utf8');
      fs.writeFileSync(path.join(legacyUniversal, 'AGENTS.md'), '# Legacy Universal\n', 'utf8');
      fs.writeFileSync(path.join(legacySecurity, 'AGENTS.md'), '# Legacy Security\n', 'utf8');

      const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared', 'user-prompt-submit.sh');
      const raw = JSON.stringify({ cwd: tempDir, prompt: 'Plan a backend service' });
      const result = runBash(scriptPath, raw, {}, tempDir);

      assert.strictEqual(result.status, 0, result.stderr);
      const expectedModernRoot = path.join(tempDir, '.aw', '.aw_rules', 'platform').replace(/\\/g, '/');
      const unexpectedLegacyRoot = path.join(tempDir, '.aw_rules', 'platform').replace(/\\/g, '/');

      assert.match(result.stdout, new RegExp(expectedModernRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      assert.doesNotMatch(result.stdout, new RegExp(`Read ${unexpectedLegacyRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
