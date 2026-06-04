#!/usr/bin/env node
/**
 * Pack the repository and exercise hook commands from the installed artifact.
 *
 * This catches failures that source-level tests can miss, especially when the
 * manifest, package file list, wrapper, and installed helper layout drift.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const FILE_TOOLS = ['Write', 'Edit', 'MultiEdit'];
const REGRESSION_HOOK_IDS = [
  'pre:write:doc-file-warning',
  'pre:insaits-security',
  'pre:governance-capture',
  'pre:config-protection',
  'pre:mcp-health-check',
];
const EVENT_MARKER_KEYS = [
  'hook_event_name',
  'tool_input',
  'tool_name',
  'tool_output',
  'tool_response',
];

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

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    input: options.input || '',
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    shell: options.shell || false,
    timeout: options.timeout || 30000,
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseNpmPackJson(stdout) {
  const start = stdout.indexOf('[');
  const end = stdout.lastIndexOf(']');
  assert.ok(start >= 0 && end > start, `npm pack did not emit JSON array: ${stdout.slice(0, 500)}`);
  return JSON.parse(stdout.slice(start, end + 1));
}

function createPackedPlugin() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-hook-artifact-'));
  const packResult = run('npm', ['pack', '--json', '--pack-destination', tempRoot], {
    cwd: REPO_ROOT,
    timeout: 120000,
  });

  assert.strictEqual(packResult.status, 0, packResult.stderr || packResult.stdout);
  const [packInfo] = parseNpmPackJson(packResult.stdout);
  assert.ok(packInfo && packInfo.filename, 'npm pack output did not include a filename');

  const tarballPath = path.join(tempRoot, packInfo.filename);
  assert.ok(fs.existsSync(tarballPath), `missing packed tarball: ${tarballPath}`);

  const extractResult = run('tar', ['-xzf', tarballPath, '-C', tempRoot], { cwd: tempRoot });
  assert.strictEqual(extractResult.status, 0, extractResult.stderr);

  const packageRoot = path.join(tempRoot, 'package');
  assert.ok(fs.existsSync(path.join(packageRoot, 'hooks', 'hooks.json')), 'artifact missing hooks/hooks.json');
  assert.ok(fs.existsSync(path.join(packageRoot, '.cursor', 'hooks.json')), 'artifact missing .cursor/hooks.json');
  assert.ok(
    fs.existsSync(path.join(packageRoot, 'scripts', 'lib', 'hook-flags.js')),
    'artifact missing scripts/lib/hook-flags.js'
  );

  return { tempRoot, packageRoot };
}

function assertStrictHookStdout(label, stdout) {
  const trimmed = String(stdout || '').trim();
  if (!trimmed) return {};

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (_error) {
    throw new Error(`${label}: stdout is not valid JSON: ${trimmed.slice(0, 500)}`);
  }

  assert.ok(parsed && typeof parsed === 'object' && !Array.isArray(parsed), `${label}: stdout must be a JSON object`);
  const echoedKeys = EVENT_MARKER_KEYS.filter(key => Object.prototype.hasOwnProperty.call(parsed, key));
  assert.deepStrictEqual(echoedKeys, [], `${label}: stdout echoed hook input event keys: ${echoedKeys.join(', ')}`);
  return parsed;
}

function matcherMatchesTool(matcher, toolName) {
  if (!matcher || matcher === '*') return true;
  return String(matcher).split('|').includes(toolName);
}

function selectToolName(matcher) {
  return FILE_TOOLS.find(toolName => matcherMatchesTool(matcher, toolName)) || 'Write';
}

function makeToolPayload(toolName, filePath) {
  if (toolName === 'MultiEdit') {
    return {
      hook_event_name: 'PreToolUse',
      tool_name: toolName,
      tool_input: {
        file_path: filePath,
        edits: [{ old_string: 'before', new_string: 'after' }],
      },
    };
  }

  if (toolName === 'Edit') {
    return {
      hook_event_name: 'PreToolUse',
      tool_name: toolName,
      tool_input: {
        file_path: filePath,
        old_string: 'before',
        new_string: 'after',
      },
    };
  }

  return {
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: {
      file_path: filePath,
      content: 'export const ok = true;\n',
    },
  };
}

function makeCursorPayload(eventName, workspaceRoot) {
  switch (eventName) {
    case 'sessionStart':
      return { hook_event_name: eventName, cwd: workspaceRoot, workspace_roots: [workspaceRoot] };
    case 'sessionEnd':
      return { hook_event_name: eventName, cwd: workspaceRoot, transcript_path: path.join(workspaceRoot, 'transcript.jsonl') };
    case 'beforeShellExecution':
    case 'afterShellExecution':
      return { hook_event_name: eventName, command: 'echo ok', cwd: workspaceRoot, exit_code: 0 };
    case 'afterFileEdit':
    case 'afterTabFileEdit':
      return { hook_event_name: eventName, path: path.join(workspaceRoot, 'src', 'users.service.ts') };
    case 'beforeMCPExecution':
    case 'afterMCPExecution':
      return { hook_event_name: eventName, server_name: 'example', tool_name: 'status', tool_input: {} };
    case 'beforeReadFile':
    case 'beforeTabFileRead':
      return { hook_event_name: eventName, path: path.join(workspaceRoot, 'src', 'users.service.ts') };
    case 'beforeSubmitPrompt':
      return { hook_event_name: eventName, prompt: 'Plan this safely', workspace_roots: [workspaceRoot] };
    case 'subagentStart':
      return { hook_event_name: eventName, subagent_type: 'general-purpose', task: 'Inspect hook behavior' };
    case 'subagentStop':
      return { hook_event_name: eventName, agent_name: 'general-purpose', status: 'completed' };
    case 'postToolUse':
      return makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts'));
    case 'postToolUseFailure':
      return {
        ...makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts')),
        error_message: 'simulated failure',
        failure_type: 'error',
      };
    case 'preCompact':
      return { hook_event_name: eventName, transcript_path: path.join(workspaceRoot, 'transcript.jsonl') };
    default:
      return { hook_event_name: eventName, cwd: workspaceRoot };
  }
}

function parseRunWithFlagsCommand(command) {
  const match = String(command).match(/run-with-flags\.js"\s+"([^"]+)"\s+"([^"]+)"(?:\s+"([^"]+)")?/);
  if (!match) return null;
  return {
    hookId: match[1],
    relativeScriptPath: match[2],
    profilesCsv: match[3] || '',
  };
}

function collectClaudeFileHookCommands(packageRoot) {
  const manifest = readJson(path.join(packageRoot, 'hooks', 'hooks.json'));
  const entries = manifest.hooks?.PreToolUse || [];
  const commands = [];

  for (const entry of entries) {
    const matcher = entry.matcher || '*';
    const affectsFileTool = FILE_TOOLS.some(toolName => matcherMatchesTool(matcher, toolName));
    if (!affectsFileTool && matcher !== '*') continue;

    for (const hook of entry.hooks || []) {
      const parsed = parseRunWithFlagsCommand(hook.command);
      if (!parsed) continue;
      commands.push({
        matcher,
        command: hook.command,
        ...parsed,
      });
    }
  }

  return commands;
}

function runManifestCommand(command, payload, packageRoot, workspaceRoot, extraEnv = {}) {
  const shell = process.platform === 'win32' ? true : '/bin/bash';
  return run(command, [], {
    cwd: workspaceRoot,
    input: JSON.stringify(payload),
    shell,
    env: {
      CLAUDE_PLUGIN_ROOT: packageRoot,
      ECC_HOOK_PROFILE: 'standard',
      HOME: path.join(workspaceRoot, 'home'),
      ...extraEnv,
    },
  });
}

function runWrapper(packageRoot, workspaceRoot, args, payload, extraEnv = {}) {
  return run('node', [path.join(packageRoot, 'scripts', 'hooks', 'run-with-flags.js'), ...args], {
    cwd: workspaceRoot,
    input: JSON.stringify(payload),
    env: {
      CLAUDE_PLUGIN_ROOT: packageRoot,
      ECC_HOOK_PROFILE: 'standard',
      HOME: path.join(workspaceRoot, 'home'),
      ...extraEnv,
    },
  });
}

function runInstalledArtifactTests(packageRoot) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-hook-workspace-'));
  fs.mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, 'home'), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, 'transcript.jsonl'), '', 'utf8');

  try {
    const claudeCommands = collectClaudeFileHookCommands(packageRoot);
    const hookIds = new Set(claudeCommands.map(command => command.hookId));
    for (const hookId of REGRESSION_HOOK_IDS) {
      assert.ok(hookIds.has(hookId), `hooks/hooks.json is missing regression hook ${hookId}`);
    }

    for (const hookCommand of claudeCommands) {
      const toolName = selectToolName(hookCommand.matcher);
      const payload = makeToolPayload(toolName, path.join(workspaceRoot, 'src', 'users.service.ts'));
      const result = runManifestCommand(hookCommand.command, payload, packageRoot, workspaceRoot);

      assert.strictEqual(result.status, 0, `${hookCommand.hookId} failed: ${result.stderr}`);
      assertStrictHookStdout(`${hookCommand.hookId} ${toolName}`, result.stdout);
    }

    const protectedPayload = makeToolPayload('Write', path.join(workspaceRoot, 'eslint.config.js'));
    const configHook = claudeCommands.find(command => command.hookId === 'pre:config-protection');
    assert.ok(configHook, 'missing pre:config-protection command');
    const blocked = runManifestCommand(configHook.command, protectedPayload, packageRoot, workspaceRoot);
    assert.strictEqual(blocked.status, 2, blocked.stderr);
    assertStrictHookStdout('pre:config-protection protected file', blocked.stdout);
    assert.match(blocked.stderr, /BLOCKED|not allowed/i);

    const disabledHook = claudeCommands.find(command => command.hookId === 'pre:governance-capture');
    assert.ok(disabledHook, 'missing pre:governance-capture command');
    const disabled = runManifestCommand(
      disabledHook.command,
      makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts')),
      packageRoot,
      workspaceRoot,
      { ECC_DISABLED_HOOKS: 'pre:governance-capture' }
    );
    assert.strictEqual(disabled.status, 0, disabled.stderr);
    assertStrictHookStdout('disabled pre:governance-capture', disabled.stdout);

    const missing = runWrapper(
      packageRoot,
      workspaceRoot,
      ['pre:e2e:missing', 'scripts/hooks/not-present.js', 'standard'],
      makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts'))
    );
    assert.strictEqual(missing.status, 0, missing.stderr);
    assertStrictHookStdout('missing script path', missing.stdout);

    fs.writeFileSync(
      path.join(packageRoot, 'scripts', 'hooks', '__e2e-crash.js'),
      "module.exports.run = () => { throw new Error('e2e crash'); };\n",
      'utf8'
    );
    const crashed = runWrapper(
      packageRoot,
      workspaceRoot,
      ['pre:e2e:crash', 'scripts/hooks/__e2e-crash.js', 'standard'],
      makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts'))
    );
    assert.strictEqual(crashed.status, 0, crashed.stderr);
    assertStrictHookStdout('crashed hook', crashed.stdout);
    assert.match(crashed.stderr, /e2e crash/);

    fs.writeFileSync(
      path.join(packageRoot, 'scripts', 'hooks', '__e2e-decision.js'),
      "module.exports.run = () => ({ decision: 'block', reason: 'e2e decision' });\n",
      'utf8'
    );
    const decision = runWrapper(
      packageRoot,
      workspaceRoot,
      ['pre:e2e:decision', 'scripts/hooks/__e2e-decision.js', 'standard'],
      makeToolPayload('Write', path.join(workspaceRoot, 'src', 'users.service.ts'))
    );
    assert.strictEqual(decision.status, 0, decision.stderr);
    const decisionPayload = assertStrictHookStdout('decision hook', decision.stdout);
    assert.strictEqual(decisionPayload.decision, 'block');
    assert.strictEqual(decisionPayload.reason, 'e2e decision');

    const cursorManifest = readJson(path.join(packageRoot, '.cursor', 'hooks.json'));
    let cursorCommandsChecked = 0;
    for (const [eventName, entries] of Object.entries(cursorManifest.hooks || {})) {
      for (const entry of entries || []) {
        const command = entry.command || '';
        if (!command || /\bnpx\s+block-no-verify\b/.test(command)) continue;

        const cursorResult = runManifestCommand(
          command,
          makeCursorPayload(eventName, workspaceRoot),
          packageRoot,
          packageRoot
        );
        assert.strictEqual(cursorResult.status, 0, `Cursor ${eventName} failed: ${cursorResult.stderr}`);
        const cursorPayload = assertStrictHookStdout(`Cursor ${eventName}`, cursorResult.stdout);
        if (eventName === 'beforeSubmitPrompt') {
          assert.strictEqual(cursorPayload.prompt, 'Plan this safely');
        }
        cursorCommandsChecked += 1;
      }
    }
    assert.ok(cursorCommandsChecked >= 10, `expected broad Cursor hook coverage, checked ${cursorCommandsChecked}`);
  } finally {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('\n=== Testing installed hook artifact contract ===\n');

  let passed = 0;
  let failed = 0;

  let packed;
  if (test('packs install artifact with Claude and Cursor hook surfaces', () => {
    packed = createPackedPlugin();
  })) passed++; else failed++;

  if (packed && test('installed artifact hooks satisfy strict Claude/Cursor stdout contract', () => {
    runInstalledArtifactTests(packed.packageRoot);
  })) passed++; else failed++;

  if (packed) {
    fs.rmSync(packed.tempRoot, { recursive: true, force: true });
  }

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
