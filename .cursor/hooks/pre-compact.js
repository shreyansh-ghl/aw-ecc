#!/usr/bin/env node
const { readStdin } = require('./adapter');
const { runCursorAwPhase } = require('./aw-phase-adapter');

readStdin().then(raw => {
  return runCursorAwPhase({
    raw,
    steps: [
      {
        scriptName: 'pre-compact.js',
      },
    ],
  }).then(output => process.stdout.write(output));
}).catch(() => process.exit(0));
