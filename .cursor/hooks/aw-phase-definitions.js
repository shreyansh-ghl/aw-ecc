#!/usr/bin/env node

const CURSOR_AW_PHASE_STEPS = {
  'session-start': [
    {
      hookId: 'session:start',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      scriptName: 'session-start.js',
    },
  ],
  'pre-compact': [
    {
      scriptName: 'pre-compact.js',
    },
  ],
  'session-end': [
    {
      hookId: 'session:end:marker',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      scriptName: 'session-end-marker.js',
    },
  ],
  stop: [
    {
      hookId: 'stop:check-console-log',
      allowedProfiles: ['standard', 'strict'],
      scriptName: 'check-console-log.js',
    },
    {
      hookId: 'stop:session-end',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      scriptName: 'session-end.js',
    },
    {
      hookId: 'stop:evaluate-session',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      scriptName: 'evaluate-session.js',
    },
    {
      hookId: 'stop:cost-tracker',
      allowedProfiles: ['minimal', 'standard', 'strict'],
      scriptName: 'cost-tracker.js',
    },
  ],
};

function getCursorAwPhaseSteps(phaseName) {
  const steps = CURSOR_AW_PHASE_STEPS[phaseName];
  if (!steps) {
    throw new Error(`Unknown Cursor AW phase: ${phaseName}`);
  }
  return steps;
}

module.exports = {
  CURSOR_AW_PHASE_STEPS,
  getCursorAwPhaseSteps,
};
