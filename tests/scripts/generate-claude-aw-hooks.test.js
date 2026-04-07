/**
 * Tests for the Claude harness output of scripts/generate-aw-hooks.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-aw-hooks.js');
const TARGET_CONFIG_FILE = path.join(REPO_ROOT, 'hooks', 'hooks.json');
const SOURCE_CONFIG_FILE = path.join(REPO_ROOT, 'scripts', 'claude-aw-home', 'hooks.json');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing generate-aw-hooks.js (claude) ===\n');

  let passed = 0;
  let failed = 0;

  if (test('regenerates Claude hook outputs from the neutral home source file', () => {
    const sourceConfigContent = fs.readFileSync(SOURCE_CONFIG_FILE, 'utf8');

    try {
      fs.writeFileSync(TARGET_CONFIG_FILE, '{"drifted":true}\n');
      fs.writeFileSync(SOURCE_CONFIG_FILE, '{"drifted":true}\n');
      execFileSync('node', [SCRIPT, 'claude'], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const regeneratedConfig = fs.readFileSync(TARGET_CONFIG_FILE, 'utf8');
      const regeneratedSource = fs.readFileSync(SOURCE_CONFIG_FILE, 'utf8');
      assert.strictEqual(regeneratedConfig, regeneratedSource);
      assert.notStrictEqual(regeneratedConfig, '{"drifted":true}\n');
    } finally {
      execFileSync('node', [SCRIPT, 'claude'], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const restored = fs.readFileSync(SOURCE_CONFIG_FILE, 'utf8');
      assert.strictEqual(restored, fs.readFileSync(TARGET_CONFIG_FILE, 'utf8'));
      assert.strictEqual(restored, fs.readFileSync(SOURCE_CONFIG_FILE, 'utf8'));
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
