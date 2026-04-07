#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  CODEX_AW_HOOK_FILES,
  getCodexAwHomeSourceRelativeDir,
  getCodexAwHookConfigSourceRelativePath,
  getCodexAwHookSourceRelativeDir,
} = require('./lib/codex-aw-hook-files');
const { serializeCodexHookConfig } = require('./lib/codex-hook-config');

const repoRoot = path.join(__dirname, '..');
const sourceDir = path.join(repoRoot, getCodexAwHookSourceRelativeDir());
const homeSourceDir = path.join(repoRoot, getCodexAwHomeSourceRelativeDir());
const outputDir = path.join(repoRoot, '.codex', 'hooks');
const outputHooksJsonPath = path.join(repoRoot, '.codex', 'hooks.json');
const homeSourceHooksJsonPath = path.join(repoRoot, getCodexAwHookConfigSourceRelativePath());

function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(homeSourceDir, { recursive: true });

  for (const fileName of CODEX_AW_HOOK_FILES) {
    const sourcePath = path.join(sourceDir, fileName);
    const destinationPath = path.join(outputDir, fileName);
    const content = fs.readFileSync(sourcePath, 'utf8');
    fs.writeFileSync(destinationPath, content);
    fs.chmodSync(destinationPath, 0o755);
  }

  const hooksJson = serializeCodexHookConfig();
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
