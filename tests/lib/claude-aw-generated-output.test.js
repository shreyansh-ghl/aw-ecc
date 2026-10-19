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

// aw-usage telemetry is owned by the aw CLI (ghl-agentic-workspace), which
// wires it once through ~/.claude/settings.json. The plugin must not wire it
// too, or every event would be sent twice.
const AW_USAGE_SCRIPTS = [
  'aw-usage-session-start.js',
  'aw-usage-prompt-submit.js',
  'aw-usage-post-tool-use.js',
  'aw-usage-post-tool-use-failure.js',
  'aw-usage-stop.js',
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
  ['generated hooks.json carries no keys Claude Code would reject', () => {
    // Claude Code's plugin hooks.json parser accepts only `hooks` at the root
    // and `matcher`/`hooks` per entry.  Anything else produces a startup
    // warning: `aw: hooks.json: unknown keys ... ignored`.  hooks.base.json
    // keeps `description` as maintainer docs; the generator must strip it.
    for (const file of [HOME_SOURCE_FILE, RUNTIME_OUTPUT_FILE]) {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));

      assert.deepStrictEqual(Object.keys(config), ['hooks'],
        `${file} must contain only 'hooks' at the root`);

      for (const [event, entries] of Object.entries(config.hooks)) {
        entries.forEach((entry, index) => {
          const unknown = Object.keys(entry).filter(key => key !== 'matcher' && key !== 'hooks');
          assert.deepStrictEqual(unknown, [],
            `${file}: ${event}[${index}] has unknown keys: ${unknown.join(', ')}`);
        });
      }
    }
  }],
  ['plugin hook files do not wire aw-usage telemetry (owned by the aw CLI)', () => {
    for (const file of [HOME_SOURCE_BASE, HOME_SOURCE_FILE, RUNTIME_OUTPUT_FILE]) {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const [event, entries] of Object.entries(config.hooks)) {
        for (const script of AW_USAGE_SCRIPTS) {
          assert.strictEqual(findHookCommand(entries, script), null,
            `${path.relative(REPO_ROOT, file)}: ${event} still wires ${script}`);
        }
      }
    }
  }],
]);
