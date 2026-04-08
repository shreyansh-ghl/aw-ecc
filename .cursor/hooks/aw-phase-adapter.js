#!/usr/bin/env node

const {
  transformToClaude,
  runExistingHook,
  runManagedShellHook,
  hookEnabled,
} = require('./adapter');
const { getSharedAwPhaseSteps: getCursorAwPhaseSteps } = require('./shared/aw-phase-definitions');
const { runSharedAwPhase } = require('./shared/aw-phase-runner');

function runManagedNodeHook(relativeScriptPath, payload) {
  const scriptName = String(relativeScriptPath || '')
    .replace(/^scripts\/hooks\//, '')
    .replace(/^\.cursor\/hooks\//, '');
  return runExistingHook(scriptName, payload);
}

async function runCursorAwPhase({ raw, steps, deps = {} }) {
  return runSharedAwPhase({
    raw,
    steps,
    deps: {
      transformToClaude: deps.transformToClaude || transformToClaude,
      runManagedNodeHook: deps.runManagedNodeHook || runManagedNodeHook,
      runManagedShellHook: deps.runManagedShellHook || runManagedShellHook,
      hookEnabled: deps.hookEnabled || hookEnabled,
    },
  });
}

function runNamedCursorAwPhase({ phaseName, raw, deps = {} }) {
  return runCursorAwPhase({
    raw,
    steps: getCursorAwPhaseSteps(phaseName),
    deps,
  });
}

module.exports = {
  runCursorAwPhase,
  runNamedCursorAwPhase,
};
