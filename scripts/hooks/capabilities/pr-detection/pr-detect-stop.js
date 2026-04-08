#!/usr/bin/env node
/**
 * PR Detection Capability — Stop handler (DEPRECATED)
 *
 * PR detection is now integrated into telemetry-stop.js via extractArtifacts().
 * This hook is a no-op pass-through kept for phase definition compatibility.
 * It will be removed in a future phase definition cleanup.
 */

'use strict';

const MAX_STDIN = 1024 * 1024;
let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    raw += chunk.substring(0, MAX_STDIN - raw.length);
  }
});

process.stdin.on('end', () => {
  process.stdout.write(raw);
});
