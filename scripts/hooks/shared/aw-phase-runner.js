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

  for (const step of steps) {
    if (!shouldRunStep(step, runtime)) {
      continue;
    }

    const payload = resolveStepPayload(step, raw, parsedInput, claudeInput);
    const result = await executeStep(runtime, step, payload);

    // Emit hook stdout to stderr so the model sees it as context.
    // Cursor and Claude Code surface stderr content to the LLM,
    // while stdout is reserved for the passthrough payload.
    if (result && result.stdout) {
      process.stderr.write(
        result.stdout.endsWith('\n') ? result.stdout : `${result.stdout}\n`,
      );
    }
    if (result && result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  return raw;
}

module.exports = {
  runSharedAwPhase,
};
