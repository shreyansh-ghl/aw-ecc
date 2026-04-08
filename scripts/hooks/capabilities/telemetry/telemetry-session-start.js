#!/usr/bin/env node
/**
 * Telemetry Capability — SessionStart handler
 *
 * Fires on: SessionStart (Claude, Cursor, Codex)
 * Purpose: Write session metadata to ~/.aw/telemetry/session-{id}.json
 *          and fetch fresh pricing from OpenRouter (async, non-blocking).
 *
 * Network: Yes (pricing fetch only — async, non-critical)
 * Target latency: <50ms for metadata write; pricing fetch is fire-and-forget
 */

'use strict';

const { readStdinJson, log } = require('../../../lib/utils');
const { fetchAndCachePricing } = require('../../../lib/telemetry-constants');
const {
  ensureTelemetryDir,
  writeSessionMetadata,
  detectPlatform,
  detectPlatformVersion,
  getProjectHash,
  getNamespace,
  getSessionId,
} = require('./telemetry-lib');

const { runCommand } = require('../../../lib/utils');

async function main() {
  const input = await readStdinJson({ timeoutMs: 3000 });

  const sessionId = getSessionId();
  const now = new Date().toISOString();

  // Get git branch
  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD');
  const branch = branchResult.success ? branchResult.output : 'unknown';

  ensureTelemetryDir();

  const metadata = {
    session_id: sessionId,
    branch,
    project_hash: getProjectHash(),
    platform: detectPlatform(),
    platform_version: detectPlatformVersion(),
    namespace: getNamespace(),
    start_ts: now,
    compaction_count: 0,
  };

  writeSessionMetadata(sessionId, metadata);

  // Fire-and-forget: fetch fresh pricing from OpenRouter.
  // This runs async and does not block the hook.
  fetchAndCachePricing().catch(() => {
    // Silently ignore — fallback pricing will be used
  });

  // Pass stdin through (transparent to the hook pipeline)
  process.stdout.write(JSON.stringify(input));
}

main().catch(err => {
  log(`[Telemetry:SessionStart] Error: ${err.message}`);
  process.exit(0); // Never fail the hook
});
