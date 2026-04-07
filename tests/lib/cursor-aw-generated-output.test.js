/**
 * Tests that AW-owned Cursor hook outputs are generated from neutral source files.
 *
 * Run with: node tests/lib/cursor-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'scripts', 'cursor-aw-hooks');
const OUTPUT_DIR = path.join(__dirname, '..', '..', '.cursor', 'hooks');
const FILE_NAMES = [
  'aw-phase-adapter.js',
  'aw-phase-definitions.js',
  'before-submit-prompt.js',
  'pre-compact.js',
  'session-end.js',
  'session-start.js',
  'stop.js',
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

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
