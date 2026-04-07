/**
 * Tests that AW-owned Codex hook outputs are generated from neutral source files.
 *
 * Run with: node tests/lib/codex-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', '..', 'scripts', 'codex-aw-home', 'hooks');
const HOME_SOURCE_FILE = path.join(__dirname, '..', '..', 'scripts', 'codex-aw-home', 'hooks.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', '.codex', 'hooks');
const OUTPUT_FILE = path.join(__dirname, '..', '..', '.codex', 'hooks.json');
const FILE_NAMES = [
  'aw-post-tool-use.sh',
  'aw-pre-tool-use.sh',
  'aw-session-start.sh',
  'aw-stop.sh',
  'aw-user-prompt-submit.sh',
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
  console.log('\n=== Testing generated Codex AW hook outputs ===\n');

  let passed = 0;
  let failed = 0;

  if (test('neutral Codex AW hook source directory exists', () => {
    assert.ok(fs.existsSync(SOURCE_DIR), `Expected source dir to exist: ${SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  })) passed++; else failed++;

  if (test('generated .codex hook files match the neutral source files', () => {
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

  if (test('generated .codex/hooks.json matches the neutral home source file', () => {
    assert.ok(fs.existsSync(OUTPUT_FILE), `Missing generated output file: ${OUTPUT_FILE}`);
    assert.strictEqual(
      fs.readFileSync(OUTPUT_FILE, 'utf8'),
      fs.readFileSync(HOME_SOURCE_FILE, 'utf8'),
      'Generated .codex/hooks.json drifted from neutral home source'
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
