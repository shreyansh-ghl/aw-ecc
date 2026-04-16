#!/usr/bin/env node
const { readStdin, transformToClaude, runExistingHook } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const agent = input.agent_name || input.agent || 'unknown';
    console.error(`[ECC] Agent spawned: ${agent}`);
  } catch {}
  // Dispatch agent_spawned telemetry (Gap 4 fix)
  try {
    const parsed = JSON.parse(raw);
    const claudePayload = transformToClaude(parsed);
    // Set tool_name to Agent so the telemetry hook detects it
    claudePayload.tool_name = 'Agent';
    claudePayload.tool_input = {
      ...claudePayload.tool_input,
      subagent_type: parsed.agent_type || parsed.subagent_type || 'general-purpose',
      description: parsed.description || parsed.agent_name || parsed.agent || '',
    };
    runExistingHook('aw-usage-post-tool-use.js', JSON.stringify(claudePayload));
  } catch {
    // Telemetry is best-effort
  }
  process.stdout.write(raw);
}).catch(() => process.exit(0));
