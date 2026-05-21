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

  (test('extractAwSlashCommand sets command_namespace and is_sdlc_stage for /aw:plan', () => {
    const cmd = extractAwSlashCommand({ prompt: '/aw:plan implement cost dashboard' });
    assert.ok(cmd);
    assert.strictEqual(cmd.command_namespace, 'aw');
    assert.strictEqual(cmd.command_name, 'aw:plan');
    assert.strictEqual(cmd.command_args, 'implement cost dashboard');
    assert.strictEqual(cmd.is_sdlc_stage, true);
  }) ? passed++ : failed++);

  (test('extractAwSlashCommand matches /caveman:lite as caveman namespace, not SDLC', () => {
    const cmd = extractAwSlashCommand({ prompt: '/caveman:lite' });
    assert.ok(cmd);
    assert.strictEqual(cmd.command_namespace, 'caveman');
    assert.strictEqual(cmd.command_name, 'caveman:lite');
    assert.strictEqual(cmd.is_sdlc_stage, false);
  }) ? passed++ : failed++);

  (test('extractAwSlashCommand matches bare-name skills like /tdd', () => {
    const cmd = extractAwSlashCommand({ prompt: '/tdd add unit tests for the cost service' });
    assert.ok(cmd);
    assert.strictEqual(cmd.command_namespace, null);
    assert.strictEqual(cmd.command_name, 'tdd');
    assert.strictEqual(cmd.command_args, 'add unit tests for the cost service');
    assert.strictEqual(cmd.is_sdlc_stage, false);
  }) ? passed++ : failed++);

  (test('extractAwSlashCommand returns null for unknown bare slash commands', () => {
    assert.strictEqual(extractAwSlashCommand({ prompt: '/notarealcommand' }), null);
    assert.strictEqual(extractAwSlashCommand({ prompt: '/help' }), null);
  }) ? passed++ : failed++);

  (test('extractAwSlashCommand matches /aw:notastage but flags is_sdlc_stage=false', () => {
    const cmd = extractAwSlashCommand({ prompt: '/aw:notastage args' });
    assert.ok(cmd);
    assert.strictEqual(cmd.command_namespace, 'aw');
    assert.strictEqual(cmd.is_sdlc_stage, false);
  }) ? passed++ : failed++);

  (test('processPromptSubmitInput persists slash command and enriches prompt_submitted payload', () => {
    const emitted = [];
    const persistedSlash = [];
    processPromptSubmitInput({
      session_id: 'session-4',
      prompt: '/aw:test run the suite',
    }, {
      emit(eventType, payload) { emitted.push({ eventType, payload }); },
      persistSlashCmd(sessionId, slash) { persistedSlash.push({ sessionId, slash }); },
    });

    const submitted = emitted.find(e => e.eventType === 'prompt_submitted');
    assert.ok(submitted, 'Expected prompt_submitted event');
    assert.strictEqual(submitted.payload.command_namespace, 'aw');
    assert.strictEqual(submitted.payload.command_name, 'aw:test');
    assert.strictEqual(submitted.payload.is_sdlc_stage, true);
    assert.strictEqual(persistedSlash.length, 1);
    assert.strictEqual(persistedSlash[0].sessionId, 'session-4');
    assert.strictEqual(persistedSlash[0].slash.command_name, 'aw:test');
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
