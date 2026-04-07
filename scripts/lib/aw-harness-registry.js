/**
 * Unified harness registry for aw-ecc hook generators.
 *
 * Replaces the pattern of importing from three separate *-hook-config.js and
 * *-aw-hook-files.js modules when generating hook outputs. Each harness entry
 * exposes the same interface so the unified generator (Phase 3) can iterate
 * over all harnesses without per-harness branches.
 *
 * The underlying per-harness modules (claude-hook-config, codex-hook-config,
 * cursor-hook-config, claude-aw-hook-files, codex-aw-hook-files,
 * cursor-aw-hook-files) are still used by the install system — do not delete
 * them.
 */

const {
  getClaudeAwHomeSourceRelativeDir,
} = require('./claude-aw-hook-files');
const { serializeClaudeHookConfig } = require('./claude-hook-config');

const {
  CODEX_AW_HOOK_FILES,
  getCodexAwHomeSourceRelativeDir,
  getCodexAwHookConfigSourceRelativePath,
  getCodexAwHookSourceRelativeDir,
} = require('./codex-aw-hook-files');
const { serializeCodexHookConfig } = require('./codex-hook-config');

const {
  CURSOR_AW_HOOK_FILES,
  CURSOR_AW_SHARED_HOOK_FILES,
  getCursorAwHomeSourceRelativeDir,
  getCursorAwHookSourceRelativeDir,
  getCursorAwSharedHookSourceRelativeDir,
} = require('./cursor-aw-hook-files');
const { serializeCursorHookConfig } = require('./cursor-hook-config');

const { getClaudePhaseNames, getCodexPhaseNames, getCursorMappedEventNames } = require('./aw-hook-contract');

/**
 * Registry of all supported harnesses.
 * Each entry fully describes how to generate that harness's hook outputs.
 *
 * @type {Record<string, import('./aw-harness-registry').HarnessConfig>}
 */
const HARNESS_REGISTRY = Object.freeze({
  claude: {
    name: 'claude',
    getHomeSourceDir: getClaudeAwHomeSourceRelativeDir,
    getHooksConfigSourceRelativePath: (repoRoot) => {
      const path = require('path');
      return path.join(getClaudeAwHomeSourceRelativeDir(), 'hooks.json');
    },
    /** hook files to copy: none for claude (only a JSON config) */
    hookFiles: [],
    sharedHookFiles: [],
    getHookSourceDir: null,
    getSharedHookSourceDir: null,
    getOutputDir: null,
    getOutputSharedDir: null,
    serialize: (repoRoot) => serializeClaudeHookConfig({ repoRoot }),
    getPhaseNames: getClaudePhaseNames,
  },
  codex: {
    name: 'codex',
    getHomeSourceDir: getCodexAwHomeSourceRelativeDir,
    getHooksConfigSourceRelativePath: getCodexAwHookConfigSourceRelativePath,
    hookFiles: CODEX_AW_HOOK_FILES,
    sharedHookFiles: [],
    getHookSourceDir: getCodexAwHookSourceRelativeDir,
    getSharedHookSourceDir: null,
    getOutputDir: () => '.codex/hooks',
    getOutputSharedDir: null,
    serialize: () => serializeCodexHookConfig(),
    getPhaseNames: getCodexPhaseNames,
  },
  cursor: {
    name: 'cursor',
    getHomeSourceDir: getCursorAwHomeSourceRelativeDir,
    getHooksConfigSourceRelativePath: (repoRoot) => {
      const path = require('path');
      return path.join(getCursorAwHomeSourceRelativeDir(), 'hooks.json');
    },
    hookFiles: CURSOR_AW_HOOK_FILES,
    sharedHookFiles: CURSOR_AW_SHARED_HOOK_FILES,
    getHookSourceDir: getCursorAwHookSourceRelativeDir,
    getSharedHookSourceDir: getCursorAwSharedHookSourceRelativeDir,
    getOutputDir: () => '.cursor/hooks',
    getOutputSharedDir: () => '.cursor/hooks/shared',
    serialize: () => serializeCursorHookConfig(),
    getPhaseNames: getCursorMappedEventNames,
  },
});

/**
 * Returns the registry config for a given harness name.
 * Throws if the harness is unknown.
 *
 * @param {string} harness - one of 'claude', 'codex', 'cursor'
 * @returns {object}
 */
function getHarnessConfig(harness) {
  const config = HARNESS_REGISTRY[harness];
  if (!config) {
    throw new Error(`Unknown harness: '${harness}'. Expected one of: ${Object.keys(HARNESS_REGISTRY).join(', ')}`);
  }
  return config;
}

/**
 * Returns the ordered list of supported harness names.
 *
 * @returns {string[]}
 */
function getSupportedHarnesses() {
  return Object.keys(HARNESS_REGISTRY);
}

module.exports = {
  HARNESS_REGISTRY,
  getHarnessConfig,
  getSupportedHarnesses,
};
