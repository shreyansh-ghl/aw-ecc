#!/usr/bin/env node
'use strict';

const MAX_STDIN = 1024 * 1024;
let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    const remaining = MAX_STDIN - raw.length;
    raw += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    const server = input.server || input.mcp_server || input.tool_input?.server || input.tool_input?.mcp_server || 'unknown';
    const tool = input.tool || input.mcp_tool || input.tool_input?.tool || input.tool_input?.mcp_tool || 'unknown';
    const success = input.error ? 'FAILED' : 'OK';
    console.error(`[ECC] MCP result: ${server}/${tool} - ${success}`);
  } catch {
    // ignore parse errors and pass through
  }

  process.stdout.write(raw);
});
