/**
 * Tests for .cursor/hooks/adapter.js — runExistingHook graceful degradation
 * and transformToClaude field mapping for aw-usage hooks
 *
 * Run with: node tests/lib/adapter.test.js
 */

const assert = require('assert');
const path = require('path');

// We test runExistingHook indirectly by requiring the adapter module.
// The adapter uses getPluginRoot() which resolves to the repo root when
// package.json + scripts/hooks + .cursor/hooks exist.
const { runExistingHook, transformToClaude } = require('../../.cursor/hooks/adapter');

// Sanitized copies of real Cursor 3.25.9 hook inputs (captured 21 Oct 2026,
// ghl-agentic-workspace .aw_docs/features/usage-telemetry-hook-v2/evidence/capture/).
const CURSOR_TOOL_USE_ID = 'call-<uuid>-0\nfc_<uuid>_0';

const CURSOR_BEFORE_SUBMIT_PROMPT = {
  conversation_id: '<uuid>',
  generation_id: '<uuid>',
  model: 'auto-smart',
  model_id: 'auto-smart',
  composer_mode: 'agent',
  prompt: '/aw-plan add export',
  attachments: [
    { type: 'rule', file_path: 'common-aw-routing.mdc' },
    { type: 'rule', file_path: 'security.mdc' },
    { type: 'rule', file_path: 'universal.mdc' },
    { type: 'rule', file_path: 'model-policy' },
  ],
  session_id: '<uuid>',
  hook_event_name: 'beforeSubmitPrompt',
  cursor_version: '3.25.9',
  workspace_roots: ['<repo>'],
  user_email: '<email>',
};

const CURSOR_POST_TOOL_USE_READ_SKILL = {
  conversation_id: '<uuid>',
  generation_id: '<uuid>',
  model: 'auto-smart',
  tool_name: 'Read',
  tool_input: { file_path: '~/.cursor/skills/aw-plan/SKILL.md' },
  tool_output: '{"file_path":"~/.cursor/skills/aw-plan/SKILL.md","content_length":28309}',
  duration: 3164.994,
  tool_use_id: CURSOR_TOOL_USE_ID,
  session_id: '<uuid>',
  hook_event_name: 'postToolUse',
  cursor_version: '3.25.9',
  workspace_roots: ['<repo>'],
  user_email: '<email>',
};

