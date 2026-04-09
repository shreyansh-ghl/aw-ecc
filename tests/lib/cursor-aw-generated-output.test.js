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
  'adapter.js',
  'after-file-edit.js',
  'after-mcp-execution.js',
  'after-shell-execution.js',
  'aw-phase-adapter.js',
  'aw-phase-definitions.js',
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
  const shellMatch = String(command || '').match(/\.cursor\/hooks\/([^"\s]+\.sh)/);
  if (shellMatch) {
    return path.join(__dirname, '..', '..', '.cursor', 'hooks', shellMatch[1]);
  }

  const managedMatch = String(command || '').match(/scriptName=\\?"([^"]+\.js)\\?"/);
  if (managedMatch) {
    return path.join(__dirname, '..', '..', '.cursor', 'hooks', managedMatch[1]);
  }

  const match = String(command || '').match(/^node\s+(.+)$/);
  if (!match) {
    return null;
  }

  return path.join(__dirname, '..', '..', match[1].trim());
}

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

  if (test('generated Cursor hook config includes version and resolvable local command paths', () => {
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
  })) passed++; else failed++;

  if (test('generated Cursor hook config uses the portable managed launcher instead of repo-only relative paths', () => {
    const parsed = JSON.parse(fs.readFileSync(HOME_OUTPUT_FILE, 'utf8'));
    const sessionStart = parsed.hooks.sessionStart[0].command;
    const beforeSubmitPrompt = parsed.hooks.beforeSubmitPrompt[0].command;
    const stop = parsed.hooks.stop[0].command;

    assert.ok(sessionStart.startsWith('bash -lc '), `Expected shell launcher for sessionStart, got: ${sessionStart}`);
    assert.ok(beforeSubmitPrompt.startsWith('bash -lc '), `Expected shell launcher for beforeSubmitPrompt, got: ${beforeSubmitPrompt}`);
    assert.ok(stop.startsWith('node -e '), `Expected node launcher for stop, got: ${stop}`);
    assert.ok(!sessionStart.includes('node .cursor/hooks/'), `Expected no repo-only relative node path, got: ${sessionStart}`);
    assert.ok(!beforeSubmitPrompt.includes('node .cursor/hooks/'), `Expected no repo-only relative node path, got: ${beforeSubmitPrompt}`);
    assert.ok(!stop.includes('node .cursor/hooks/'), `Expected no repo-only relative node path, got: ${stop}`);
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
