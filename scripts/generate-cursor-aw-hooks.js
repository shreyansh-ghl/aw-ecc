#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  CURSOR_AW_HOOK_FILES,
  getCursorAwHomeSourceRelativeDir,
  getCursorAwHookSourceRelativeDir,
} = require('./lib/cursor-aw-hook-files');
const { serializeCursorHookConfig } = require('./lib/cursor-hook-config');

const repoRoot = path.join(__dirname, '..');
const sourceDir = path.join(repoRoot, getCursorAwHookSourceRelativeDir());
const homeSourceDir = path.join(repoRoot, getCursorAwHomeSourceRelativeDir());
const outputDir = path.join(repoRoot, '.cursor', 'hooks');
const outputHooksJsonPath = path.join(repoRoot, '.cursor', 'hooks.json');
const homeSourceHooksJsonPath = path.join(homeSourceDir, 'hooks.json');

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(homeSourceDir, { recursive: true });

  for (const fileName of CURSOR_AW_HOOK_FILES) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
  }

  const hooksJson = serializeCursorHookConfig();
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
