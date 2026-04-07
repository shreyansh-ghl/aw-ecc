/**
 * Tests that AW-owned Cursor hook outputs are generated from neutral source files.
 *
 * Run with: node tests/lib/cursor-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'scripts', 'cursor-aw-hooks');
const HOME_SOURCE_DIR = path.join(__dirname, '..', '..', 'scripts', 'cursor-aw-home');
const SHARED_SOURCE_DIR = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'shared');
const OUTPUT_DIR = path.join(__dirname, '..', '..', '.cursor', 'hooks');
const SHARED_OUTPUT_DIR = path.join(OUTPUT_DIR, 'shared');
const HOME_OUTPUT_FILE = path.join(__dirname, '..', '..', '.cursor', 'hooks.json');
const HOME_SOURCE_FILE = path.join(HOME_SOURCE_DIR, 'hooks.json');
const FILE_NAMES = [
  'aw-phase-adapter.js',
  'aw-phase-definitions.js',
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

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing generated Cursor AW hook outputs ===\n');

  let passed = 0;
  let failed = 0;

  if (test('neutral Cursor AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SOURCE_DIR), `Expected source dir to exist: ${SOURCE_DIR}`);
  })) passed++; else failed++;

  if (test('neutral Cursor AW home source directory exists', () => {
    assert.ok(fs.existsSync(HOME_SOURCE_DIR), `Expected source dir to exist: ${HOME_SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  })) passed++; else failed++;

  if (test('neutral shared AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SHARED_SOURCE_DIR), `Expected source dir to exist: ${SHARED_SOURCE_DIR}`);
  })) passed++; else failed++;

  if (test('generated .cursor hook files match the neutral source files', () => {
    for (const fileName of FILE_NAMES) {
      const sourcePath = path.join(SOURCE_DIR, fileName);
      const outputPath = path.join(OUTPUT_DIR, fileName);
      assert.ok(fs.existsSync(sourcePath), `Missing neutral source file: ${sourcePath}`);
      assert.ok(fs.existsSync(outputPath), `Missing generated output file: ${outputPath}`);
      assert.strictEqual(
        fs.readFileSync(outputPath, 'utf8'),
        fs.readFileSync(sourcePath, 'utf8'),
        `Generated output drifted from neutral source for ${fileName}`
      );
    }
  })) passed++; else failed++;

  if (test('generated .cursor shared hook files match the neutral source files', () => {
    for (const fileName of SHARED_FILE_NAMES) {
      const sourcePath = path.join(SHARED_SOURCE_DIR, fileName);
      const outputPath = path.join(SHARED_OUTPUT_DIR, fileName);
      assert.ok(fs.existsSync(sourcePath), `Missing neutral source file: ${sourcePath}`);
      assert.ok(fs.existsSync(outputPath), `Missing generated output file: ${outputPath}`);
      assert.strictEqual(
        fs.readFileSync(outputPath, 'utf8'),
        fs.readFileSync(sourcePath, 'utf8'),
        `Generated shared output drifted from neutral source for ${fileName}`
      );
    }
  })) passed++; else failed++;

  if (test('generated .cursor/hooks.json matches the neutral home source file', () => {
    assert.ok(fs.existsSync(HOME_OUTPUT_FILE), `Missing generated output file: ${HOME_OUTPUT_FILE}`);
    assert.strictEqual(
      fs.readFileSync(HOME_OUTPUT_FILE, 'utf8'),
      fs.readFileSync(HOME_SOURCE_FILE, 'utf8'),
      'Generated .cursor/hooks.json drifted from neutral home source'
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
