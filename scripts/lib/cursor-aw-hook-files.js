const path = require('path');

const CURSOR_AW_HOOK_FILES = Object.freeze([
  'adapter.js',
  'after-file-edit.js',
  'after-mcp-execution.js',
  'after-shell-execution.js',
  'aw-phase-adapter.js',
  'aw-phase-definitions.js',
  'before-mcp-execution.js',
  'before-shell-execution.js',
  'before-submit-prompt.js',
  'pre-compact.js',
  'session-end.js',
  'session-start.js',
  'stop.js',
]);

const CURSOR_AW_SHARED_HOOK_FILES = Object.freeze([
  'aw-phase-definitions.js',
  'aw-phase-runner.js',
  'session-start.sh',
  'user-prompt-submit.sh',
]);

function buildGeneratedCursorAwHookSourceSuffixes() {
  return CURSOR_AW_HOOK_FILES.map(fileName => (
    `/.cursor/hooks/${String(fileName).replace(/\\/g, '/')}`
  ));
}

function buildGeneratedCursorAwSharedHookSourceSuffixes() {
  return CURSOR_AW_SHARED_HOOK_FILES.map(fileName => (
    `/.cursor/hooks/shared/${String(fileName).replace(/\\/g, '/')}`
  ));
}

function getCursorAwHookSourceRelativeDir() {
  return path.join('scripts', 'cursor-aw-hooks');
}

function getCursorAwSharedHookSourceRelativeDir() {
  return path.join('scripts', 'hooks', 'shared');
}

function getCursorAwHomeSourceRelativeDir() {
  return path.join('scripts', 'cursor-aw-home');
}

function getCursorAwHookConfigSourceRelativePath() {
  return path.join(getCursorAwHomeSourceRelativeDir(), 'hooks.json');
}

module.exports = {
  CURSOR_AW_HOOK_FILES,
  CURSOR_AW_SHARED_HOOK_FILES,
  buildGeneratedCursorAwHookSourceSuffixes,
  buildGeneratedCursorAwSharedHookSourceSuffixes,
  getCursorAwHomeSourceRelativeDir,
  getCursorAwHookConfigSourceRelativePath,
  getCursorAwHookSourceRelativeDir,
  getCursorAwSharedHookSourceRelativeDir,
};
