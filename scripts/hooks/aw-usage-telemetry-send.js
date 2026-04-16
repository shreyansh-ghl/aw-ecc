#!/usr/bin/env node
/**
 * Detached sender — receives a single usage telemetry event as argv[2],
 * POSTs it to the telemetry API, then exits.
 *
 * Spawned by sendAsync() in aw-usage-telemetry.js with { detached: true }.
 * This script runs independently after the parent hook process exits.
 */

'use strict';

const https = require('https');
const http = require('http');

const DEFAULT_URL = 'https://services.leadconnectorhq.com/agentic-workspace/api/telemetry/usage-events';
const TIMEOUT_MS = 10_000;

function post(url, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        // Drain response
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      },
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const eventJson = process.argv[2];
  if (!eventJson) {
    process.exit(0);
  }

  const url = process.env.AW_TELEMETRY_URL
    ? `${process.env.AW_TELEMETRY_URL.replace(/\/+$/, '')}/telemetry/usage-events`
    : DEFAULT_URL;

  try {
    await post(url, eventJson);
  } catch (err) {
    // Non-blocking — log and exit cleanly.
    process.stderr.write(`[aw-telemetry] send failed: ${err.message}\n`);
  }

  process.exit(0);
}

main();
