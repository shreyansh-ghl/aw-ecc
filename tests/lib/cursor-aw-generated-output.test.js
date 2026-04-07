/**
 * Tests that AW-owned Cursor hook outputs are generated from neutral source files.
 *
 * Run with: node tests/lib/cursor-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runSuite, buildGeneratedOutputTests } = require('./harness-test-helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'cursor-aw-hooks');
const HOME_SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'cursor-aw-home');
const SHARED_SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'hooks', 'shared');
const OUTPUT_DIR = path.join(REPO_ROOT, '.cursor', 'hooks');
const SHARED_OUTPUT_DIR = path.join(OUTPUT_DIR, 'shared');
const HOME_OUTPUT_FILE = path.join(REPO_ROOT, '.cursor', 'hooks.json');
const HOME_SOURCE_FILE = path.join(HOME_SOURCE_DIR, 'hooks.json');
const FILE_NAMES = [
  'adapter.js',
  'after-file-edit.js',
  'after-mcp-execution.js',
  'after-shell-execution.js',
  'aw-phase-adapter.js',
  'before-mcp-execution.js',
  'before-shell-execution.js',
  'before-submit-prompt.js',
  'pre-compact.js',
  'session-end.js',
  'session-start.js',
  'stop.js',
];
const SHARED_FILE_NAMES = [
  'aw-phase-definitions.js',
  'aw-phase-runner.js',
  'session-start.sh',
  'user-prompt-submit.sh',
];

function resolveCommandPath(command) {
  const match = String(command || '').match(/^node\s+(.+)$/);
  if (!match) {
    return null;
  }
  return path.join(REPO_ROOT, match[1].trim());
}

runSuite('Testing generated Cursor AW hook outputs', [
  ['neutral Cursor AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SOURCE_DIR), `Expected source dir to exist: ${SOURCE_DIR}`);
  }],
  ['neutral Cursor AW home source directory exists', () => {
    assert.ok(fs.existsSync(HOME_SOURCE_DIR), `Expected source dir to exist: ${HOME_SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  }],
  ['neutral shared AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SHARED_SOURCE_DIR), `Expected source dir to exist: ${SHARED_SOURCE_DIR}`);
  }],
  ...buildGeneratedOutputTests({
    sourceDir: SOURCE_DIR,
    outputDir: OUTPUT_DIR,
    files: FILE_NAMES,
  }),
  ...buildGeneratedOutputTests({
    sourceDir: SHARED_SOURCE_DIR,
    outputDir: SHARED_OUTPUT_DIR,
    files: SHARED_FILE_NAMES,
    configSourceFile: HOME_SOURCE_FILE,
    configOutputFile: HOME_OUTPUT_FILE,
  }),
  ['generated Cursor hook config includes version and resolvable local command paths', () => {
    const parsed = JSON.parse(fs.readFileSync(HOME_OUTPUT_FILE, 'utf8'));
    assert.strictEqual(parsed.version, 1, 'Expected Cursor hooks.json to include version: 1');
    assert.ok(parsed.hooks && typeof parsed.hooks === 'object', 'Expected hooks.json to contain a hooks object');

    for (const entries of Object.values(parsed.hooks)) {
      assert.ok(Array.isArray(entries), 'Expected each Cursor hook event to map to an array');
      for (const entry of entries) {
        const resolvedPath = resolveCommandPath(entry.command);
        if (resolvedPath) {
          assert.ok(
            fs.existsSync(resolvedPath),
            `Expected Cursor hook command path to exist: ${entry.command} -> ${resolvedPath}`
          );
        }
      }
    }
  }],
]);
