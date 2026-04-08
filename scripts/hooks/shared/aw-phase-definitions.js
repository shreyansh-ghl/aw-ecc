const SHARED_AW_PHASE_STEPS = Object.freeze({
  'session-start': [
    {
      hookId: 'session:start',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'shell',
      relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
      payloadMode: 'raw',
    },
    {
      hookId: 'session-start:telemetry',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/capabilities/telemetry/telemetry-session-start.js',
      payloadMode: 'claude',
    },
  ],
  'user-prompt-submit': [
    {
      runner: 'shell',
      relativeScriptPath: '.cursor/hooks/shared/user-prompt-submit.sh',
      payloadMode: 'raw',
    },
  ],
  'pre-tool-use-shell': [
    {
      hookId: 'pre:bash:dev-server-block',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/pre-bash-dev-server-block.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'pre:bash:tmux-reminder',
      allowedProfiles: ['strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/pre-bash-tmux-reminder.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'pre:bash:git-push-reminder',
      allowedProfiles: ['strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/pre-bash-git-push-reminder.js',
      payloadMode: 'claude',
    },
  ],
  'pre-tool-use-mcp': [
    {
      hookId: 'pre:mcp-health-check',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/mcp-health-check.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'pre:mcp:audit-log',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/pre-mcp-log.js',
      payloadMode: 'raw',
    },
  ],
  'post-tool-use-shell': [
    {
      hookId: 'post:bash:pr-created',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-bash-pr-created.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'post:bash:build-complete',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-bash-build-complete.js',
      payloadMode: 'claude',
    },
  ],
  'post-tool-use-file-edit': [
    {
      hookId: 'post:quality-gate',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/quality-gate.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'post:edit:format',
      allowedProfiles: ['strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-edit-format.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'post:edit:typecheck',
      allowedProfiles: ['strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-edit-typecheck.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'post:edit:console-warn',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-edit-console-warn.js',
      payloadMode: 'claude',
    },
  ],
  'post-tool-use-mcp': [
    {
      hookId: 'post:mcp:audit-log',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/post-mcp-log.js',
      payloadMode: 'raw',
    },
  ],
  'pre-compact': [
    {
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/pre-compact.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'pre-compact:telemetry',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/capabilities/telemetry/telemetry-pre-compact.js',
      payloadMode: 'claude',
    },
  ],
  'session-end': [
    {
      hookId: 'session:end:marker',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/session-end-marker.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'session-end:telemetry',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/capabilities/telemetry/telemetry-session-end.js',
      payloadMode: 'claude',
    },
  ],
  stop: [
    {
      hookId: 'stop:check-console-log',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/check-console-log.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'stop:session-end',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/session-end.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'stop:evaluate-session',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/evaluate-session.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'stop:cost-tracker',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/cost-tracker.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'stop:telemetry',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/capabilities/telemetry/telemetry-stop.js',
      payloadMode: 'claude',
    },
    {
      hookId: 'stop:pr-detect',
      allowedProfiles: ['standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/capabilities/pr-detection/pr-detect-stop.js',
      payloadMode: 'claude',
    },
  ],
});

/**
 * Canonical string constants for all AW hook phase names.
 * Use these instead of raw string literals to get typo-safety and IDE
 * auto-complete in files that call runNamedCursorAwPhase() or equivalent.
 */
const PHASE_NAMES = Object.freeze({
  SESSION_START: 'session-start',
  USER_PROMPT_SUBMIT: 'user-prompt-submit',
  PRE_TOOL_USE_SHELL: 'pre-tool-use-shell',
  PRE_TOOL_USE_MCP: 'pre-tool-use-mcp',
  POST_TOOL_USE_SHELL: 'post-tool-use-shell',
  POST_TOOL_USE_FILE_EDIT: 'post-tool-use-file-edit',
  POST_TOOL_USE_MCP: 'post-tool-use-mcp',
  PRE_COMPACT: 'pre-compact',
  SESSION_END: 'session-end',
  STOP: 'stop',
});

function getSharedAwPhaseSteps(phaseName) {
  const steps = SHARED_AW_PHASE_STEPS[phaseName];
  if (!steps) {
    throw new Error(`Unknown shared AW phase: ${phaseName}`);
  }
  return steps;
}

module.exports = {
  PHASE_NAMES,
  SHARED_AW_PHASE_STEPS,
  getSharedAwPhaseSteps,
};
