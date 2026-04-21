/**
 * Tests for aw-usage-prompt-submit.js hook.
 *
 * Run with: node tests/hooks/aw-usage-prompt-submit.test.js
 */

const assert = require('assert');

const {
  extractAwSlashCommand,
  processPromptSubmitInput,
  shouldSkipPromptSubmitTelemetry,
} = require('../../scripts/hooks/aw-usage-prompt-submit.js');

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

function runTests() {
  console.log('\n=== Testing aw-usage-prompt-submit.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('extracts AW slash commands and args from prompt text', () => {
    const skill = extractAwSlashCommand({
      prompt: '/aw:plan test plan for telemetry validation',
    });

    assert.ok(skill, 'Expected slash command match');
    assert.strictEqual(skill.skill_name, 'aw:plan');
    assert.strictEqual(skill.args, 'test plan for telemetry validation');
  }) ? passed++ : failed++);

  (test('ignores non-AW slash commands', () => {
    const skill = extractAwSlashCommand({
      prompt: '/help show commands',
    });

    assert.strictEqual(skill, null);
  }) ? passed++ : failed++);

  (test('prompt submit emits both prompt_submitted and skill_invoked for AW slash commands', () => {
    const emitted = [];
    const persisted = [];
    const events = processPromptSubmitInput({
      session_id: 'session-1',
      turn_id: 'turn-1',
      prompt: '/aw:test produce fresh telemetry evidence',
    }, {
      emit(eventType, payload) {
        emitted.push({ eventType, payload });
      },
      persistSkill(sessionId, turnId, skill) {
        persisted.push({ sessionId, turnId, skill });
      },
    });

    assert.strictEqual(events.length, 2);
    assert.deepStrictEqual(emitted.map(event => event.eventType), ['prompt_submitted', 'skill_invoked']);
    assert.strictEqual(emitted[1].payload.skill_name, 'aw:test');
    assert.strictEqual(emitted[1].payload.args, 'produce fresh telemetry evidence');
    assert.strictEqual(persisted[0].sessionId, 'session-1');
    assert.strictEqual(persisted[0].turnId, 'turn-1');
  }) ? passed++ : failed++);

  (test('plain prompts only emit prompt_submitted', () => {
    const events = processPromptSubmitInput({
      session_id: 'session-2',
      prompt: 'hello codex how are you',
    });

    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].eventType, 'prompt_submitted');
  }) ? passed++ : failed++);

  (test('Codex internal title-generation prompts are skipped from telemetry', () => {
    const shouldSkip = shouldSkipPromptSubmitTelemetry({
      session_id: 'session-3',
      turn_id: 'turn-3',
      model: 'gpt-5.4-mini',
      transcript_path: null,
      prompt: [
        'You are a helpful assistant.',
        'Generate a concise UI title (18-36 characters) for this task.',
        'User prompt:',
        'Find package.json files in this repo and return the paths only.',
      ].join('\n'),
    });

    assert.strictEqual(shouldSkip, true);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
