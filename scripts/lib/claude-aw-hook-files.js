const path = require('path');

const GENERATED_CLAUDE_AW_HOOK_CONFIG_SUFFIXES = Object.freeze([
  '/hooks/hooks.json',
]);

function buildGeneratedClaudeAwHookSourceSuffixes() {
  return [...GENERATED_CLAUDE_AW_HOOK_CONFIG_SUFFIXES];
}

function getClaudeAwHomeSourceRelativeDir() {
  return path.join('scripts', 'claude-aw-home');
}

function getClaudeAwHookBaseSourceRelativePath() {
  return path.join(getClaudeAwHomeSourceRelativeDir(), 'hooks.base.json');
}

function getClaudeAwHookConfigSourceRelativePath() {
  return path.join(getClaudeAwHomeSourceRelativeDir(), 'hooks.json');
}

module.exports = {
  buildGeneratedClaudeAwHookSourceSuffixes,
  getClaudeAwHomeSourceRelativeDir,
  getClaudeAwHookBaseSourceRelativePath,
  getClaudeAwHookConfigSourceRelativePath,
};
