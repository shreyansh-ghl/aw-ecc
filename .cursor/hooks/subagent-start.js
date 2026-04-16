#!/usr/bin/env node
const { readStdin, transformToClaude, runExistingHook } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    // Cursor subagentStart payload fields (from docs):
    // subagent_id, subagent_type, task, parent_conversation_id, subagent_model, is_parallel_worker
    const agentType = input.subagent_type || 'general-purpose';
    const task = input.task || '';
    console.error(`[ECC] Agent spawned: ${agentType} (${task.slice(0, 80)})`);

    // Dispatch agent_spawned telemetry
    const claudePayload = transformToClaude(input);
    claudePayload.tool_name = 'Agent';
    claudePayload.tool_input = {
      ...claudePayload.tool_input,
      subagent_type: agentType,
      description: task.slice(0, 200),
      subagent_id: input.subagent_id || '',
      subagent_model: input.subagent_model || '',
      is_parallel_worker: input.is_parallel_worker || false,
    };
    runExistingHook('aw-usage-post-tool-use.js', JSON.stringify(claudePayload));
  } catch {
    // Telemetry is best-effort
  }
  process.stdout.write(raw);
}).catch(() => process.exit(0));
