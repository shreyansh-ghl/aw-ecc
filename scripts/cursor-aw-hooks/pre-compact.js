#!/usr/bin/env node
const { readStdin } = require('./adapter');
const { runNamedCursorAwPhase } = require('./aw-phase-adapter');

readStdin().then(raw => {
  return runNamedCursorAwPhase({
    phaseName: 'pre-compact',
    raw,
  }).then(output => process.stdout.write(output));
}).catch(() => process.exit(0));
