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

  if (fs.existsSync(path.join(awEccHome, 'scripts', 'lib', 'aw-usage-telemetry.js'))) {
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

function runExistingHook(scriptName, stdinData) {
  const root = getPluginRoot();
  const candidates = [
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
  transformToClaude,
  runExistingHook,
  runManagedShellHook,
  hookEnabled,
};
