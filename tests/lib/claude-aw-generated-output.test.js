/**
 * Tests that Claude hook output is generated from the neutral home source file.
 *
 * Run with: node tests/lib/claude-aw-generated-output.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runSuite, buildGeneratedOutputTests } = require('./harness-test-helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const HOME_SOURCE_DIR = path.join(REPO_ROOT, 'scripts', 'claude-aw-home');
const HOME_SOURCE_BASE = path.join(HOME_SOURCE_DIR, 'hooks.base.json');
const HOME_SOURCE_FILE = path.join(HOME_SOURCE_DIR, 'hooks.json');
const RUNTIME_OUTPUT_FILE = path.join(REPO_ROOT, 'hooks', 'hooks.json');

// Required telemetry hooks that must be present in hooks.base.json.
// Each entry maps a Claude hook event to the aw-usage script basename it must wire.
const REQUIRED_TELEMETRY_HOOKS = [
  { event: 'SessionStart', script: 'aw-usage-session-start.js' },
  { event: 'UserPromptSubmit', script: 'aw-usage-prompt-submit.js' },
  { event: 'PostToolUse', script: 'aw-usage-post-tool-use.js' },
  { event: 'PostToolUseFailure', script: 'aw-usage-post-tool-use-failure.js' },
  { event: 'Stop', script: 'aw-usage-stop.js' },
];

function findHookCommand(entries, scriptBasename) {
  for (const entry of entries) {
    for (const hook of entry.hooks || []) {
      if (String(hook.command || '').includes(scriptBasename)) {
        return { entry, hook };
      }
    }
  }
  return null;
}

runSuite('Testing generated Claude AW hook output', [
  ['neutral Claude AW home source files exist', () => {
    assert.ok(fs.existsSync(HOME_SOURCE_DIR), `Expected source dir to exist: ${HOME_SOURCE_DIR}`);
    assert.ok(fs.existsSync(HOME_SOURCE_BASE), `Expected base source file to exist: ${HOME_SOURCE_BASE}`);
    assert.ok(fs.existsSync(HOME_SOURCE_FILE), `Expected source file to exist: ${HOME_SOURCE_FILE}`);
  }],
  ...buildGeneratedOutputTests({
    configSourceFile: HOME_SOURCE_FILE,
    configOutputFile: RUNTIME_OUTPUT_FILE,
  }),
  ['hooks.base.json wires all required usage telemetry hooks', () => {
    const config = JSON.parse(fs.readFileSync(HOME_SOURCE_BASE, 'utf8'));
    const missing = [];

    for (const { event, script } of REQUIRED_TELEMETRY_HOOKS) {
      const entries = config.hooks[event];
      assert.ok(Array.isArray(entries), `Expected hooks.${event} to be an array`);
      const match = findHookCommand(entries, script);
      if (!match) {
        missing.push(`${event} → ${script}`);
      }
    }

    assert.strictEqual(missing.length, 0,
      `Missing telemetry hooks in hooks.base.json:\n  ${missing.join('\n  ')}`);
  }],
  ['usage telemetry hooks in hooks.base.json are async and non-blocking', () => {
    const config = JSON.parse(fs.readFileSync(HOME_SOURCE_BASE, 'utf8'));

    for (const { event, script } of REQUIRED_TELEMETRY_HOOKS) {
      const match = findHookCommand(config.hooks[event] || [], script);
      assert.ok(match, `${event} → ${script} not found (covered by previous test)`);
      assert.strictEqual(match.hook.async, true,
        `${event} → ${script} must be async to avoid blocking the conversation`);
      assert.ok(typeof match.hook.timeout === 'number' && match.hook.timeout > 0,
        `${event} → ${script} must have a positive timeout`);
    }
  }],
]);
