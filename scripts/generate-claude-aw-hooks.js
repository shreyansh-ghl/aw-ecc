#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const {
  getClaudeAwHomeSourceRelativeDir,
} = require('./lib/claude-aw-hook-files');
const { serializeClaudeHookConfig } = require('./lib/claude-hook-config');

const repoRoot = path.join(__dirname, '..');
const homeSourceDir = path.join(repoRoot, getClaudeAwHomeSourceRelativeDir());
const homeSourceHooksJsonPath = path.join(homeSourceDir, 'hooks.json');
const outputHooksJsonPath = path.join(repoRoot, 'hooks', 'hooks.json');

function main() {
  fs.mkdirSync(homeSourceDir, { recursive: true });

  const hooksJson = serializeClaudeHookConfig({ repoRoot });
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);
  fs.writeFileSync(outputHooksJsonPath, hooksJson);
}

main();
