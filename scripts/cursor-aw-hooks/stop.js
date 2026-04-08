#!/usr/bin/env node
const { readStdin } = require('./adapter');
const { runNamedCursorAwPhase } = require('./aw-phase-adapter');
const { PHASE_NAMES } = require('./shared/aw-phase-definitions');

readStdin().then(raw => {
  return runNamedCursorAwPhase({
    phaseName: PHASE_NAMES.STOP,
    raw,
  }).then(output => process.stdout.write(output));
}).catch(() => process.exit(0));
