const path = require('path');

const CURSOR_AW_HOOK_FILES = Object.freeze([
  'aw-phase-adapter.js',
  'aw-phase-definitions.js',
  'before-submit-prompt.js',
  'pre-compact.js',
  'session-end.js',
  'session-start.js',
  'stop.js',
]);

function buildGeneratedCursorAwHookSourceSuffixes() {
  return CURSOR_AW_HOOK_FILES.map(fileName => (
    `/.cursor/hooks/${String(fileName).replace(/\\/g, '/')}`
  ));
}

function getCursorAwHookSourceRelativeDir() {
  return path.join('scripts', 'cursor-aw-hooks');
}

function getCursorAwHomeSourceRelativeDir() {
  return path.join('scripts', 'cursor-aw-home');
}

function getCursorAwHookConfigSourceRelativePath() {
  return path.join(getCursorAwHomeSourceRelativeDir(), 'hooks.json');
}

module.exports = {
  CURSOR_AW_HOOK_FILES,
  buildGeneratedCursorAwHookSourceSuffixes,
  getCursorAwHomeSourceRelativeDir,
  getCursorAwHookConfigSourceRelativePath,
  getCursorAwHookSourceRelativeDir,
};
