const path = require('path');

const CODEX_AW_HOOK_FILES = Object.freeze([
  'aw-post-tool-use.sh',
  'aw-pre-tool-use.sh',
  'aw-session-start.sh',
  'aw-stop.sh',
  'aw-user-prompt-submit.sh',
]);

function buildGeneratedCodexAwHookSourceSuffixes() {
  return [
    '/.codex/hooks.json',
    ...CODEX_AW_HOOK_FILES.map(fileName => (
      `/.codex/hooks/${String(fileName).replace(/\\/g, '/')}`
    )),
  ];
}

function getCodexAwHomeSourceRelativeDir() {
  return path.join('scripts', 'codex-aw-home');
}

function getCodexAwHookSourceRelativeDir() {
  return path.join(getCodexAwHomeSourceRelativeDir(), 'hooks');
}

function getCodexAwHookConfigSourceRelativePath() {
  return path.join(getCodexAwHomeSourceRelativeDir(), 'hooks.json');
}

module.exports = {
  CODEX_AW_HOOK_FILES,
  buildGeneratedCodexAwHookSourceSuffixes,
  getCodexAwHomeSourceRelativeDir,
  getCodexAwHookConfigSourceRelativePath,
  getCodexAwHookSourceRelativeDir,
};
