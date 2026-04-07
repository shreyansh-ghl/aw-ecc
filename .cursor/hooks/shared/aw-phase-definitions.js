const SHARED_AW_PHASE_STEPS = Object.freeze({
  'session-start': [
    {
      hookId: 'session:start',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      runner: 'shell',
      relativeScriptPath: '.cursor/hooks/shared/session-start.sh',
      payloadMode: 'raw',
    },
  ],
  'user-prompt-submit': [
    {
      runner: 'shell',
      relativeScriptPath: '.cursor/hooks/shared/user-prompt-submit.sh',
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
