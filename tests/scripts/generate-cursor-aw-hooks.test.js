/**
 * Tests for scripts/generate-cursor-aw-hooks.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'generate-cursor-aw-hooks.js');
const TARGET_FILE = path.join(REPO_ROOT, '.cursor', 'hooks', 'session-start.js');
const SOURCE_FILE = path.join(REPO_ROOT, 'scripts', 'cursor-aw-hooks', 'session-start.js');

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
    const originalTargetContent = fs.readFileSync(TARGET_FILE, 'utf8');
    const sourceContent = fs.readFileSync(SOURCE_FILE, 'utf8');

    try {
      fs.writeFileSync(TARGET_FILE, '// drifted output\n');
      execFileSync('node', [SCRIPT], {
        cwd: REPO_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const regenerated = fs.readFileSync(TARGET_FILE, 'utf8');
      assert.strictEqual(regenerated, sourceContent);
    } finally {
      fs.writeFileSync(TARGET_FILE, originalTargetContent);
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
