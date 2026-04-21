const { getCodexPhaseNames } = require('./aw-hook-contract');

const GENERATED_AW_HOOKS = Object.freeze({
  SessionStart: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'bash "$HOME/.codex/hooks/aw-session-start.sh"',
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
          command: 'bash "$HOME/.codex/hooks/aw-user-prompt-submit.sh"',
        },
      ],
      description: 'Emit Codex prompt telemetry and inject compact AW routing reminders on each prompt',
    },
  ],
  PreToolUse: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'bash "$HOME/.codex/hooks/aw-pre-tool-use.sh"',
        },
      ],
      description: 'Reserved AW pre-tool-use phase for Codex home installs',
    },
  ],
  PostToolUse: [
    {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: 'bash "$HOME/.codex/hooks/aw-post-tool-use.sh"',
        },
      ],
      description: 'Emit Codex post-tool-use telemetry for supported Bash-backed events',
    },
  ],
  Stop: [
    {
      hooks: [
        {
          type: 'command',
          command: 'bash "$HOME/.codex/hooks/aw-stop.sh"',
        },
      ],
      description: 'Emit Codex stop telemetry for response_completed events',
    },
  ],
});

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildCodexHookConfig() {
  const hooks = cloneJson(GENERATED_AW_HOOKS);

  for (const phaseName of getCodexPhaseNames()) {
    if (!Array.isArray(hooks[phaseName]) || hooks[phaseName].length === 0) {
      throw new Error(`Codex hook config is missing required AW phase '${phaseName}'`);
    }
  }

  return { hooks };
}

function serializeCodexHookConfig() {
  return `${JSON.stringify(buildCodexHookConfig(), null, 2)}\n`;
}

module.exports = {
  GENERATED_AW_HOOKS,
  buildCodexHookConfig,
  serializeCodexHookConfig,
};
