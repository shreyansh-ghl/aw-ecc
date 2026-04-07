#!/usr/bin/env node

const {
  transformToClaude,
  runExistingHook,
  hookEnabled,
} = require('./adapter');

function shouldRunStep(step, deps) {
  if (!step.hookId) {
    return true;
  }

  return deps.hookEnabled(step.hookId, step.allowedProfiles || ['standard', 'strict']);
}

function resolveStepPayload(step, raw, parsedInput, claudeInput) {
  switch (step.payloadMode) {
    case 'raw':
      return raw;
    case 'parsed':
      return parsedInput;
    case 'claude':
    default:
      return claudeInput;
  }
}

async function runCursorAwPhase({ raw, steps, deps = {} }) {
  const runtime = {
    transformToClaude: deps.transformToClaude || transformToClaude,
    runExistingHook: deps.runExistingHook || runExistingHook,
    hookEnabled: deps.hookEnabled || hookEnabled,
  };

  let parsedInput = {};
  try {
    parsedInput = JSON.parse(raw || '{}');
  } catch {
    return raw;
  }

  const needsClaudeInput = steps.some(step => (step.payloadMode || 'claude') === 'claude');
  const claudeInput = needsClaudeInput ? runtime.transformToClaude(parsedInput) : null;

  for (const step of steps) {
    if (!shouldRunStep(step, runtime)) {
      continue;
    }

    const payload = resolveStepPayload(step, raw, parsedInput, claudeInput);
    await runtime.runExistingHook(step.scriptName, payload);
  }

  return raw;
}

module.exports = {
  runCursorAwPhase,
};
