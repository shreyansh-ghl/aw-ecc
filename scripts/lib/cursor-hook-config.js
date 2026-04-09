const { getCursorMappedEventNames } = require('./aw-hook-contract');

function buildCursorRootAwareShellCommand(scriptName) {
  return `bash -lc 'exec bash "\${CURSOR_PLUGIN_ROOT:-$HOME/.cursor}/hooks/${scriptName}"'`;
}

function buildCursorRootAwareNodeCommand(scriptName) {
  return `bash -lc 'exec node "\${CURSOR_PLUGIN_ROOT:-$HOME/.cursor}/hooks/${scriptName}"'`;
}

const CURSOR_HOOK_ENTRIES = Object.freeze({
  sessionStart: [
    {
      command: buildCursorRootAwareShellCommand('session-start.sh'),
      event: 'sessionStart',
      description: 'Load AW routing context at session start',
    },
  ],
  sessionEnd: [
    {
      command: buildCursorRootAwareNodeCommand('session-end.js'),
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
      command: buildCursorRootAwareNodeCommand('before-shell-execution.js'),
      event: 'beforeShellExecution',
      description: 'Tmux dev server blocker, tmux reminder, git push review',
    },
  ],
  afterShellExecution: [
    {
      command: buildCursorRootAwareNodeCommand('after-shell-execution.js'),
      event: 'afterShellExecution',
      description: 'PR URL logging, build analysis',
    },
  ],
  afterFileEdit: [
    {
      command: buildCursorRootAwareNodeCommand('after-file-edit.js'),
      event: 'afterFileEdit',
      description: 'Auto-format, TypeScript check, console.log warning',
    },
  ],
  beforeMCPExecution: [
    {
      command: buildCursorRootAwareNodeCommand('before-mcp-execution.js'),
      event: 'beforeMCPExecution',
      description: 'MCP audit logging and untrusted server warning',
    },
  ],
  afterMCPExecution: [
    {
      command: buildCursorRootAwareNodeCommand('after-mcp-execution.js'),
      event: 'afterMCPExecution',
      description: 'MCP result logging',
    },
  ],
  beforeReadFile: [
    {
      command: buildCursorRootAwareNodeCommand('before-read-file.js'),
      event: 'beforeReadFile',
      description: 'Warn when reading sensitive files (.env, .key, .pem)',
    },
  ],
  beforeSubmitPrompt: [
    {
      command: buildCursorRootAwareShellCommand('before-submit-prompt.sh'),
      event: 'beforeSubmitPrompt',
      description: 'Inject compact AW routing and rule reminders on each prompt',
    },
  ],
  subagentStart: [
    {
      command: buildCursorRootAwareNodeCommand('subagent-start.js'),
      event: 'subagentStart',
      description: 'Log agent spawning for observability',
    },
  ],
  subagentStop: [
    {
      command: buildCursorRootAwareNodeCommand('subagent-stop.js'),
      event: 'subagentStop',
      description: 'Log agent completion',
    },
  ],
  beforeTabFileRead: [
    {
      command: buildCursorRootAwareNodeCommand('before-tab-file-read.js'),
      event: 'beforeTabFileRead',
      description: 'Block Tab from reading secrets (.env, .key, .pem, credentials)',
    },
  ],
  afterTabFileEdit: [
    {
      command: buildCursorRootAwareNodeCommand('after-tab-file-edit.js'),
      event: 'afterTabFileEdit',
      description: 'Auto-format Tab edits',
    },
  ],
  preCompact: [
    {
      command: buildCursorRootAwareNodeCommand('pre-compact.js'),
      event: 'preCompact',
      description: 'Save state before context compaction',
    },
  ],
  stop: [
    {
      command: buildCursorRootAwareNodeCommand('stop.js'),
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
  buildCursorRootAwareNodeCommand,
  buildCursorRootAwareShellCommand,
  serializeCursorHookConfig,
};
