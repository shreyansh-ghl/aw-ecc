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
const { normalizeToolHookStdout } = require(path.join(REPO_ROOT, 'scripts', 'lib', 'hook-stdout'));

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
    env: { ...process.env, AW_MEMORY_HOOKS: '0', ...env },
  });
}

function runNode(scriptPath, args = [], input = '', env = {}, cwd = REPO_ROOT) {
  return spawnSync('node', [scriptPath, ...args], {
    cwd,
    input,
    encoding: 'utf8',
    env: { ...process.env, AW_MEMORY_HOOKS: '0', ...env },
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

  if (test('Claude/Codex prompt reminder remains valid hook JSON when memory recall is disabled', () => {
    withTempWorkspace((cwd) => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-memory-no-mcp-'));
      try {
        const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'session-start-rules-context.sh');
        const raw = JSON.stringify({
          cwd,
          prompt: 'Use remembered backend guidance',
        });

        const result = runBash(
          scriptPath,
          raw,
          {
            HOME: fakeHome,
            AW_MEMORY_HOOKS: '0',
          },
          cwd
        );

        assert.strictEqual(result.status, 0, result.stderr);
        const payload = parseJson(result.stdout);
        assert.equal(payload.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
        assert.match(payload.hookSpecificOutput.additionalContext, /\[AW Router reminder\]/);
        assert.doesNotMatch(payload.hookSpecificOutput.additionalContext, /AW Memory Recall/);
      } finally {
        fs.rmSync(fakeHome, { recursive: true, force: true });
      }
    });
  })) passed++; else failed++;

  if (test('Codex home prompt-submit wrapper preserves JSON contract from the managed hook target', () => {
    withTempWorkspace((cwd) => {
      const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-codex-home-'));
      try {
        const targetDir = path.join(fakeHome, '.aw-ecc', 'scripts', 'hooks');
        fs.mkdirSync(targetDir, { recursive: true });
        const telemetryMarker = path.join(fakeHome, 'prompt-telemetry.txt');
        fs.copyFileSync(
          path.join(REPO_ROOT, 'scripts', 'hooks', 'session-start-rules-context.sh'),
          path.join(targetDir, 'session-start-rules-context.sh')
        );
        fs.writeFileSync(
          path.join(targetDir, 'aw-usage-prompt-submit.js'),
          `#!/usr/bin/env node
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  require('fs').writeFileSync(${JSON.stringify(telemetryMarker)}, raw, 'utf8');
  process.stdout.write('{}');
});
`,
          'utf8'
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
        assert.strictEqual(fs.readFileSync(telemetryMarker, 'utf8'), raw);
      } finally {
        fs.rmSync(fakeHome, { recursive: true, force: true });
      }
    });
  })) passed++; else failed++;

  if (test('Codex home post-tool-use wrapper runs the telemetry sidecar without emitting stdout', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-codex-post-tool-'));
    try {
      const hooksDir = path.join(fakeHome, '.aw-ecc', 'scripts', 'hooks');
      const marker = path.join(fakeHome, 'post-tool-telemetry.txt');
      fs.mkdirSync(hooksDir, { recursive: true });
      fs.writeFileSync(
        path.join(hooksDir, 'aw-usage-post-tool-use.js'),
        `#!/usr/bin/env node
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  require('fs').writeFileSync(${JSON.stringify(marker)}, raw, 'utf8');
  process.stdout.write('{}');
});
`,
        'utf8'
      );

      const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-post-tool-use.sh');
      const raw = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'echo hi' } });
      const result = runBash(scriptPath, raw, { HOME: fakeHome });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, '');
      assert.strictEqual(fs.readFileSync(marker, 'utf8'), raw);
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('Codex home stop wrapper runs the telemetry sidecar without emitting stdout', () => {
    const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-codex-stop-'));
    try {
      const hooksDir = path.join(fakeHome, '.aw-ecc', 'scripts', 'hooks');
      const marker = path.join(fakeHome, 'stop-telemetry.txt');
      fs.mkdirSync(hooksDir, { recursive: true });
      fs.writeFileSync(
        path.join(hooksDir, 'aw-usage-stop.js'),
        `#!/usr/bin/env node
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  require('fs').writeFileSync(${JSON.stringify(marker)}, raw, 'utf8');
  process.stdout.write('{}');
});
`,
        'utf8'
      );

      const scriptPath = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks', 'aw-stop.sh');
      const raw = JSON.stringify({ transcript_path: '/tmp/example.jsonl', last_assistant_message: 'done' });
      const result = runBash(scriptPath, raw, { HOME: fakeHome });

      assert.strictEqual(result.status, 0, result.stderr);
      assert.strictEqual(result.stdout, '');
      assert.strictEqual(fs.readFileSync(marker, 'utf8'), raw);
    } finally {
      fs.rmSync(fakeHome, { recursive: true, force: true });
    }
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
      // Build cross-platform regex: each path separator matches either / or \
      function toPathRegex(p) {
        return p
          .replace(/[.*+?^${}()|[\]]/g, '\\$&')
          .replace(/[/\\]+/g, '[/\\\\]+');
      }
      const expectedModernRoot = path.join(tempDir, '.aw', '.aw_rules', 'platform');
      const unexpectedLegacyRoot = path.join(tempDir, '.aw_rules', 'platform');

      assert.match(result.stdout, new RegExp(toPathRegex(expectedModernRoot)));
      assert.doesNotMatch(result.stdout, new RegExp(`Read ${toPathRegex(unexpectedLegacyRoot)}[/\\\\]`));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('run-with-flags suppresses pass-through hook input events', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'run-with-flags.js');
    const raw = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/users.service.ts' },
    });

    const result = runNode(
      scriptPath,
      ['pre:write:doc-file-warning', 'scripts/hooks/doc-file-warning.js', 'standard,strict'],
      raw,
      { CLAUDE_PLUGIN_ROOT: REPO_ROOT }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.deepStrictEqual(parseJson(result.stdout), {});
  })) passed++; else failed++;

  if (test('run-with-flags emits no-op JSON for disabled hooks', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'run-with-flags.js');
    const raw = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/users.service.ts' },
    });

    const result = runNode(
      scriptPath,
      ['pre:governance-capture', 'scripts/hooks/governance-capture.js', 'standard,strict'],
      raw,
      {
        CLAUDE_PLUGIN_ROOT: REPO_ROOT,
        ECC_DISABLED_HOOKS: 'pre:governance-capture',
      }
    );

    assert.strictEqual(result.status, 0, result.stderr);
    assert.deepStrictEqual(parseJson(result.stdout), {});
  })) passed++; else failed++;

  if (test('run-with-flags preserves config-protection block exit code', () => {
    const scriptPath = path.join(REPO_ROOT, 'scripts', 'hooks', 'run-with-flags.js');
    const raw = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/eslint.config.js' },
    });

    const result = runNode(
      scriptPath,
      ['pre:config-protection', 'scripts/hooks/config-protection.js', 'standard,strict'],
      raw,
      { CLAUDE_PLUGIN_ROOT: REPO_ROOT }
    );

    assert.strictEqual(result.status, 2);
    assert.deepStrictEqual(parseJson(result.stdout), {});
    assert.match(result.stderr, /BLOCKED: Modifying eslint\.config\.js is not allowed/);
  })) passed++; else failed++;

  if (test('hook stdout normalizer preserves real hook decisions only', () => {
    const inputEvent = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/users.service.ts' },
    });
    const decision = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'blocked by regression test',
      },
    });

    assert.deepStrictEqual(parseJson(normalizeToolHookStdout(inputEvent)), {});
    assert.deepStrictEqual(parseJson(normalizeToolHookStdout(decision)), parseJson(decision));
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
