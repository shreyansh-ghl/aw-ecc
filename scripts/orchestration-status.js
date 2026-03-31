#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { slugify } = require('./lib/tmux-worktree-orchestrator');

function usage() {
  console.error('Usage: node scripts/orchestration-status.js <plan.json|session-name>');
}

function buildPlanSnapshot(planPath, planConfig) {
  const repoRoot = path.resolve(planConfig.repoRoot || path.dirname(planPath));
  const sessionId = slugify(planConfig.sessionName || path.basename(planPath, path.extname(planPath)));

  return {
    schemaVersion: 'ecc.session.v1',
    adapterId: 'dmux-tmux',
    session: {
      id: sessionId,
      kind: 'orchestrated',
      state: 'planned',
      repoRoot,
      sourceTarget: {
        type: 'plan',
        value: planPath,
      },
    },
    workers: [],
    aggregates: {
      workerCount: 0,
      states: {},
      healths: {},
    },
  };
}

function buildSessionSnapshot(sessionName) {
  return {
    schemaVersion: 'ecc.session.v1',
    adapterId: 'dmux-tmux',
    session: {
      id: slugify(sessionName),
      kind: 'orchestrated',
      state: 'unknown',
      repoRoot: null,
      sourceTarget: {
        type: 'session',
        value: sessionName,
      },
    },
    workers: [],
    aggregates: {
      workerCount: 0,
      states: {},
      healths: {},
    },
  };
}

function main() {
  const target = process.argv[2];
  if (!target) {
    usage();
    process.exit(1);
  }

  const resolvedTarget = path.resolve(process.cwd(), target);
  let snapshot;

  if (fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isFile()) {
    const planConfig = JSON.parse(fs.readFileSync(resolvedTarget, 'utf8'));
    snapshot = buildPlanSnapshot(resolvedTarget, planConfig);
  } else {
    snapshot = buildSessionSnapshot(target);
  }

  process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
}

main();
