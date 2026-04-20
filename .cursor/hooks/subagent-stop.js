#!/usr/bin/env node
const { readStdin, transformToClaude } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const agent = input.agent_name || input.agent || 'unknown';
    console.error(`[ECC] Agent completed: ${agent}`);

    // Usage telemetry — Cursor-only rich agent_completed event.
    try {
      const { buildEvent, sendAsync } = require('../../scripts/lib/aw-usage-telemetry');
      const claudeInput = transformToClaude(input);
      sendAsync(buildEvent(claudeInput, 'agent_completed', {
        agent_type: input.subagent_type || input.agent_name || agent,
        status: input.status || 'unknown',
        duration_ms: input.duration_ms || null,
        tool_call_count: input.tool_call_count || null,
        modified_files: input.modified_files || [],
      }));
    } catch {
      // Telemetry is non-blocking.
    }
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
