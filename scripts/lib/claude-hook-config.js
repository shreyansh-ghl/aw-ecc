const fs = require('fs');
const path = require('path');

const { getClaudePhaseNames } = require('./aw-hook-contract');
const {
  getClaudeAwHookBaseSourceRelativePath,
} = require('./claude-aw-hook-files');

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
    {
      matcher: 'startup|resume|clear|compact',
      hooks: [
        {
          type: 'command',
          command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/ponytail-activate.js"',
          timeout: 5,
          statusMessage: 'Loading ponytail mode...',
        },
      ],
      description: 'Vendored ponytail: activate the lazy-first ruleset at session start',
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
    {
      hooks: [
        {
          type: 'command',
          command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/ponytail-mode-tracker.js"',
          timeout: 5,
          statusMessage: 'Tracking ponytail mode...',
        },
      ],
      description: 'Vendored ponytail: track /ponytail level switches per prompt',
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

  // Claude Code's plugin hooks.json parser accepts only `hooks` at the root and
  // `matcher`/`hooks` per entry.  `$schema` and `description` are settings.json
  // concepts — emitting them makes Claude Code warn "unknown keys ... ignored".
  // They stay in hooks.base.json as maintainer docs and are dropped here.
  for (const entries of Object.values(hooks)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) delete entry.description;
  }

  const config = { hooks };

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
