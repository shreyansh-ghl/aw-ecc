#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  CURSOR_AW_HOOK_FILES,
  getCursorAwHookSourceRelativeDir,
} = require('./lib/cursor-aw-hook-files');

const repoRoot = path.join(__dirname, '..');
const sourceDir = path.join(repoRoot, getCursorAwHookSourceRelativeDir());
const outputDir = path.join(repoRoot, '.cursor', 'hooks');

function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  for (const fileName of CURSOR_AW_HOOK_FILES) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
  }
}

main();
