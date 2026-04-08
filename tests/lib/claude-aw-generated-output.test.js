/**
 * Tests that Claude hook output is generated from the neutral home source file.
 *
 * Run with: node tests/lib/claude-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runSuite, buildGeneratedOutputTests } = require('./harness-test-helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const HOME_SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'claude-aw-home');
const HOME_SOURCE_BASE = path.join(HOME_SOURCE_DIR, 'hooks.base.json');
const HOME_SOURCE_FILE = path.join(HOME_SOURCE_DIR, 'hooks.json');
const RUNTIME_OUTPUT_FILE = path.join(REPO_ROOT, 'hooks', 'hooks.json');

runSuite('Testing generated Claude AW hook output', [
  ['neutral Claude AW home source files exist', () => {
    assert.ok(fs.existsSync(HOME_SOURCE_DIR), `Expected source dir to exist: ${HOME_SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_BASE), `Expected base source file to exist: ${HOME_SOURCE_BASE}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  }],
  ...buildGeneratedOutputTests({
    configSourceFile: HOME_SOURCE_FILE,
    configOutputFile: RUNTIME_OUTPUT_FILE,
  }),
]);
