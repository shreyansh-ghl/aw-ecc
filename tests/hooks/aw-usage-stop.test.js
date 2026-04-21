/**
 * Tests for aw-usage-stop.js hook — cross-harness telemetry.
 *
 * Run with: node tests/hooks/aw-usage-stop.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const script = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'aw-usage-stop.js');
const codexFixture = path.join(__dirname, '..', 'fixtures', 'codex-stop-transcript.jsonl');
const { buildResponseCompletedData, shouldSkipResponseCompleted } = require('../../scripts/hooks/aw-usage-stop.js');
const { readLastAssistantFromTranscript } = require('../../scripts/lib/aw-usage-telemetry');

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

function runScript(input, envOverrides = {}) {
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const result = spawnSync('node', [script], {
    encoding: 'utf8',
    input: inputStr,
    timeout: 10000,
    env: {
      ...process.env,
      AW_TELEMETRY_DISABLED: '1',
      ...envOverrides,
    },
  });
  return { code: result.status || 0, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function createClaudeTranscriptFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-stop-claude-'));
  const transcriptPath = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(transcriptPath, [
    JSON.stringify({
      type: 'assistant',
      message: {
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 1200,
          output_tokens: 300,
          cache_read_input_tokens: 100,
        },
      },
    }),
    '',
  ].join('\n'));
  return { dir, transcriptPath };
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function runTests() {
  console.log('\n=== Testing aw-usage-stop.js ===\n');

  let passed = 0;
  let failed = 0;

  (test('invalid JSON stays non-blocking and returns {}', () => {
    const result = runScript('not valid json');
    assert.strictEqual(result.code, 0, `Expected exit code 0, got ${result.code}`);
    assert.strictEqual(result.stdout, '{}', 'Expected {} output');
  }) ? passed++ : failed++);

  (test('Claude transcript parsing still returns model, stop_reason, and usage', () => {
    const fixture = createClaudeTranscriptFixture();
    try {
      const parsed = readLastAssistantFromTranscript(fixture.transcriptPath);
      assert.ok(parsed, 'Expected transcript parser result');
      assert.strictEqual(parsed.model, 'claude-sonnet-4-20250514');
      assert.strictEqual(parsed.stop_reason, 'end_turn');
      assert.strictEqual(parsed.usage.input_tokens, 1200);
      assert.strictEqual(parsed.usage.output_tokens, 300);
      assert.strictEqual(parsed.usage.cache_read_input_tokens, 100);
    } finally {
      cleanup(fixture.dir);
    }
  }) ? passed++ : failed++);

  (test('Cursor direct token fields still win without transcript parsing', () => {
    const result = buildResponseCompletedData({
      conversation_id: 'cursor-session-1',
      _cursor: { model: 'gpt-4o', conversation_id: 'cursor-session-1' },
      stop_reason: 'completed',
      input_tokens: 2500,
      output_tokens: 500,
      cache_read_tokens: 200,
    });

    assert.strictEqual(result.model, 'gpt-4o');
    assert.strictEqual(result.payload.stop_reason, 'completed');
    assert.strictEqual(result.payload.input_tokens, 2500);
    assert.strictEqual(result.payload.output_tokens, 500);
    assert.strictEqual(result.payload.cache_read_tokens, 200);
    assert.ok(result.payload.estimated_cost_usd > 0, 'Expected non-zero estimated cost');
  }) ? passed++ : failed++);

  (test('Codex transcript fixture yields tokens, cache reads, and cost', () => {
    const result = buildResponseCompletedData({
      session_id: 'codex-session-1',
      turn_id: 'turn-1',
      model: 'codex-1',
      last_assistant_message: 'Telemetry validation complete.',
      transcript_path: codexFixture,
    });

    assert.strictEqual(result.model, 'codex-1');
    assert.strictEqual(result.payload.stop_reason, 'completed');
    assert.strictEqual(result.payload.input_tokens, 67443);
    assert.strictEqual(result.payload.output_tokens, 319);
    assert.strictEqual(result.payload.cache_read_tokens, 67328);
    assert.ok(result.payload.estimated_cost_usd > 0, 'Expected non-zero estimated cost');
    assert.strictEqual(result.payload.cache_create_tokens, undefined);
  }) ? passed++ : failed++);

  (test('Codex input without assistant message stays at unknown stop_reason', () => {
    const result = buildResponseCompletedData({
      session_id: 'codex-session-2',
      turn_id: 'turn-2',
      model: 'codex-1',
      transcript_path: codexFixture,
    });

    assert.strictEqual(result.payload.stop_reason, 'unknown');
    assert.strictEqual(result.payload.input_tokens, 67443);
  }) ? passed++ : failed++);

  (test('Codex internal title-generation completions are skipped from telemetry', () => {
    const shouldSkip = shouldSkipResponseCompleted({
      session_id: 'codex-session-3',
      turn_id: 'turn-3',
      model: 'gpt-5.4-mini',
      transcript_path: null,
      last_assistant_message: '{"title":"Find package.json files"}',
    });

    assert.strictEqual(shouldSkip, true);
  }) ? passed++ : failed++);

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