const CURSOR_BEFORE_READ_FILE_SKILL = {
  conversation_id: '<uuid>',
  generation_id: '<uuid>',
  model: 'auto-smart',
  file_path: '~/.cursor/skills/aw-plan/SKILL.md',
  attachments: [],
  tool_use_id: CURSOR_TOOL_USE_ID,
  session_id: '<uuid>',
  hook_event_name: 'beforeReadFile',
  cursor_version: '3.25.9',
  workspace_roots: ['<repo>'],
  user_email: '<email>',
};

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
  console.log('\n=== Testing adapter.js runExistingHook ===\n');

  let passed = 0;
  let failed = 0;

  if (test('returns undefined when hook script does not exist', () => {
    const result = runExistingHook('nonexistent-hook-script-that-will-never-exist.js', '{}');
    assert.strictEqual(result, undefined, 'should return undefined for missing script');
  })) { passed++; } else { failed++; }

  if (test('returns result object when hook script exists', () => {
    // scripts/hooks/aw-usage-telemetry-send.js exists in the repo — use it as a canary.
    // It expects specific stdin format but will still return a result (possibly with stderr).
    const fs = require('fs');
    const root = path.resolve(__dirname, '..', '..');
    const candidatePath = path.join(root, 'scripts', 'hooks', 'aw-usage-telemetry-send.js');

    if (!fs.existsSync(candidatePath)) {
      console.log('    (skipped — aw-usage-telemetry-send.js not found in repo)');
      return;
    }

    const result = runExistingHook('aw-usage-telemetry-send.js', '{}');
    assert.notStrictEqual(result, undefined, 'should return a result object, not undefined');
    assert.ok(typeof result === 'object', 'result should be an object');
  })) { passed++; } else { failed++; }

  if (test('does not write to stderr by default when script missing', () => {
    // Save and clear AW_HOOK_DEBUG
    const prev = process.env.AW_HOOK_DEBUG;
    delete process.env.AW_HOOK_DEBUG;

    // Capture stderr
    const writes = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); };

    try {
      runExistingHook('nonexistent-debug-test.js', '{}');
      assert.strictEqual(writes.length, 0, 'should not write to stderr without AW_HOOK_DEBUG');
    } finally {
      process.stderr.write = origWrite;
      if (prev !== undefined) process.env.AW_HOOK_DEBUG = prev;
      else delete process.env.AW_HOOK_DEBUG;
    }
  })) { passed++; } else { failed++; }

  if (test('writes to stderr when AW_HOOK_DEBUG=1 and script missing', () => {
    const prev = process.env.AW_HOOK_DEBUG;
    process.env.AW_HOOK_DEBUG = '1';

    const writes = [];
    const origWrite = process.stderr.write;
    process.stderr.write = (chunk) => { writes.push(String(chunk)); };

    try {
      runExistingHook('nonexistent-debug-test.js', '{}');
      assert.ok(writes.length > 0, 'should write to stderr with AW_HOOK_DEBUG=1');
      assert.ok(writes[0].includes('nonexistent-debug-test.js'), 'should mention the script name');
      assert.ok(writes[0].includes('[aw]'), 'should include [aw] prefix');
    } finally {
      process.stderr.write = origWrite;
      if (prev !== undefined) process.env.AW_HOOK_DEBUG = prev;
      else delete process.env.AW_HOOK_DEBUG;
    }
  })) { passed++; } else { failed++; }

  if (test('transformToClaude copies the prompt from beforeSubmitPrompt', () => {
    const result = transformToClaude(CURSOR_BEFORE_SUBMIT_PROMPT);
    assert.strictEqual(result.prompt, '/aw-plan add export');
  })) { passed++; } else { failed++; }

  if (test('transformToClaude does not copy Cursor attachments', () => {
    const result = transformToClaude(CURSOR_BEFORE_SUBMIT_PROMPT);
    assert.ok(!('attachments' in result), 'attachments key should not be present');
  })) { passed++; } else { failed++; }

  if (test('transformToClaude copies tool_use_id unchanged from postToolUse', () => {
    const result = transformToClaude(CURSOR_POST_TOOL_USE_READ_SKILL);
    assert.strictEqual(result.tool_use_id, CURSOR_TOOL_USE_ID);
    assert.ok(result.tool_use_id.includes('\n'), 'embedded newline should be kept');
    assert.strictEqual(result.tool_name, 'Read');
  })) { passed++; } else { failed++; }

  if (test('transformToClaude gives the same tool_use_id for beforeReadFile and postToolUse of one call', () => {
    const before = transformToClaude(CURSOR_BEFORE_READ_FILE_SKILL);
    const after = transformToClaude(CURSOR_POST_TOOL_USE_READ_SKILL);
    assert.strictEqual(before.tool_use_id, CURSOR_TOOL_USE_ID);
    assert.strictEqual(before.tool_use_id, after.tool_use_id);
    assert.ok(!('attachments' in before), 'attachments key should not be present');
  })) { passed++; } else { failed++; }

  if (test('transformToClaude leaves tool_use_id undefined when Cursor sends none or an empty one', () => {
    assert.strictEqual(transformToClaude(CURSOR_BEFORE_SUBMIT_PROMPT).tool_use_id, undefined);
    assert.strictEqual(
      transformToClaude({ ...CURSOR_POST_TOOL_USE_READ_SKILL, tool_use_id: '' }).tool_use_id,
      undefined
    );
  })) { passed++; } else { failed++; }

  if (test('transformToClaude leaves prompt undefined for tool hooks', () => {
    assert.strictEqual(transformToClaude(CURSOR_POST_TOOL_USE_READ_SKILL).prompt, undefined);
  })) { passed++; } else { failed++; }

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
