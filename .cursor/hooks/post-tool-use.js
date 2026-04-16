#!/usr/bin/env node
/**
 * Cursor postToolUse hook — fires after ALL tool completions.
 *
 * Shell/Edit/MCP are already handled by afterShellExecution, afterFileEdit,
 * afterMCPExecution via the phase adapter. This handler covers tools those
 * miss — primarily Read (for skill_invoked detection).
 */
const { readStdin, transformToClaude, runExistingHook } = require('./adapter');

// Tools already covered by specific after* hooks — skip to avoid duplicates
const COVERED_TOOLS = new Set([
  'shell', 'bash', 'terminal',           // afterShellExecution
  'edit', 'write', 'file_edit',          // afterFileEdit
  'mcp', 'mcp_tool',                     // afterMCPExecution
]);

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const toolName = (input.tool_name || '').toLowerCase();

    // Skip tools already covered by specific hooks
    if (COVERED_TOOLS.has(toolName)) {
      process.stdout.write(raw);
      return;
    }

    // Transform and route to the shared telemetry handler
    const claudePayload = transformToClaude(input);
    claudePayload.tool_name = input.tool_name || 'Read';
    claudePayload.tool_input = {
      ...claudePayload.tool_input,
      file_path: input.tool_input?.file_path || input.tool_input?.path || '',
    };
    runExistingHook('aw-usage-post-tool-use.js', JSON.stringify(claudePayload));
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
