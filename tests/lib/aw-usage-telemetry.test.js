/**
 * Tests for aw-usage-telemetry.js shared helpers.
 *
 * Run with: node tests/lib/aw-usage-telemetry.test.js
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const MODULE_PATH = path.join(__dirname, '..', '..', 'scripts', 'lib', 'aw-usage-telemetry.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function loadTelemetryWithHome(homeDir, awVersion, execSyncImpl) {
  const originalHome = process.env.HOME;
  const originalAwVersion = process.env.AW_VERSION;
  const originalExecSync = childProcess.execSync;

  process.env.HOME = homeDir;
  if (awVersion === undefined) {
    delete process.env.AW_VERSION;
  } else {
    process.env.AW_VERSION = awVersion;
  }
  if (typeof execSyncImpl === 'function') {
    childProcess.execSync = execSyncImpl;
  }

  delete require.cache[MODULE_PATH];
  const telemetry = require(MODULE_PATH);

  return {
    telemetry,
    restore() {
      delete require.cache[MODULE_PATH];
      process.env.HOME = originalHome;
      if (originalAwVersion === undefined) {
        delete process.env.AW_VERSION;
      } else {
        process.env.AW_VERSION = originalAwVersion;
      }
      childProcess.execSync = originalExecSync;
    },
  };
}

function writePackageJson(filePath, version) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ version }) + '\n');
}

function runTests() {
  console.log('\n=== Testing aw-usage-telemetry.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('buildEvent normalizes AW_VERSION strings to semver', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-telemetry-home-'));
    const { telemetry, restore } = loadTelemetryWithHome(tempHome, 'aw version v1.2.3-beta.4');
    try {
      const event = telemetry.buildEvent({
        session_id: 'session-1',
        cwd: '/tmp/project',
      }, 'prompt_submitted', {});

      assert.strictEqual(event.aw_version, '1.2.3-beta.4');
    } finally {
      restore();
      cleanup(tempHome);
    }
  }) ? passed++ : failed++);

  (test('session state preserves skill attribution and model together', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-telemetry-home-'));
    const { telemetry, restore } = loadTelemetryWithHome(tempHome, '1.2.3');
    try {
      telemetry.persistSessionModel('session-2', 'codex-1');
      telemetry.persistSessionSkill('session-2', 'turn-1', {
        skill_name: 'aw:build',
        args: 'finish codex telemetry',
        source: 'user_prompt',
      });
      telemetry.persistSessionModel('session-2', 'codex-1-mini');

      assert.strictEqual(telemetry.readSessionModel('session-2'), 'codex-1-mini');
      assert.strictEqual(
        telemetry.readSessionSkill('session-2', 'turn-1')?.skill_name,
        'aw:build',
      );
      assert.strictEqual(
        telemetry.readSessionSkill('session-2', 'turn-1')?.args,
        'finish codex telemetry',
      );
      assert.strictEqual(telemetry.readSessionSkill('session-2', 'turn-2'), null);
    } finally {
      restore();
      cleanup(tempHome);
    }
  }) ? passed++ : failed++);

  (test('buildEvent prefers aw --version over package metadata when env is absent', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-telemetry-home-'));
    writePackageJson(path.join(tempHome, '.aw-ecc', 'package.json'), '9.9.9');
    writePackageJson(
      path.join(tempHome, '.aw', 'node_modules', '@ghl-ai', 'aw', 'package.json'),
      '8.8.8',
    );

    const { telemetry, restore } = loadTelemetryWithHome(tempHome, undefined, command => {
      if (command === 'aw --version') return 'aw v0.1.42-beta.45';
      if (command === 'git config user.name' || command === 'git config user.email') return '';
      if (command === 'npm prefix -g') throw new Error('npm unavailable');
      throw new Error(`Unexpected command: ${command}`);
    });

    try {
      const event = telemetry.buildEvent({
        session_id: 'session-3',
        cwd: '/tmp/project',
      }, 'prompt_submitted', {});

      assert.strictEqual(event.aw_version, '0.1.42-beta.45');
    } finally {
      restore();
      cleanup(tempHome);
    }
  }) ? passed++ : failed++);

  (test('buildEvent falls back to installed package metadata when aw --version is unavailable', () => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-telemetry-home-'));
    writePackageJson(path.join(tempHome, '.aw-ecc', 'package.json'), '0.1.42-beta.44');

    const { telemetry, restore } = loadTelemetryWithHome(tempHome, undefined, command => {
      if (command === 'aw --version' || command === 'npm prefix -g') {
        throw new Error(`${command} unavailable`);
      }
      if (command === 'git config user.name' || command === 'git config user.email') return '';
      throw new Error(`Unexpected command: ${command}`);
    });

    try {
      const event = telemetry.buildEvent({
        session_id: 'session-4',
        cwd: '/tmp/project',
      }, 'prompt_submitted', {});

      assert.strictEqual(event.aw_version, '0.1.42-beta.44');
    } finally {
      restore();
      cleanup(tempHome);
    }
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
