/**
 * Integration tests for skills/using-aw-skills/hooks/session-start.sh
 *
 * Run with: node tests/integration/aw-session-start.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const repoRoot = path.join(__dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'skills', 'using-aw-skills', 'hooks', 'session-start.sh');

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

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aw-session-start-'));
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function runHook(fromDir) {
  return execFileSync('bash', [path.join(fromDir, '.aw_registry', 'platform', 'core', 'skills', 'using-aw-skills', 'hooks', 'session-start.sh')], {
    cwd: fromDir,
    encoding: 'utf8',
  });
}

function runTests() {
  console.log('\n=== Testing AW session-start hook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('loads routing context from repo-local skills layout', () => {
    const output = execFileSync('bash', [scriptPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    assert.ok(output.includes('platform-core-aw-brainstorm'));
    assert.ok(output.includes('platform-core-aw-execute'));
    assert.ok(output.includes('platform-core-using-aw-skills'));
  })) passed++; else failed++;

  if (test('loads routing context from a .aw_registry layout copy', () => {
    const tempDir = makeTmpDir();
    const registryRoot = path.join(tempDir, '.aw_registry', 'platform', 'core', 'skills', 'using-aw-skills', 'hooks');
    const registrySkillPath = path.join(tempDir, '.aw_registry', 'platform', 'core', 'skills', 'using-aw-skills', 'SKILL.md');
    const repoSkillDir = path.join(tempDir, '.aw_registry', 'skills', 'aw-brainstorm');

    try {
      copyFile(scriptPath, path.join(registryRoot, 'session-start.sh'));
      copyFile(path.join(repoRoot, 'skills', 'using-aw-skills', 'SKILL.md'), registrySkillPath);
      copyFile(path.join(repoRoot, 'skills', 'aw-brainstorm', 'SKILL.md'), path.join(repoSkillDir, 'SKILL.md'));

      const output = runHook(tempDir);
      assert.ok(output.includes('platform-core-aw-brainstorm'));
      assert.ok(output.includes('platform-core-using-aw-skills'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
