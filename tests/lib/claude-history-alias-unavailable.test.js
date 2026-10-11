'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClaudeHistoryAdapter } = require('../../scripts/lib/session-adapters/claude-history');
const aliases = require('../../scripts/lib/session-aliases');

const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-history-alias-read-')));
const data = path.join(root, '.claude');
const sessions = path.join(data, 'session-data');
fs.mkdirSync(sessions, { recursive: true });
const id = '550e8400-e29b-41d4-a716-446655440000';
const name = `2026-10-10-${id}-session.tmp`;
const sessionFile = path.join(sessions, name);
fs.writeFileSync(sessionFile, '# History fixture\n**Worktree:** /fixture/project\n\n### Completed\n- [x] existing-history-sentinel\n');
const aliasPath = path.join(data, 'session-aliases.json');
const aliasBytes = JSON.stringify({ version: '1.0', aliases: { kept: { sessionPath: sessionFile } } });
fs.writeFileSync(aliasPath, aliasBytes);
const keys = ['HOME', 'USERPROFILE', 'ECC_AGENT_DATA_HOME'];
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
Object.assign(process.env, { HOME: root, USERPROFILE: root, ECC_AGENT_DATA_HOME: data });
const adapter = createClaudeHistoryAdapter({ persistSnapshots: false });
let passed = 0;
let failed = 0;
function test(name, run) {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}: ${error.stack}`); }
}
try {
  test('readable alias retains truthful claude-alias source identity', () => {
    const snapshot = adapter.open('claude:kept').getSnapshot();
    assert.deepStrictEqual(snapshot.session.sourceTarget, { type: 'claude-alias', value: 'kept' });
    assert.strictEqual(snapshot.workers[0].artifacts.sessionFile, sessionFile);
    assert.strictEqual(fs.readFileSync(aliasPath, 'utf8'), aliasBytes);
  });
  for (const code of ['EACCES', 'EPERM']) {
    test(`known history remains readable while aliases return ${code}, and unresolved targets still fail`, () => {
      const originalRead = fs.readFileSync;
      const expected = Object.assign(new Error('injected unreadable alias store'), { code });
      fs.readFileSync = function (file) {
        if (file === aliasPath) throw expected;
        return originalRead.apply(this, arguments);
      };
      try {
        for (const target of [id, name]) {
          const snapshot = adapter.open(`claude:${target}`).getSnapshot();
          assert.deepStrictEqual(snapshot.session.sourceTarget, { type: 'claude-history', value: target });
          assert.strictEqual(snapshot.workers[0].artifacts.sessionFile, sessionFile);
          assert.ok(snapshot.workers[0].outputs.summary.includes('existing-history-sentinel'));
        }
        assert.throws(() => adapter.open('claude:does-not-exist').getSnapshot(), error => error === expected);
        assert.throws(() => adapter.open('claude:kept').getSnapshot(), error => error === expected);
        assert.throws(() => aliases.setAlias('added', '/new'), error => error === expected);
      } finally { fs.readFileSync = originalRead; }
      assert.strictEqual(fs.readFileSync(aliasPath, 'utf8'), aliasBytes);
      assert.deepStrictEqual(fs.readdirSync(data).sort(), ['session-aliases.json', 'session-data']);
    });
  }
} finally {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  fs.rmSync(root, { recursive: true, force: true });
}
console.log(`Results: Passed: ${passed}, Failed: ${failed}`);
process.exitCode = failed ? 1 : 0;
