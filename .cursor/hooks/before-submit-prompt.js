#!/usr/bin/env node
const { readStdin, runManagedShellHook, runExistingHook, transformToClaude } = require('./adapter');

function emitAwPromptReminder(raw) {
  const result = runManagedShellHook('scripts/hooks/shared/user-prompt-submit.sh', raw);
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.stdout) {
    process.stderr.write(result.stdout.endsWith('\n') ? result.stdout : `${result.stdout}\n`);
  }
}

function normalizeCursorPromptOutput(raw) {
  try {
    const payload = JSON.parse(raw);
    delete payload.hook_event_name;
    delete payload.tool_input;
    delete payload.tool_name;
    delete payload.tool_output;
    delete payload.tool_response;
    return JSON.stringify(payload);
  } catch (_error) {
    return '{}';
  }
}

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const prompt = input.prompt || input.content || input.message || '';
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{20,}/,       // OpenAI API keys
      /ghp_[a-zA-Z0-9]{36,}/,      // GitHub personal access tokens
      /AKIA[A-Z0-9]{16}/,          // AWS access keys
      /xox[bpsa]-[a-zA-Z0-9-]+/,   // Slack tokens
      /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, // Private keys
    ];
    for (const pattern of secretPatterns) {
      if (pattern.test(prompt)) {
        console.error('[ECC] WARNING: Potential secret detected in prompt!');
        console.error('[ECC] Remove secrets before submitting. Use environment variables instead.');
        break;
      }
    }
  } catch (_error) {
    // Best-effort prompt scanning should never block prompt submission.
  }
  try {
    emitAwPromptReminder(raw);
  } catch (_error) {
    // Reminder emission is advisory and should not break the prompt flow.
  }
  try {
    const claudePayload = transformToClaude(JSON.parse(raw));
    runExistingHook('aw-usage-prompt-submit.js', JSON.stringify(claudePayload));
  } catch (_error) {
    // Telemetry is best-effort and should not block prompt submission.
  }
  process.stdout.write(normalizeCursorPromptOutput(raw));
}).catch(() => process.exit(0));
