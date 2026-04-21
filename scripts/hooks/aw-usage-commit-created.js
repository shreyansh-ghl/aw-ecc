#!/usr/bin/env node
/**
 * Usage telemetry — commit_created event.
 *
 * Called from the post-commit git hook when the commit has an AW
 * Co-Authored-By trailer. Works for all harnesses (Claude, Cursor, Codex)
 * since it fires from a git-level hook, not a harness-specific one.
 *
 * Usage: node aw-usage-commit-created.js <commit_hash> <branch>
 */

'use strict';

const { buildEvent, sendAsync, isDisabled } = require('../lib/aw-usage-telemetry');

if (isDisabled()) process.exit(0);

const commitHash = process.argv[2] || 'unknown';
const branch = process.argv[3] || 'unknown';

// Minimal input — no harness session context in a git hook.
// detectHarness() will return 'claude' (default) but the event
// payload makes it clear this is harness-agnostic.
const event = buildEvent({}, 'commit_created', {
  commit_hash: commitHash,
  branch,
});

// Override harness to 'git' since this fires from a git hook, not a harness
event.harness = 'git';

sendAsync(event);
