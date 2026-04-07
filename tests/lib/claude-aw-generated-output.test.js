/**
 * Tests that Claude hook output is generated from the neutral home source file.
 *
 * Run with: node tests/lib/claude-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const HOME_SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'claude-aw-home');
const HOME_SOURCE_BASE = path.join(HOME_SOURCE_DIR, 'hooks.base.json');
const HOME_SOURCE_FILE = path.join(HOME_SOURCE_DIR, 'hooks.json');
const RUNTIME_OUTPUT_FILE = path.join(REPO_ROOT, 'hooks', 'hooks.json');

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
  console.log('\n=== Testing generated Claude AW hook output ===\n');

  let passed = 0;
  let failed = 0;

  if (test('neutral Claude AW home source files exist', () => {
    assert.ok(fs.existsSync(HOME_SOURCE_DIR), `Expected source dir to exist: ${HOME_SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_BASE), `Expected base source file to exist: ${HOME_SOURCE_BASE}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  })) passed++; else failed++;

  if (test('generated hooks/hooks.json matches the neutral home source file', () => {
    assert.ok(fs.existsSync(RUNTIME_OUTPUT_FILE), `Missing runtime output file: ${RUNTIME_OUTPUT_FILE}`);
    assert.strictEqual(
      fs.readFileSync(RUNTIME_OUTPUT_FILE, 'utf8'),
      fs.readFileSync(HOME_SOURCE_FILE, 'utf8'),
      'Generated hooks/hooks.json drifted from neutral home source'
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
