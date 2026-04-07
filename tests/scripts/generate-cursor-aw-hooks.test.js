/**
 * Tests for scripts/generate-cursor-aw-hooks.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-cursor-aw-hooks.js');
const TARGET_HOOK_FILE = path.join(REPO_ROOT, '.cursor', 'hooks', 'session-start.js');
const SOURCE_HOOK_FILE = path.join(REPO_ROOT, 'scripts', 'cursor-aw-hooks', 'session-start.js');
const TARGET_CONFIG_FILE = path.join(REPO_ROOT, '.cursor', 'hooks.json');
const SOURCE_CONFIG_FILE = path.join(REPO_ROOT, 'scripts', 'cursor-aw-home', 'hooks.json');

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
  console.log('\n=== Testing generate-cursor-aw-hooks.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('regenerates AW-owned Cursor hook outputs from the neutral source files', () => {
    const sourceHookContent = fs.readFileSync(SOURCE_HOOK_FILE, 'utf8');
    const sourceConfigContent = fs.readFileSync(SOURCE_CONFIG_FILE, 'utf8');

    try {
      fs.writeFileSync(TARGET_HOOK_FILE, '// drifted output\n');
      fs.writeFileSync(TARGET_CONFIG_FILE, '{\"drifted\":true}\n');
      execFileSync('node', [SCRIPT], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const regeneratedHook = fs.readFileSync(TARGET_HOOK_FILE, 'utf8');
      const regeneratedConfig = fs.readFileSync(TARGET_CONFIG_FILE, 'utf8');
      assert.strictEqual(regeneratedHook, sourceHookContent);
      assert.strictEqual(regeneratedConfig, sourceConfigContent);
    } finally {
      fs.writeFileSync(TARGET_HOOK_FILE, sourceHookContent);
      fs.writeFileSync(TARGET_CONFIG_FILE, sourceConfigContent);
      execFileSync('node', [SCRIPT], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
