#!/usr/bin/env node
/**
 * Telemetry Capability — SessionEnd handler
 *
 * Fires on: SessionEnd (Cursor only; Claude and Codex do not support this event)
 * Purpose: Simple flush trigger — if queue has pending entries, batch POST to API.
 *
 * Network: Yes (queue flush)
 * Target latency: <5s
 */

'use strict';

const { readStdinJson, log } = require('../../../lib/utils');
const {
  readQueue,
  flushQueueToApi,
  getNamespace,
  buildTelemetryHeaders,
} = require('./telemetry-lib');

async function main() {
  const input = await readStdinJson({ timeoutMs: 3000 });

  // Flush pending queue entries
  const entries = readQueue();
  if (entries.length > 0) {
    const namespace = getNamespace();
    const headers = buildTelemetryHeaders(namespace);

    const result = await flushQueueToApi(headers);
    if (result.flushed > 0) {
      log(`[Telemetry:SessionEnd] Flushed ${result.flushed} prompt(s) to API`);
    } else if (result.failed) {
      log(`[Telemetry:SessionEnd] Flush failed — entries remain in queue for retry`);
    }
  }

  // Pass stdin through
  process.stdout.write(JSON.stringify(input));
}

main().catch(err => {
  log(`[Telemetry:SessionEnd] Error: ${err.message}`);
  process.exit(0);
});
