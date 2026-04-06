'use strict';

const { resolveMcpUrl } = require('./mcp-url');

/**
 * Resolve the telemetry endpoint from the MCP URL.
 * MCP URL:       .../agentic-workspace/mcp
 * Telemetry URL: .../agentic-workspace/api/telemetry/memory-events
 */
function resolveTelemetryUrl() {
  const mcpUrl = resolveMcpUrl();
  return mcpUrl.replace(/\/mcp$/, '/api/telemetry/memory-events');
}

/**
 * Fire-and-forget: send a memory telemetry event to the API server.
 * Never throws — telemetry must not interfere with hook execution.
 */
async function emitMemoryTelemetry(event, data, opts = {}) {
  try {
    const url = resolveTelemetryUrl();
    const payload = {
      event,
      data: data ?? {},
      source: opts.source ?? null,
      machine_id: opts.machine_id ?? null,
      namespace: opts.namespace ?? null,
      repo_slug: opts.repo_slug ?? null,
      duration_ms: opts.duration_ms ?? null,
    };

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Swallow — telemetry must never break hooks
  }
}

module.exports = { emitMemoryTelemetry, resolveTelemetryUrl };
