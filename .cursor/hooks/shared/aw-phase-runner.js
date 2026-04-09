function shouldRunStep(step, runtime) {
  if (!step.hookId) {
    return true;
  }

  return runtime.hookEnabled(step.hookId, step.allowedProfiles || ['standard', 'strict']);
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

function executeStep(runtime, step, payload) {
  if (step.runner === 'shell') {
    return runtime.runManagedShellHook(step.relativeScriptPath, payload);
  }

  return runtime.runManagedNodeHook(step.relativeScriptPath, payload);
}

function formatCursorSessionStartOutput(stdout, fallbackRaw) {
  if (typeof stdout !== 'string' || stdout.trim() === '') {
    return fallbackRaw;
  }

  try {
    const payload = JSON.parse(stdout);
    const additionalContext = payload?.hookSpecificOutput?.additionalContext
      || payload?.additional_context;

    if (typeof additionalContext === 'string' && additionalContext.trim() !== '') {
      return `${JSON.stringify({ additional_context: additionalContext }, null, 2)}\n`;
    }
  } catch {}

  return fallbackRaw;
}

function resolveStepOutput(step, execution, fallbackRaw) {
  if (!execution) {
    return null;
  }

  switch (step.outputMode) {
    case 'cursor-session-start':
      return formatCursorSessionStartOutput(execution.stdout, fallbackRaw);
    default:
      return null;
  }
}

async function runSharedAwPhase({ raw, steps, deps = {} }) {
  const runtime = {
    transformToClaude: deps.transformToClaude,
    runManagedNodeHook: deps.runManagedNodeHook,
    runManagedShellHook: deps.runManagedShellHook,
    hookEnabled: deps.hookEnabled,
  };

  let parsedInput = {};
  try {
    parsedInput = JSON.parse(raw || '{}');
  } catch {
    return raw;
  }

  const needsClaudeInput = steps.some(step => (step.payloadMode || 'claude') === 'claude');
  const claudeInput = needsClaudeInput ? runtime.transformToClaude(parsedInput) : null;
  let result = raw;

  for (const step of steps) {
    if (!shouldRunStep(step, runtime)) {
      continue;
    }

    const payload = resolveStepPayload(step, raw, parsedInput, claudeInput);
    const execution = await executeStep(runtime, step, payload);
    const nextResult = resolveStepOutput(step, execution, raw);
    if (typeof nextResult === 'string') {
      result = nextResult;
    }
  }

  return result;
}

module.exports = {
  runSharedAwPhase,
};
