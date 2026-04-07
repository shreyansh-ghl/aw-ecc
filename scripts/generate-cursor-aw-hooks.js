#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { getHarnessConfig } = require('./lib/aw-harness-registry');

const repoRoot = path.join(__dirname, '..');
const harness = getHarnessConfig('cursor');

const sourceDir = path.join(repoRoot, harness.getHookSourceDir());
const sharedSourceDir = path.join(repoRoot, harness.getSharedHookSourceDir());
const homeSourceDir = path.join(repoRoot, harness.getHomeSourceDir());
const homeSourceHooksJsonPath = path.join(homeSourceDir, 'hooks.json');
const outputDir = path.join(repoRoot, harness.getOutputDir());
const outputSharedDir = path.join(repoRoot, harness.getOutputSharedDir());
const outputHooksJsonPath = path.join(repoRoot, '.cursor', 'hooks.json');

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(outputSharedDir, { recursive: true });
  fs.mkdirSync(homeSourceDir, { recursive: true });

  for (const fileName of harness.hookFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
  }

  for (const fileName of harness.sharedHookFiles) {
    const sourcePath = path.join(sharedSourceDir, fileName);
    const destinationPath = path.join(outputSharedDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
  }

  const hooksJson = harness.serialize();
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
