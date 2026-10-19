/**
 * The aw CLI (ghl-agentic-workspace) owns the aw-usage telemetry scripts and
 * installs them to ~/.aw/aw-usage/{hooks,lib}. The Cursor adapter must run
 * that copy, fall back to the aw-ecc copy only while it still exists, and
 * must not depend on the aw-usage library to find its own root.
 *
 * Run with: node tests/lib/adapter-aw-usage-resolution.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ADAPTER_SOURCE = path.join(__dirname, '..', '..', 'scripts', 'cursor-aw-hooks', 'adapter.js');
const REPO_ROOT = path.join(__dirname, '..', '..');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function withHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-adapter-home-'));
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    return fn(home);
  } finally {
    process.env.HOME = previous;
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function freshAdapter(adapterPath = ADAPTER_SOURCE) {
  delete require.cache[require.resolve(adapterPath)];
  return require(adapterPath);
}

function writeFile(file, content = '// test\n') {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function runTests() {
  console.log('\n=== Testing adapter.js aw-usage resolution ===\n');
  const results = [];

  results.push(test('resolveAwUsageScript prefers ~/.aw/aw-usage/hooks', () => withHome((home) => {
    const installed = path.join(home, '.aw', 'aw-usage', 'hooks', 'aw-usage-prompt-submit.js');
    writeFile(installed);
    const { resolveAwUsageScript } = freshAdapter();
    assert.strictEqual(resolveAwUsageScript('aw-usage-prompt-submit.js'), installed);
  })));

  results.push(test('resolveAwUsageScript falls back to the aw-ecc copy when ~/.aw/aw-usage is absent', () => withHome(() => {
    const { resolveAwUsageScript } = freshAdapter();
    assert.strictEqual(
      resolveAwUsageScript('aw-usage-prompt-submit.js'),
      path.join(REPO_ROOT, 'scripts', 'hooks', 'aw-usage-prompt-submit.js'),
    );
  })));

  results.push(test('resolveAwUsageScript returns null when no copy exists', () => withHome(() => {
    const { resolveAwUsageScript } = freshAdapter();
    assert.strictEqual(resolveAwUsageScript('aw-usage-does-not-exist.js'), null);
  })));

  results.push(test('resolveAwUsageLib prefers ~/.aw/aw-usage/lib', () => withHome((home) => {
    const installed = path.join(home, '.aw', 'aw-usage', 'lib', 'aw-usage-telemetry.js');
    writeFile(installed);
    const { resolveAwUsageLib } = freshAdapter();
    assert.strictEqual(resolveAwUsageLib('aw-usage-telemetry.js'), installed);
  })));

  results.push(test('getPluginRoot finds ~/.aw-ecc without the aw-usage library', () => withHome((home) => {
    // Installed layout: adapter lives in ~/.cursor/hooks, aw-ecc in ~/.aw-ecc.
    const installedAdapter = path.join(home, '.cursor', 'hooks', 'adapter.js');
    writeFile(installedAdapter, fs.readFileSync(ADAPTER_SOURCE, 'utf8'));
    writeFile(path.join(home, '.aw-ecc', 'scripts', 'hooks', 'session-start-rules-context.sh'), '#!/bin/sh\n');
    const { getPluginRoot } = freshAdapter(installedAdapter);
    assert.strictEqual(getPluginRoot(), path.join(home, '.aw-ecc'));
  })));

  const passed = results.filter(Boolean).length;
  console.log(`\nResults: Passed: ${passed}, Failed: ${results.length - passed}`);
  process.exit(passed === results.length ? 0 : 1);
}

runTests();
