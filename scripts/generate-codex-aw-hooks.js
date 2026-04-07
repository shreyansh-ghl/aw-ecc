#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { getHarnessConfig } = require('./lib/aw-harness-registry');

const repoRoot = path.join(__dirname, '..');
const harness = getHarnessConfig('codex');

const sourceDir = path.join(repoRoot, harness.getHookSourceDir());
const homeSourceDir = path.join(repoRoot, harness.getHomeSourceDir());
const homeSourceHooksJsonPath = path.join(repoRoot, harness.getHooksConfigSourceRelativePath());
const outputDir = path.join(repoRoot, harness.getOutputDir());
const outputHooksJsonPath = path.join(repoRoot, '.codex', 'hooks.json');

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(homeSourceDir, { recursive: true });

  for (const fileName of harness.hookFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
    fs.chmodSync(destinationPath, 0o755);
  }

  const hooksJson = harness.serialize();
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
