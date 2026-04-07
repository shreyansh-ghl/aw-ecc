const fs = require('fs');
const path = require('path');

const { getClaudePhaseNames } = require('./aw-hook-contract');
const {
  getClaudeAwHookBaseSourceRelativePath,
} = require('./claude-aw-hook-files');

const DEFAULT_SCHEMA = 'https://json.schemastore.org/claude-code-settings.json';
const GENERATED_AW_HOOKS = Object.freeze({
  SessionStart: [
    {
      matcher: 'startup|clear|compact',
      hooks: [
        {
          type: 'command',
          command: 'bash -lc \'exec bash "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/hooks/session-start"\'',
        },
      ],
      description: 'Load AW routing context at session start',
    },
  ],
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: 'command',
          command: 'bash -lc \'exec bash "${CLAUDE_PLUGIN_ROOT:-$HOME/.claude}/scripts/hooks/session-start-rules-context.sh"\'',
        },
      ],
      description: 'Inject compact AW routing and rule reminders on each prompt',
    },
  ],
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function readClaudeHookBase(repoRoot = path.join(__dirname, '../..')) {
  const sourcePath = path.join(repoRoot, getClaudeAwHookBaseSourceRelativePath());
  return JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
}

function buildClaudeHookConfig(options = {}) {
  const baseConfig = readClaudeHookBase(options.repoRoot);
  const hooks = cloneJson(baseConfig.hooks || {});

  for (const [eventName, entries] of Object.entries(GENERATED_AW_HOOKS)) {
    hooks[eventName] = cloneJson(entries);
  }

  const config = {
    $schema: baseConfig.$schema || DEFAULT_SCHEMA,
    hooks,
  };

  for (const phaseName of getClaudePhaseNames()) {
    if (!Array.isArray(config.hooks[phaseName]) || config.hooks[phaseName].length === 0) {
      throw new Error(`Claude hook config is missing required AW phase '${phaseName}'`);
    }
  }

  return config;
}

function serializeClaudeHookConfig(options = {}) {
  return `${JSON.stringify(buildClaudeHookConfig(options), null, 2)}\n`;
}

module.exports = {
  GENERATED_AW_HOOKS,
  buildClaudeHookConfig,
  readClaudeHookBase,
  serializeClaudeHookConfig,
};
