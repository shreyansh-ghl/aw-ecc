#!/usr/bin/env node
const { readStdin } = require('./adapter');
const { runCursorAwPhase } = require('./aw-phase-adapter');

readStdin().then(raw => {
  return runCursorAwPhase({
    raw,
    steps: [
      {
        hookId: 'session:end:marker',
        allowedProfiles: ['minimal', 'standard', 'strict'],
        scriptName: 'session-end-marker.js',
      },
    ],
  }).then(output => process.stdout.write(output));
}).catch(() => process.exit(0));
