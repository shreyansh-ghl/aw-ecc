/**
 * Resolve the AW MCP base URL from environment or default.
 *
 * Priority order:
 * 1. AW_MCP_URL env var (explicit override, must include full path)
 * 2. GHL_MCP_URL env var + /agentic-workspace/mcp suffix
 * 3. Default local URL (MCP server runs locally)
 */
'use strict';

const DEFAULT_MCP_URL = 'http://localhost:3100/agentic-workspace/mcp';
const MCP_SUFFIX = '/agentic-workspace/mcp';

function resolveMcpUrl() {
  if (process.env.AW_MCP_URL) return process.env.AW_MCP_URL;
  if (process.env.GHL_MCP_URL) return `${process.env.GHL_MCP_URL}${MCP_SUFFIX}`;
  return DEFAULT_MCP_URL;
}

module.exports = { resolveMcpUrl };
