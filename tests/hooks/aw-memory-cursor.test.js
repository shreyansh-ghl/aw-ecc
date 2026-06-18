/**
 * Tests for Cursor AW Memory prompt handling.
 *
 * Run with: node tests/hooks/aw-memory-cursor.test.js
 */

const assert = require('assert');

const {
  extractAwMemoryRecall,
  normalizeCursorPromptOutput,
} = require('../../scripts/cursor-aw-hooks/before-submit-prompt');

function test(name, fn) {
  try {
    fn();
    console.log(`  ok ${name}`);
    return true;
  } catch (error) {
    console.log(`  not ok ${name}`);
    console.log(`    ${error.stack || error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing Cursor AW Memory prompt handling ===\n');

  let passed = 0;
  let failed = 0;

  if (test('extracts only the AW Memory Recall advisory block', () => {
    const advisory = [
      '[AW Router reminder] Re-apply using-aw-skills.',
      '[Rule reminder] Read universal/security.',
      '',
      'AW Memory Recall',
      '- Scope writes by locationId.',
      '- Use DTO validation.',
    ].join('\n');

    assert.strictEqual(
      extractAwMemoryRecall(advisory),
      'AW Memory Recall\n- Scope writes by locationId.\n- Use DTO validation.'
    );
  })) passed++; else failed++;

  if (test('returns original Cursor prompt unchanged by default even when recall advisory exists', () => {
    const raw = JSON.stringify({
      hook_event_name: 'beforeSubmitPrompt',
      prompt: 'review backend service',
    });
    const output = JSON.parse(normalizeCursorPromptOutput(raw, {
      memoryRecall: 'AW Memory Recall\n- Scope writes by locationId.',
      env: { AW_MEMORY_CURSOR_PROMPT_INJECTION: '0' },
    }));

    assert.strictEqual(output.prompt, 'review backend service');
    assert.strictEqual(output.hook_event_name, undefined);
  })) passed++; else failed++;

  if (test('injects recall into Cursor prompt only when explicit flag is enabled', () => {
    const raw = JSON.stringify({
      hook_event_name: 'beforeSubmitPrompt',
      prompt: 'review backend service',
    });
    const output = JSON.parse(normalizeCursorPromptOutput(raw, {
      memoryRecall: 'AW Memory Recall\n- Scope writes by locationId.',
      env: { AW_MEMORY_CURSOR_PROMPT_INJECTION: '1' },
    }));

    assert.strictEqual(
      output.prompt,
      'review backend service\n\nAW Memory Recall\n- Scope writes by locationId.'
    );
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
