#!/usr/bin/env node
/**
 * Telemetry Capability — PreCompact handler
 *
 * Fires on: PreCompact (Claude + Cursor only; Codex does not support this event)
 * Purpose: Heartbeat flush — aggregate unflushed cost entries and POST to API.
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
  writeSessionMetadata,
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

  if (entries.length === 0) {
    // Nothing to flush — still pass through
    process.stdout.write(JSON.stringify(input));
    return;
  }

  // Aggregate
  const aggregated = aggregateEntries(entries);

  // Build API payload
  const payload = {
    shell_run_id: sessionId,
    session_id: sessionId,
    command: 'session',
    status: 'active',
    branch: sessionMeta?.branch || 'unknown',
    model: aggregated.model,
    platform: sessionMeta?.platform || detectPlatform(),
    platform_version: sessionMeta?.platform_version || detectPlatformVersion(),
    project_hash: sessionMeta?.project_hash || null,
    tokens_used: aggregated.tokens_used,
    cost_usd: aggregated.cost_usd,
    cache_read_tokens: aggregated.cache_read_tokens,
    cache_creation_tokens: aggregated.cache_creation_tokens,
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

  // Flush offline queue first (drain any previously failed items)
  await flushQueue(headers).catch(() => {});

  // Push current data
  const endpoint = '/usage-telemetry/ingest';
  const ok = await pushToApi(`${apiUrl}${endpoint}`, payload, headers);

  if (ok) {
    updateCheckpoint(sessionId, checkpointTo);
    log(`[Telemetry:PreCompact] Flushed entries ${checkpointFrom + 1}-${checkpointTo} (${entries.length} entries, $${aggregated.cost_usd})`);
  } else {
    // Queue for offline retry
    enqueue(payload, endpoint);
    log(`[Telemetry:PreCompact] API push failed — queued for retry`);
  }

  // Update compaction count in session metadata
  if (sessionMeta) {
    sessionMeta.compaction_count = (sessionMeta.compaction_count || 0) + 1;
    writeSessionMetadata(sessionId, sessionMeta);
  }

  // Pass stdin through
  process.stdout.write(JSON.stringify(input));
}

main().catch(err => {
  log(`[Telemetry:PreCompact] Error: ${err.message}`);
  process.exit(0);
});
