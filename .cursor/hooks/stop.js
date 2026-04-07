#!/usr/bin/env node
const { readStdin } = require('./adapter');
const { runCursorAwPhase } = require('./aw-phase-adapter');

readStdin().then(raw => {
  return runCursorAwPhase({
    raw,
    steps: [
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
  }).then(output => process.stdout.write(output));
}).catch(() => process.exit(0));
