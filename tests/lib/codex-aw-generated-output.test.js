/**
 * Tests that AW-owned Codex hook outputs are generated from neutral source files.
 *
 * Run with: node tests/lib/codex-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runSuite, buildGeneratedOutputTests } = require('./harness-test-helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks');
const HOME_SOURCE_FILE = path.join(REPO_ROOT, 'scripts', 'codex-aw-home', 'hooks.json');
const OUTPUT_DIR = path.join(REPO_ROOT, '.codex', 'hooks');
const OUTPUT_FILE = path.join(REPO_ROOT, '.codex', 'hooks.json');
const FILE_NAMES = [
  'aw-post-tool-use.sh',
  'aw-pre-tool-use.sh',
  'aw-session-start.sh',
  'aw-stop.sh',
  'aw-user-prompt-submit.sh',
];

runSuite('Testing generated Codex AW hook outputs', [
  ['neutral Codex AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SOURCE_DIR), `Expected source dir to exist: ${SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  }],
  ...buildGeneratedOutputTests({
    sourceDir: SOURCE_DIR,
    outputDir: OUTPUT_DIR,
    files: FILE_NAMES,
    configSourceFile: HOME_SOURCE_FILE,
    configOutputFile: OUTPUT_FILE,
  }),
]);
