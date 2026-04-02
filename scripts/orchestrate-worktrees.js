#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  buildOrchestrationPlan,
  executePlan,
} = require('./lib/tmux-worktree-orchestrator');

function usage() {
  console.error('Usage: node scripts/orchestrate-worktrees.js <plan.json> [--execute]');
}

function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const target = args.find((arg) => !arg.startsWith('--'));

  if (!target) {
    usage();
    process.exit(1);
  }

  const planPath = path.resolve(process.cwd(), target);
  const planConfig = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const plan = buildOrchestrationPlan({
    ...planConfig,
    repoRoot: planConfig.repoRoot || process.cwd(),
  });

  if (execute) {
    executePlan(plan);
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

main();
