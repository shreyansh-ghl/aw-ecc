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

const { sendUsageTelemetry } = require('../../.cursor/hooks/before-submit-prompt');

// Sanitized copy of a real Cursor 3.25.9 beforeSubmitPrompt input (captured 21 Oct 2026,
// ghl-agentic-workspace .aw_docs/features/usage-telemetry-hook-v2/evidence/capture/).
const CURSOR_BEFORE_SUBMIT_PROMPT = {
  conversation_id: '<uuid>',
  generation_id: '<uuid>',
  model: 'auto-smart',
  model_id: 'auto-smart',
  composer_mode: 'agent',
  prompt: '@aw-plan say hi',
  attachments: [
    { type: 'rule', file_path: 'common-aw-routing.mdc' },
    { type: 'rule', file_path: 'security.mdc' },
    { type: 'rule', file_path: 'universal.mdc' },
    { type: 'rule', file_path: 'model-policy' },
  ],
  session_id: '<uuid>',
  hook_event_name: 'beforeSubmitPrompt',
  cursor_version: '3.25.9',
  workspace_roots: ['<repo>'],
  user_email: '<email>',
};

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
  const scriptPath = path.join(__dirname, '..', '..', '.cursor', 'hooks', 'before-submit-prompt.sh');
  const result = spawnSync('bash', [scriptPath], {
    input: raw,
    encoding: 'utf8',
    cwd: path.join(__dirname, '..', '..'),
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
  const rulesDir = path.join(tempDir, '.aw_rules', 'platform', 'backend');
  fs.mkdirSync(rulesDir, { recursive: true });

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

  if (test('emits prompt JSON without hook event markers while sending reminders to stderr', () => {
    withTempRulesDir((cwd) => {
      const raw = JSON.stringify({
        hook_event_name: 'beforeSubmitPrompt',
        cwd,
        prompt: 'update this backend service and fix the dto validation',
      });

      const result = runBeforeSubmit(raw);
      const output = JSON.parse(result.stdout);

      assert.strictEqual(result.code, 0);
      assert.strictEqual(output.prompt, 'update this backend service and fix the dto validation');
      assert.strictEqual(output.hook_event_name, undefined);
      assert.ok(result.stderr.includes('[AW Router reminder]'), 'Expected AW routing reminder on stderr');
      assert.ok(result.stderr.includes('[Rule reminder'), 'Expected rule reminder on stderr');
      assert.ok(result.stderr.includes('.aw_rules/platform/universal/AGENTS.md'), 'Expected canonical universal rules path in reminder');
      assert.ok(result.stderr.includes('.aw_rules/platform/security/AGENTS.md'), 'Expected canonical security rules path in reminder');
      assert.ok(result.stderr.includes('references/ on demand'), 'Expected references guidance in reminder');
    });
  })) passed++; else failed++;

  if (test('warns on potential secrets without echoing hook event markers', () => {
    withTempRulesDir((cwd) => {
      const fakeSecret = `sk-${'1234567890123456789012345'}`;
      const raw = JSON.stringify({
        hook_event_name: 'beforeSubmitPrompt',
        cwd,
        prompt: `update this backend service and use ${fakeSecret} for testing`,
      });

      const result = runBeforeSubmit(raw);
      const output = JSON.parse(result.stdout);

      assert.strictEqual(result.code, 0);
      assert.strictEqual(output.prompt, `update this backend service and use ${fakeSecret} for testing`);
      assert.strictEqual(output.hook_event_name, undefined);
      assert.ok(result.stderr.includes('Potential secret detected in prompt'), 'Expected secret warning on stderr');
      assert.ok(result.stderr.includes('Remove secrets before submitting'), 'Expected secret remediation guidance');
    });
  })) passed++; else failed++;

  if (test('passes the Cursor prompt to aw-usage-prompt-submit.js', () => {
    const calls = [];
    sendUsageTelemetry(JSON.stringify(CURSOR_BEFORE_SUBMIT_PROMPT), {
      runExistingHook(scriptName, stdinData) {
        calls.push({ scriptName, payload: JSON.parse(stdinData) });
        return { stdout: '', stderr: '' };
      },
    });

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].scriptName, 'aw-usage-prompt-submit.js');
    assert.strictEqual(calls[0].payload.prompt, '@aw-plan say hi');
    assert.ok(!('attachments' in calls[0].payload), 'attachments should not be forwarded');
  })) passed++; else failed++;

  if (test('does not throw when the aw-usage hook fails', () => {
    sendUsageTelemetry(JSON.stringify(CURSOR_BEFORE_SUBMIT_PROMPT), {
      runExistingHook() {
        throw new Error('hook failed');
      },
    });
    sendUsageTelemetry('not json', {
      runExistingHook() {
        throw new Error('should not be called');
      },
    });
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
