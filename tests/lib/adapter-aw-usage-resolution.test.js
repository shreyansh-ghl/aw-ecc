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
  const previous = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    return fn(home);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
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

// The full v2 set the aw CLI installs (missingAwUsageFiles() in
// ghl-agentic-workspace libs/aw/aw-usage-wiring.mjs).
const COPY_A_FILES = [
  'package.json',
  'hooks/aw-usage-prompt-submit.js',
  'hooks/aw-usage-post-tool-use.js',
  'hooks/aw-usage-post-tool-use-failure.js',
  'hooks/aw-usage-session-start.js',
  'hooks/aw-usage-stop.js',
  'hooks/aw-usage-telemetry-send.js',
  'hooks/aw-usage-commit-created.js',
  'lib/aw-usage-telemetry.js',
  'lib/aw-pricing.js',
  'lib/aw-usage-envelope.js',
  'lib/aw-usage-queue.js',
  'lib/aw-usage-commands.js',
  'lib/aw-usage-skill-source.js',
  'lib/aw-usage-stage-events.js',
];

function writeCopyACore(home, { skip = [] } = {}) {
  for (const rel of COPY_A_FILES) {
    if (!skip.includes(rel)) writeFile(path.join(home, '.aw', 'aw-usage', ...rel.split('/')));
  }
}

function runTests() {
  console.log('\n=== Testing adapter.js aw-usage resolution ===\n');
  const results = [];

  results.push(test('resolveAwUsageScript prefers ~/.aw/aw-usage/hooks', () => withHome((home) => {
    writeCopyACore(home);
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
    writeCopyACore(home);
    const installed = path.join(home, '.aw', 'aw-usage', 'lib', 'aw-usage-telemetry.js');
    const { resolveAwUsageLib } = freshAdapter();
    assert.strictEqual(resolveAwUsageLib('aw-usage-telemetry.js'), installed);
  })));

  results.push(test('an incomplete ~/.aw/aw-usage is not mixed with the aw-ecc copy', () => withHome((home) => {
    writeCopyACore(home, { skip: ['lib/aw-pricing.js'] });
    writeFile(path.join(home, '.aw', 'aw-usage', 'hooks', 'aw-usage-prompt-submit.js'));
    const { resolveAwUsageScript, resolveAwUsageLib } = freshAdapter();
    const copyB = path.join(REPO_ROOT, 'scripts');
    assert.strictEqual(resolveAwUsageLib('aw-usage-telemetry.js'), path.join(copyB, 'lib', 'aw-usage-telemetry.js'));
    assert.strictEqual(resolveAwUsageLib('aw-pricing.js'), path.join(copyB, 'lib', 'aw-pricing.js'));
    assert.strictEqual(resolveAwUsageScript('aw-usage-prompt-submit.js'), path.join(copyB, 'hooks', 'aw-usage-prompt-submit.js'));
  })));

  results.push(test('~/.aw/aw-usage without the telemetry sender is not used', () => withHome((home) => {
    writeCopyACore(home, { skip: ['hooks/aw-usage-telemetry-send.js'] });
    writeFile(path.join(home, '.aw', 'aw-usage', 'hooks', 'aw-usage-prompt-submit.js'));
    const { resolveAwUsageScript, resolveAwUsageLib } = freshAdapter();
    const copyB = path.join(REPO_ROOT, 'scripts');
    assert.strictEqual(resolveAwUsageLib('aw-usage-telemetry.js'), path.join(copyB, 'lib', 'aw-usage-telemetry.js'));
    assert.strictEqual(resolveAwUsageScript('aw-usage-prompt-submit.js'), path.join(copyB, 'hooks', 'aw-usage-prompt-submit.js'));
  })));

  results.push(test('~/.aw/aw-usage missing any v2 file is not used', () => withHome((home) => {
    const copyB = path.join(REPO_ROOT, 'scripts');
    for (const rel of COPY_A_FILES) {
      fs.rmSync(path.join(home, '.aw'), { recursive: true, force: true });
      writeCopyACore(home, { skip: [rel] });
      const { resolveAwUsageScript, resolveAwUsageLib } = freshAdapter();
      assert.strictEqual(resolveAwUsageLib('aw-usage-telemetry.js'), path.join(copyB, 'lib', 'aw-usage-telemetry.js'), `missing ${rel}`);
      assert.strictEqual(resolveAwUsageScript('aw-usage-stop.js'), path.join(copyB, 'hooks', 'aw-usage-stop.js'), `missing ${rel}`);
    }
  })));

  results.push(test('a directory where a lib file belongs does not count as installed', () => withHome((home) => {
    writeCopyACore(home, { skip: ['lib/aw-pricing.js'] });
    fs.mkdirSync(path.join(home, '.aw', 'aw-usage', 'lib', 'aw-pricing.js'), { recursive: true });
    const { resolveAwUsageLib } = freshAdapter();
    assert.strictEqual(resolveAwUsageLib('aw-pricing.js'), path.join(REPO_ROOT, 'scripts', 'lib', 'aw-pricing.js'));
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
