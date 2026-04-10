/**
 * Tests for scripts/lib/aw-hook-contract.js
 *
 * Run with: node tests/lib/aw-hook-contract.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  AW_HOOK_PHASES,
  getClaudePhaseNames,
  getCodexPhaseNames,
  getCursorMappedEventNames,
} = require('../../scripts/lib/aw-hook-contract');

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

function runTests() {
  console.log('\n=== Testing AW hook contract ===\n');

  let passed = 0;
  let failed = 0;

  if (test('defines the expected AW core and extended phases', () => {
    const phaseNames = AW_HOOK_PHASES.map((phase) => phase.phase);
    assert.deepStrictEqual(phaseNames, [
      'SessionStart',
      'UserPromptSubmit',
      'PreToolUse',
      'PostToolUse',
      'Stop',
      'SessionEnd',
      'PostToolUseFailure',
      'PreCompact',
    ]);
  })) passed++; else failed++;

  if (test('Claude hooks.json exposes every phase in the contract', () => {
    const hooksPath = path.join(__dirname, '..', '..', 'hooks', 'hooks.json');
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const phaseNames = getClaudePhaseNames();

    for (const phaseName of phaseNames) {
      assert.ok(Array.isArray(hooks.hooks[phaseName]), `Expected hooks.json to define ${phaseName}`);
      assert.ok(hooks.hooks[phaseName].length > 0, `Expected ${phaseName} to have at least one hook entry`);
    }
  })) passed++; else failed++;

  if (test('Cursor hooks.json exposes every mapped phase in the contract', () => {
    const hooksPath = path.join(__dirname, '..', '..', '.cursor', 'hooks.json');
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const cursorEvents = getCursorMappedEventNames();

    for (const eventName of cursorEvents) {
      assert.ok(Array.isArray(hooks.hooks[eventName]), `Expected .cursor/hooks.json to define ${eventName}`);
      assert.ok(hooks.hooks[eventName].length > 0, `Expected ${eventName} to have at least one hook entry`);
    }
  })) passed++; else failed++;

  if (test('Cursor contract maps AW prompt-submit to beforeSubmitPrompt', () => {
    const hooksPath = path.join(__dirname, '..', '..', '.cursor', 'hooks.json');
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const beforeSubmit = hooks.hooks.beforeSubmitPrompt || [];
    assert.ok(
      beforeSubmit.some((entry) => String(entry.command || '').includes('before-submit-prompt.sh')),
      'Expected beforeSubmitPrompt to invoke the managed Cursor prompt-submit wrapper'
    );
  })) passed++; else failed++;

  if (test('Codex hooks.json exposes every supported phase in the contract', () => {
    const hooksPath = path.join(__dirname, '..', '..', '.codex', 'hooks.json');
    const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    const phaseNames = getCodexPhaseNames();

    for (const phaseName of phaseNames) {
      assert.ok(Array.isArray(hooks.hooks[phaseName]), `Expected .codex/hooks.json to define ${phaseName}`);
      assert.ok(hooks.hooks[phaseName].length > 0, `Expected ${phaseName} to have at least one hook entry`);
    }
  })) passed++; else failed++;

  console.log('\nResults:');
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
