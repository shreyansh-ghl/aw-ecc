const { getCursorMappedEventNames } = require('./aw-hook-contract');

function buildManagedCursorHookCommand(scriptFileName) {
  const scriptName = String(scriptFileName || '').replace(/\\/g, '/');
  const launcher = [
    "const fs=require('fs')",
    "const path=require('path')",
    "const os=require('os')",
    `const scriptName=${JSON.stringify(scriptName)}`,
    "const candidates=[path.join(process.cwd(), '.cursor', 'hooks', scriptName),path.join(os.homedir(), '.cursor', 'hooks', scriptName)]",
    "const target=candidates.find(candidate => fs.existsSync(candidate))",
    "if(!target) process.exit(0)",
    "require(target)",
  ].join(';');

  return `node -e ${JSON.stringify(launcher)}`;
}

function buildManagedCursorShellCommand(scriptFileName) {
  const scriptName = String(scriptFileName || '').replace(/\\/g, '/');
  // Simple fallback: project-level first, then home-level.
  // Previous version used triple-escaped quoting inside bash -lc that
  // silently failed when Cursor spawned the process (Bug #8).
  return `bash -c 'f="$PWD/.cursor/hooks/${scriptName}"; [ -f "$f" ] || f="$HOME/.cursor/hooks/${scriptName}"; exec bash "$f"'`;
}

const CURSOR_HOOK_ENTRIES = Object.freeze({
  sessionStart: [
    {
      command: buildManagedCursorShellCommand('session-start.sh'),
      event: 'sessionStart',
      description: 'Load previous context and detect environment',
    },
  ],
  sessionEnd: [
    {
      command: buildManagedCursorHookCommand('session-end.js'),
      event: 'sessionEnd',
      description: 'Persist session state and evaluate patterns',
    },
  ],
  beforeShellExecution: [
    {
      command: 'npx block-no-verify@1.1.2',
      event: 'beforeShellExecution',
      description: 'Block git hook-bypass flag to protect pre-commit, commit-msg, and pre-push hooks from being skipped',
    },
    {
      command: buildManagedCursorHookCommand('before-shell-execution.js'),
      event: 'beforeShellExecution',
      description: 'Tmux dev server blocker, tmux reminder, git push review',
    },
  ],
  afterShellExecution: [
    {
      command: buildManagedCursorHookCommand('after-shell-execution.js'),
      event: 'afterShellExecution',
      description: 'PR URL logging, build analysis',
    },
  ],
  afterFileEdit: [
    {
      command: buildManagedCursorHookCommand('after-file-edit.js'),
      event: 'afterFileEdit',
      description: 'Auto-format, TypeScript check, console.log warning',
    },
  ],
  beforeMCPExecution: [
    {
      command: buildManagedCursorHookCommand('before-mcp-execution.js'),
      event: 'beforeMCPExecution',
      description: 'MCP audit logging and untrusted server warning',
    },
  ],
  afterMCPExecution: [
    {
      command: buildManagedCursorHookCommand('after-mcp-execution.js'),
      event: 'afterMCPExecution',
      description: 'MCP result logging',
    },
  ],
  beforeReadFile: [
    {
      command: buildManagedCursorHookCommand('before-read-file.js'),
      event: 'beforeReadFile',
      description: 'Warn when reading sensitive files (.env, .key, .pem)',
    },
  ],
  beforeSubmitPrompt: [
    {
      command: buildManagedCursorShellCommand('before-submit-prompt.sh'),
      event: 'beforeSubmitPrompt',
      description: 'Detect secrets in prompts (sk-, ghp_, AKIA patterns)',
    },
  ],
  subagentStart: [
    {
      command: buildManagedCursorHookCommand('subagent-start.js'),
      event: 'subagentStart',
      description: 'Log agent spawning for observability',
    },
  ],
  subagentStop: [
    {
      command: buildManagedCursorHookCommand('subagent-stop.js'),
      event: 'subagentStop',
      description: 'Log agent completion',
    },
  ],
  postToolUse: [
    {
      command: buildManagedCursorHookCommand('post-tool-use.js'),
      event: 'postToolUse',
      description: 'Telemetry: skill_invoked detection for Read tool and other non-shell/edit/MCP tools',
    },
  ],
  postToolUseFailure: [
    {
      command: buildManagedCursorHookCommand('post-tool-use-failure.js'),
      event: 'postToolUseFailure',
      description: 'Telemetry: tool_error detection on tool failure/timeout/denial',
    },
  ],
  beforeTabFileRead: [
    {
      command: buildManagedCursorHookCommand('before-tab-file-read.js'),
      event: 'beforeTabFileRead',
      description: 'Block Tab from reading secrets (.env, .key, .pem, credentials)',
    },
  ],
  afterTabFileEdit: [
    {
      command: buildManagedCursorHookCommand('after-tab-file-edit.js'),
      event: 'afterTabFileEdit',
      description: 'Auto-format Tab edits',
    },
  ],
  preCompact: [
    {
      command: buildManagedCursorHookCommand('pre-compact.js'),
      event: 'preCompact',
      description: 'Save state before context compaction',
    },
  ],
  stop: [
    {
      command: buildManagedCursorHookCommand('stop.js'),
      event: 'stop',
      description: 'Console.log audit on all modified files',
    },
  ],
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCursorHookEntries() {
  const entries = clone(CURSOR_HOOK_ENTRIES);

  for (const eventName of getCursorMappedEventNames()) {
    if (!Array.isArray(entries[eventName]) || entries[eventName].length === 0) {
      throw new Error(`Cursor hook config is missing required AW-mapped event '${eventName}'`);
    }
  }

  return entries;
}

function buildCursorHookConfig() {
  return {
    version: 1,
    hooks: buildCursorHookEntries(),
  };
}

function serializeCursorHookConfig() {
  return `${JSON.stringify(buildCursorHookConfig(), null, 2)}\n`;
}

module.exports = {
  CURSOR_HOOK_ENTRIES,
  buildCursorHookEntries,
  buildCursorHookConfig,
  buildManagedCursorHookCommand,
  buildManagedCursorShellCommand,
  serializeCursorHookConfig,
};
