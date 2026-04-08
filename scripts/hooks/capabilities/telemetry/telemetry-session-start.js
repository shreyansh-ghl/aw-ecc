#!/usr/bin/env node
/**
 * Telemetry Capability — SessionStart handler
 *
 * Fires on: SessionStart (Claude, Cursor, Codex)
 * Purpose: Ensure ~/.aw/telemetry/ dir exists. Flush any stale queue entries
 *          from prior sessions. Refresh OpenRouter pricing cache.
 *
 * Network: Stale flush only + pricing fetch (async, non-blocking)
 * Target latency: <100ms
 */

'use strict';

const { readStdinJson, log } = require('../../../lib/utils');
const { fetchAndCachePricing } = require('../../../lib/telemetry-constants');
const {
  ensureTelemetryDir,
  readQueue,
  flushQueueToApi,
  getNamespace,
  buildTelemetryHeaders,
} = require('./telemetry-lib');

async function main() {
  const input = await readStdinJson({ timeoutMs: 3000 });

  ensureTelemetryDir();

  // Flush any stale queue entries from prior sessions
  const staleEntries = readQueue();
  if (staleEntries.length > 0) {
    const namespace = getNamespace();
    const headers = buildTelemetryHeaders(namespace);

    flushQueueToApi(headers).then(result => {
      if (result.flushed > 0) {
        log(`[Telemetry:SessionStart] Flushed ${result.flushed} stale queue entries`);
      }
    }).catch(() => {
      // Non-fatal — entries stay for next flush
    });
  }

  // Fire-and-forget: fetch fresh pricing from OpenRouter
  fetchAndCachePricing().catch(() => {
    // Silently ignore — fallback pricing will be used
  });

  // Pass stdin through
  process.stdout.write(JSON.stringify(input));
}

main().catch(err => {
  log(`[Telemetry:SessionStart] Error: ${err.message}`);
  process.exit(0);
});
