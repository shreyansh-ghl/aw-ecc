/**
 * Focused tests for command alias metadata validation.
 *
 * Run with: node tests/ci/command-alias-validation.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const validatorPath = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-commands.js');
const repoRoot = path.join(__dirname, '..', '..');

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

function stripShebang(source) {
  return source.startsWith('#!') ? source.slice(source.indexOf('\n') + 1) : source;
}

function runValidatorWithDirs(commandsDir, agentsDir, skillsDir) {
  let source = fs.readFileSync(validatorPath, 'utf8');
  source = stripShebang(source);
  source = source.replace(/const COMMANDS_DIR = .*?;/, `const COMMANDS_DIR = ${JSON.stringify(commandsDir)};`);
  source = source.replace(/const AGENTS_DIR = .*?;/, `const AGENTS_DIR = ${JSON.stringify(agentsDir)};`);
  source = source.replace(/const SKILLS_DIR = .*?;/, `const SKILLS_DIR = ${JSON.stringify(skillsDir)};`);

  const wrapperPath = path.join(repoRoot, 'scripts', 'ci', `.tmp-aw-command-validator-${Date.now()}-${Math.random().toString(16).slice(2)}.js`);
  fs.writeFileSync(wrapperPath, source, 'utf8');

  try {
    execFileSync('node', [wrapperPath], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: repoRoot,
    });
    return { code: 0, stdout: '', stderr: '' };
  } catch (error) {
    return {
      code: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
    };
  } finally {
    fs.rmSync(wrapperPath, { force: true });
  }
}

function runTests() {
  console.log('\n=== Testing command alias validation ===\n');

  let passed = 0;
  let failed = 0;

  if (test('fails alias commands without replacement', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-command-alias-'));
    const commandsDir = path.join(tempDir, 'commands');
    const agentsDir = path.join(tempDir, 'agents');
    const skillsDir = path.join(tempDir, 'skills');

    try {
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(skillsDir, { recursive: true });

      fs.writeFileSync(path.join(commandsDir, 'plan.md'), '---\nstatus: alias\nforwardMode: silent\n---\n# Alias', 'utf8');

      const result = runValidatorWithDirs(commandsDir, agentsDir, skillsDir);
      assert.strictEqual(result.code, 1);
      assert.ok(`${result.stdout}${result.stderr}`.includes('must declare replacement'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('fails alias commands with invalid replacement', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-command-alias-'));
    const commandsDir = path.join(tempDir, 'commands');
    const agentsDir = path.join(tempDir, 'agents');
    const skillsDir = path.join(tempDir, 'skills');

    try {
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(skillsDir, { recursive: true });

      fs.writeFileSync(path.join(commandsDir, 'plan.md'), '---\nstatus: alias\nreplacement: /aw:brainstorm\nforwardMode: silent\n---\n# Alias', 'utf8');

      const result = runValidatorWithDirs(commandsDir, agentsDir, skillsDir);
      assert.strictEqual(result.code, 1);
      assert.ok(`${result.stdout}${result.stderr}`.includes('replacement points to non-existent command'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  if (test('passes alias commands with valid replacement metadata', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-command-alias-'));
    const commandsDir = path.join(tempDir, 'commands');
    const agentsDir = path.join(tempDir, 'agents');
    const skillsDir = path.join(tempDir, 'skills');

    try {
      fs.mkdirSync(commandsDir, { recursive: true });
      fs.mkdirSync(agentsDir, { recursive: true });
      fs.mkdirSync(skillsDir, { recursive: true });

      fs.writeFileSync(path.join(commandsDir, 'plan.md'), '---\nstatus: alias\nreplacement: /aw:brainstorm\nforwardMode: silent\n---\n# Alias', 'utf8');
      fs.writeFileSync(path.join(commandsDir, 'brainstorm.md'), '---\nstatus: active\n---\n# Brainstorm', 'utf8');

      const result = runValidatorWithDirs(commandsDir, agentsDir, skillsDir);
      assert.strictEqual(result.code, 0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
