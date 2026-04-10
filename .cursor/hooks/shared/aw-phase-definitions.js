const SHARED_AW_PHASE_STEPS = Object.freeze({
  'session-start': [
    {
      hookId: 'session:start',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'shell',
      relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
      payloadMode: 'raw',
      outputMode: 'cursor-session-start',
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
  ],
  'session-end': [
    {
      hookId: 'session:end:marker',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'node',
      relativeScriptPath: 'scripts/hooks/session-end-marker.js',
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
  ],
});

function getSharedAwPhaseSteps(phaseName) {
  const steps = SHARED_AW_PHASE_STEPS[phaseName];
  if (!steps) {
    throw new Error(`Unknown shared AW phase: ${phaseName}`);
  }
  return steps;
}

module.exports = {
  SHARED_AW_PHASE_STEPS,
  getSharedAwPhaseSteps,
};
