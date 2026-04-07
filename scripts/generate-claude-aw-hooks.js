#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { getHarnessConfig } = require('./lib/aw-harness-registry');

const repoRoot = path.join(__dirname, '..');
const harness = getHarnessConfig('claude');

const homeSourceDir = path.join(repoRoot, harness.getHomeSourceDir());
const homeSourceHooksJsonPath = path.join(homeSourceDir, 'hooks.json');
const outputHooksJsonPath = path.join(repoRoot, 'hooks', 'hooks.json');

function main() {
  fs.mkdirSync(homeSourceDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'hooks'), { recursive: true });

  const hooksJson = harness.serialize(repoRoot);
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
