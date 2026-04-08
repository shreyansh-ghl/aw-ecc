#!/usr/bin/env node
/**
 * Telemetry Capability — SessionEnd handler
 *
 * Fires on: SessionEnd (Cursor only; Claude and Codex do not support this event)
 * Purpose: Final flush of remaining unflushed entries + session duration.
 *
 * Network: Yes
 * Target latency: <15s
 */

'use strict';

const { readStdinJson, log } = require('../../../lib/utils');
const { getApiUrl } = require('../../../lib/telemetry-constants');
const {
  readUnflushedEntries,
  updateCheckpoint,
  aggregateEntries,
  readSessionMetadata,
  deleteSessionMetadata,
  pushToApi,
  enqueue,
  flushQueue,
  buildTelemetryHeaders,
  getSessionId,
  detectPlatform,
  detectPlatformVersion,
} = require('./telemetry-lib');

async function main() {
  const input = await readStdinJson({ timeoutMs: 3000 });

  const sessionId = getSessionId();
  const sessionMeta = readSessionMetadata(sessionId);

  // Read unflushed entries
  const { entries, checkpointFrom, checkpointTo } = readUnflushedEntries();

  // Calculate session duration
  let sessionDurationMs = null;
  if (sessionMeta?.start_ts) {
    const startTime = new Date(sessionMeta.start_ts).getTime();
    sessionDurationMs = Date.now() - startTime;
  }

  // Even if no unflushed entries, push the session-end event with duration
  const aggregated = entries.length > 0
    ? aggregateEntries(entries)
    : {
        tokens_used: 0, cost_usd: 0, cache_read_tokens: 0, cache_creation_tokens: 0,
        model: 'unknown', agents_used: [], skills_applied: [], mcp_tools_used: [],
        compaction_count: 0, pr_url: null, pr_number: null, pr_repo: null,
      };

  // Build API payload
  const payload = {
    shell_run_id: sessionId,
    session_id: sessionId,
    command: 'session',
    status: 'complete',
    branch: sessionMeta?.branch || 'unknown',
    model: aggregated.model,
    platform: sessionMeta?.platform || detectPlatform(),
    platform_version: sessionMeta?.platform_version || detectPlatformVersion(),
    project_hash: sessionMeta?.project_hash || null,
    tokens_used: aggregated.tokens_used,
    cost_usd: aggregated.cost_usd,
    cache_read_tokens: aggregated.cache_read_tokens,
    cache_creation_tokens: aggregated.cache_creation_tokens,
    session_duration_ms: sessionDurationMs,
    agents_used: aggregated.agents_used,
    skills_applied: aggregated.skills_applied,
    mcp_tools_used: aggregated.mcp_tools_used,
    compaction_count: sessionMeta?.compaction_count || 0,
    checkpoint_from: checkpointFrom,
    checkpoint_to: checkpointTo,
    pr_url: aggregated.pr_url,
    pr_number: aggregated.pr_number,
    pr_repo: aggregated.pr_repo,
  };

  const namespace = sessionMeta?.namespace || null;
  const headers = buildTelemetryHeaders(namespace);
  const apiUrl = getApiUrl();

  // Flush offline queue first
  await flushQueue(headers).catch(() => {});

  // Push final data
  const endpoint = '/usage-telemetry/ingest';
  const ok = await pushToApi(`${apiUrl}${endpoint}`, payload, headers);

  if (ok) {
    if (checkpointTo > checkpointFrom) {
      updateCheckpoint(sessionId, checkpointTo);
    }
    log(`[Telemetry:SessionEnd] Final flush complete (duration: ${sessionDurationMs ? Math.round(sessionDurationMs / 1000) + 's' : 'unknown'}, $${aggregated.cost_usd})`);
  } else {
    enqueue(payload, endpoint);
    log(`[Telemetry:SessionEnd] API push failed — queued for retry`);
  }

  // Clean up session metadata file
  deleteSessionMetadata(sessionId);

  // Pass stdin through
  process.stdout.write(JSON.stringify(input));
}

main().catch(err => {
  log(`[Telemetry:SessionEnd] Error: ${err.message}`);
  process.exit(0);
});
