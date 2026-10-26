#!/usr/bin/env node
/**
 * Cursor-to-Claude Code Hook Adapter
 * Transforms Cursor stdin JSON to Claude Code hook format,
 * then delegates to existing scripts/hooks/*.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_STDIN = 1024 * 1024;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
    });
    process.stdin.on('end', () => resolve(data));
  });
}

function getPluginRoot() {
  const os = require('os');
  const repoStyleRoot = path.resolve(__dirname, '..', '..');
  const awEccHome = path.join(os.homedir(), '.aw-ecc');

  if (
    fs.existsSync(path.join(repoStyleRoot, 'package.json'))
    && fs.existsSync(path.join(repoStyleRoot, 'scripts', 'hooks'))
    && fs.existsSync(path.join(repoStyleRoot, '.cursor', 'hooks'))
  ) {
    return repoStyleRoot;
  }

  // Key on a file aw-ecc keeps shipping. The aw-usage telemetry scripts now
  // belong to the aw CLI (~/.aw/aw-usage) and will be removed from aw-ecc.
  if (fs.existsSync(path.join(awEccHome, 'scripts', 'hooks', 'session-start-rules-context.sh'))) {
    return awEccHome;
  }

  return path.resolve(__dirname, '..');
}

function transformToClaude(cursorInput, overrides = {}) {
  const server = cursorInput.server || cursorInput.mcp_server || '';
  const tool = cursorInput.tool || cursorInput.mcp_tool || '';
  const inferredToolName = cursorInput.tool_name
    || (server && tool ? `mcp__${server}__${tool}` : '');

  // Preserve original tool_input fields (skill, subagent_type, description, etc.)
  const originalToolInput = cursorInput.tool_input || {};

  return {
    tool_name: inferredToolName,
    server,
    tool,
    exit_code: cursorInput.exit_code,
    tool_input: {
      ...originalToolInput,
      command: cursorInput.command || cursorInput.args?.command || originalToolInput.command || '',
      file_path: cursorInput.path || cursorInput.file || cursorInput.args?.filePath || '',
      server,
      mcp_server: server,
      tool,
      mcp_tool: tool,
      ...overrides.tool_input,
    },
    tool_output: {
      output: cursorInput.output || cursorInput.result || '',
      ...overrides.tool_output,
    },
    tool_response: {
      exit_code: cursorInput.exit_code,
      output: cursorInput.output || cursorInput.result || '',
    },
    transcript_path: cursorInput.transcript_path || cursorInput.transcriptPath || cursorInput.session?.transcript_path || '',
    // beforeSubmitPrompt text, read by aw-usage-prompt-submit.js. Cursor's
    // attachments are not copied: they hold only always-applied rule files.
    prompt: cursorInput.prompt,
    // Cursor's tool-call id, the same in beforeReadFile and postToolUse for one
    // call. Kept as sent, including the newline inside it.
    tool_use_id: cursorInput.tool_use_id || undefined,
    // Cursor common schema fields surfaced at top level for buildEvent()
    generation_id: cursorInput.generation_id,
    conversation_id: cursorInput.conversation_id,
    workspace_roots: cursorInput.workspace_roots,
    model: cursorInput.model,
    user_email: cursorInput.user_email,
    cursor_version: cursorInput.cursor_version,
    status: cursorInput.status,
    reason: cursorInput.reason,
    // Token fields — Cursor sends these on afterAgentResponse and stop hooks
    input_tokens: cursorInput.input_tokens,
    output_tokens: cursorInput.output_tokens,
    cache_read_tokens: cursorInput.cache_read_tokens,
    cache_write_tokens: cursorInput.cache_write_tokens,
    // Subagent fields
    task: cursorInput.task,
    description: cursorInput.description,
    _cursor: {
      conversation_id: cursorInput.conversation_id,
      hook_event_name: cursorInput.hook_event_name,
      workspace_roots: cursorInput.workspace_roots,
      model: cursorInput.model,
    },
  };
}

function runManagedCommand(command, args, stdinData) {
  try {
    const stdout = execFileSync(command, args, {
      input: typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    return {
      stdout: stdout || '',
      stderr: '',
    };
  } catch (e) {
    if (e.status === 2) process.exit(2);

    return {
      stdout: typeof e.stdout === 'string' ? e.stdout : String(e.stdout || ''),
      stderr: typeof e.stderr === 'string' ? e.stderr : String(e.stderr || ''),
    };
  }
}

// The aw CLI (ghl-agentic-workspace) owns the aw-usage telemetry scripts and
// installs them to ~/.aw/aw-usage/{hooks,lib}. Prefer that copy; fall back to
// this repo's copy only while it still ships one.
function awUsageHome() {
  return path.join(require('os').homedir(), '.aw', 'aw-usage');
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

// The aw-usage scripts only work as a set: hooks load ../lib/, the v2 lib
// files load each other, lib/aw-usage-telemetry.js starts the sender from
// ../hooks/, and package.json carries the hook version. Use ~/.aw/aw-usage
// only when every file is there, so a partial install falls back to the
// self-contained aw-ecc copy instead of silently dropping telemetry.
// Keep in sync with AW_USAGE_HOOK_SCRIPTS, AW_USAGE_LIB_FILES and
// missingAwUsageFiles() in ghl-agentic-workspace libs/aw/aw-usage-wiring.mjs,
// which installs this folder.
const AW_USAGE_REQUIRED_FILES = [
  ['package.json'],
  ...[
    'aw-usage-prompt-submit.js',
    'aw-usage-post-tool-use.js',
    'aw-usage-post-tool-use-failure.js',
    'aw-usage-session-start.js',
    'aw-usage-stop.js',
    'aw-usage-telemetry-send.js',
    'aw-usage-commit-created.js',
  ].map(name => ['hooks', name]),
  ...[
    'aw-usage-telemetry.js',
    'aw-pricing.js',
    'aw-usage-envelope.js',
    'aw-usage-queue.js',
    'aw-usage-commands.js',
    'aw-usage-skill-source.js',
    'aw-usage-stage-events.js',
  ].map(name => ['lib', name]),
];

function awUsageInstalled() {
  const home = awUsageHome();
  return AW_USAGE_REQUIRED_FILES.every(parts => isFile(path.join(home, ...parts)));
}

function resolveAwUsageScript(scriptName) {
  if (awUsageInstalled()) {
    const installed = path.join(awUsageHome(), 'hooks', scriptName);
    if (isFile(installed)) return installed;
  }
  // The aw-ecc copy is self-contained, so it is a safe per-script fallback.
  const bundled = path.join(getPluginRoot(), 'scripts', 'hooks', scriptName);
  return isFile(bundled) ? bundled : null;
}

function resolveAwUsageLib(libName) {
  const libDir = awUsageInstalled()
    ? path.join(awUsageHome(), 'lib')
    : path.join(getPluginRoot(), 'scripts', 'lib');
  const libPath = path.join(libDir, libName);
  return isFile(libPath) ? libPath : null;
}

function runExistingHook(scriptName, stdinData) {
  const root = getPluginRoot();
  const candidates = String(scriptName).startsWith('aw-usage-')
    ? [resolveAwUsageScript(scriptName)].filter(Boolean)
    : [
      path.join(root, 'scripts', 'hooks', scriptName),
      path.join(root, 'hooks', scriptName),
    ];
  const scriptPath = candidates.find(candidate => fs.existsSync(candidate));
  if (!scriptPath) {
    if (process.env.AW_HOOK_DEBUG === '1') {
      process.stderr.write(`[aw] Cannot find hook script: ${scriptName}\n`);
    }
    return undefined;
  }
  return runManagedCommand('node', [scriptPath], stdinData);
}

function runManagedShellHook(relativeScriptPath, stdinData) {
  const root = getPluginRoot();
  const normalized = String(relativeScriptPath || '').replace(/\\/g, '/');
  const fallbackCandidates = [
    normalized,
    normalized.replace(/^\.cursor\//, ''),
    normalized.replace(/^scripts\//, ''),
    normalized.replace(/^hooks\//, ''),
    path.posix.join('.cursor', normalized),
    path.posix.join('scripts', normalized),
    path.posix.join('hooks', normalized),
  ];
  const scriptPath = fallbackCandidates
    .map(candidate => path.join(root, candidate))
    .find(candidate => fs.existsSync(candidate))
    || path.join(root, normalized);
  return runManagedCommand('bash', [scriptPath], stdinData);
}

function hookEnabled(hookId, allowedProfiles = ['standard', 'strict']) {
  const rawProfile = String(process.env.ECC_HOOK_PROFILE || 'standard').toLowerCase();
  const profile = ['minimal', 'standard', 'strict'].includes(rawProfile) ? rawProfile : 'standard';

  const disabled = new Set(
    String(process.env.ECC_DISABLED_HOOKS || '')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean)
  );

  if (disabled.has(String(hookId || '').toLowerCase())) {
    return false;
  }

  return allowedProfiles.includes(profile);
}

module.exports = {
  readStdin,
  getPluginRoot,
  resolveAwUsageScript,
  resolveAwUsageLib,
  transformToClaude,
  runExistingHook,
  runManagedShellHook,
  hookEnabled,
};
