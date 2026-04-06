#!/usr/bin/env node
/**
 * Hook: session-stop-marker
 * Fires on every Stop event (after each agent response).
 *
 * Triggers memory extraction on every Stop. Simple and reliable —
 * no dependency on SessionEnd which may never fire.
 *
 * Cross-platform (Windows, macOS, Linux)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const MAX_STDIN = 64 * 1024;

/**
 * run() export for in-process execution via run-with-flags.js.
 */
function run(rawInput) {
  try {
    triggerExtract(rawInput);
  } catch (err) {
    console.error(`[stop-marker] Error: ${err.message}`);
  }
  return rawInput || '';
}

function triggerExtract(rawInput) {
  let input = {};
  try {
    input = JSON.parse(rawInput || '{}');
  } catch {
    return; // Nothing to extract without valid input
  }

  const transcriptPath = input.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return;

  const extractScript = path.join(__dirname, 'session-end-extract.js');
  if (!fs.existsSync(extractScript)) return;

  try {
    const child = spawn(process.execPath, [extractScript], {
      detached: true,
      stdio: ['pipe', 'ignore', 'ignore'],
      env: { ...process.env },
    });

    child.stdin.write(JSON.stringify({ transcript_path: transcriptPath }));
    child.stdin.end();
    child.unref();
  } catch (err) {
    console.error(`[stop-marker] Failed to spawn extraction: ${err.message}`);
  }
}

// CLI execution (when run directly via spawnSync)
if (require.main === module) {
  let stdinData = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    if (stdinData.length < MAX_STDIN) {
      stdinData += chunk.substring(0, MAX_STDIN - stdinData.length);
    }
  });

  process.stdin.on('end', () => {
    process.stdout.write(stdinData);
    try {
      triggerExtract(stdinData);
    } catch (err) {
      console.error(`[stop-marker] Error: ${err.message}`);
    }
    process.exit(0);
  });
}

module.exports = { run };
