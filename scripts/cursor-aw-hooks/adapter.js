#!/usr/bin/env node
/**
 * Cursor-to-Claude Code Hook Adapter
 * Transforms Cursor stdin JSON to Claude Code hook format,
 * then delegates to existing scripts/hooks/*.js
 */

const { execFileSync } = require('child_process');
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
  return path.resolve(__dirname, '..', '..');
}

function transformToClaude(cursorInput, overrides = {}) {
  const server = cursorInput.server || cursorInput.mcp_server || '';
  const tool = cursorInput.tool || cursorInput.mcp_tool || '';
  const inferredToolName = cursorInput.tool_name
    || (server && tool ? `mcp__${server}__${tool}` : '');

  return {
    tool_name: inferredToolName,
    server,
    tool,
    tool_input: {
      command: cursorInput.command || cursorInput.args?.command || '',
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
    transcript_path: cursorInput.transcript_path || cursorInput.transcriptPath || cursorInput.session?.transcript_path || '',
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
  const scriptPath = path.join(getPluginRoot(), 'scripts', 'hooks', scriptName);
  return runManagedCommand('node', [scriptPath], stdinData);
}

function runManagedShellHook(relativeScriptPath, stdinData) {
  const scriptPath = path.join(getPluginRoot(), relativeScriptPath);
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
