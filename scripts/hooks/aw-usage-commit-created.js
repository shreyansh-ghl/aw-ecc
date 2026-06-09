#!/usr/bin/env node
/**
 * Usage telemetry — commit_created event.
 *
 * Called from the post-commit git hook when the commit has an AW
 * Co-Authored-By trailer. Works for all harnesses (Claude, Cursor, Codex)
 * since it fires from a git-level hook, not a harness-specific one.
 *
 * Usage: node aw-usage-commit-created.js <commit_hash> <branch> [cwd]
 */

'use strict';

const { buildEvent, sendAsync, isDisabled } = require('../lib/aw-usage-telemetry');

function buildCommitCreatedEvent({ commitHash = 'unknown', branch = 'unknown', cwd = process.cwd() } = {}) {
  const event = buildEvent({ cwd }, 'commit_created', {
    commit_hash: commitHash,
    commit_sha: commitHash,
    branch,
  });

  // Override harness to 'git' since this fires from a git hook, not a harness.
  event.harness = 'git';
  return event;
}

function main() {
  if (isDisabled()) process.exit(0);

  const commitHash = process.argv[2] || 'unknown';
  const branch = process.argv[3] || 'unknown';
  const cwd = process.argv[4] || process.cwd();

  sendAsync(buildCommitCreatedEvent({ commitHash, branch, cwd }));
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCommitCreatedEvent,
};
