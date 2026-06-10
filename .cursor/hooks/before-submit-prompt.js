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
  return result.stdout || '';
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(String(value || '').trim().toLowerCase());
}

function extractAwMemoryRecall(advisoryText) {
  const text = String(advisoryText || '');
  const marker = 'AW Memory Recall';
  const index = text.indexOf(marker);
  if (index === -1) return '';
  return text.slice(index).trim();
}

function shouldInjectMemoryRecall(env, memoryRecall) {
  return Boolean(memoryRecall) && truthy(env?.AW_MEMORY_CURSOR_PROMPT_INJECTION);
}

function normalizeCursorPromptOutput(raw, options = {}) {
  try {
    const payload = JSON.parse(raw);
    const memoryRecall = options.memoryRecall || '';
    const env = options.env || process.env;
    delete payload.hook_event_name;
    delete payload.tool_input;
    delete payload.tool_name;
    delete payload.tool_output;
    delete payload.tool_response;
    if (shouldInjectMemoryRecall(env, memoryRecall)) {
      const prompt = payload.prompt || payload.content || payload.message || '';
      payload.prompt = prompt ? `${prompt}\n\n${memoryRecall}` : memoryRecall;
    }
    return JSON.stringify(payload);
  } catch (_error) {
    return '{}';
  }
}

function scanPromptForSecrets(raw) {
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
}

function sendUsageTelemetry(raw) {
  try {
    const claudePayload = transformToClaude(JSON.parse(raw));
    runExistingHook('aw-usage-prompt-submit.js', JSON.stringify(claudePayload));
  } catch (_error) {
    // Telemetry is best-effort and should not block prompt submission.
  }
}

function main() {
  readStdin().then(raw => {
    scanPromptForSecrets(raw);
    let advisoryText = '';
    try {
      advisoryText = emitAwPromptReminder(raw);
    } catch (_error) {
      // Reminder emission is advisory and should not break the prompt flow.
    }
    sendUsageTelemetry(raw);
    process.stdout.write(normalizeCursorPromptOutput(raw, {
      memoryRecall: extractAwMemoryRecall(advisoryText),
      env: process.env,
    }));
  }).catch(() => process.exit(0));
}

if (require.main === module) {
  main();
}

module.exports = {
  extractAwMemoryRecall,
  normalizeCursorPromptOutput,
  scanPromptForSecrets,
  shouldInjectMemoryRecall,
};
