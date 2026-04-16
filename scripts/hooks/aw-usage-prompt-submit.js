#!/usr/bin/env node
/**
 * Usage telemetry — UserPromptSubmit hook.
 *
 * Emits prompt_submitted as a boundary marker.
 * No matchers on any harness — always fires.
 *
 * Outputs {} on stdout.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildEvent, sendAsync } = require('../lib/aw-usage-telemetry');

const MAX_STDIN = 1024 * 1024;
let raw = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    raw += chunk.substring(0, MAX_STDIN - raw.length);
  }
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);

    // Dedup: Cursor fires beforeSubmitPrompt twice per prompt (~100ms apart).
    // Use exclusive file create (wx) as an atomic lock — second process fails.
    const sessionId = input.session_id || input.conversation_id || 'unknown';
    const lockFile = path.join(os.tmpdir(), `aw-prompt-dedup-${sessionId}`);
    let skip = false;
    try {
      // Clean stale lock (>2s old)
      const stat = fs.statSync(lockFile);
      if (Date.now() - stat.mtimeMs > 2000) {
        fs.unlinkSync(lockFile);
      }
    } catch { /* no lock file */ }
    try {
      fs.writeFileSync(lockFile, String(Date.now()), { flag: 'wx' });
    } catch {
      // File already exists (created by parallel process) — skip
      skip = true;
    }

    if (!skip) {
      sendAsync(buildEvent(input, 'prompt_submitted', {}));
      // Clean up lock after brief delay so next prompt isn't blocked
      setTimeout(() => { try { fs.unlinkSync(lockFile); } catch {} }, 2000);
    }
  } catch {
    // Non-blocking.
  }

  process.stdout.write('{}');
});
