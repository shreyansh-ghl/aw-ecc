'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repo = path.resolve(__dirname, '../..');
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-startup-alias-read-')));
const project = path.join(root, 'project');
const home = path.join(root, 'home');
const data = path.join(home, '.claude');
const sessions = path.join(data, 'session-data');
const learned = path.join(data, 'skills/learned');
for (const directory of [project, sessions, learned]) fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(project, 'package.json'), '{"name":"startup-fixture","dependencies":{"react":"1.0.0"}}');
const summary = path.join(sessions, `${new Date().toISOString().slice(0, 10)}-startup-session.tmp`);
fs.writeFileSync(summary, `# Prior session\n**Worktree:** ${project}\n\nstartup-history-sentinel\n`);
fs.writeFileSync(path.join(learned, 'startup-skill.md'), '# Startup skill\n\n## When to Use\nstartup-learned-sentinel\n');
const aliasPath = path.join(data, 'session-aliases.json');
const aliasBytes = JSON.stringify({ version: '1.0', aliases: { kept: { sessionPath: summary, createdAt: new Date().toISOString() } } });
fs.writeFileSync(aliasPath, aliasBytes);
const env = { ...process.env, HOME: home, USERPROFILE: home, ECC_AGENT_DATA_HOME: data,
  CLAUDE_CONFIG_DIR: data, CLAUDE_PROJECT_DIR: project, CLAUDE_PACKAGE_MANAGER: '',
  XDG_DATA_HOME: path.join(home, '.local/share'), ECC_HOMUNCULUS_DIR: path.join(data, 'homunculus'),
  ECC_SESSION_START_CONTEXT: 'true', ECC_SESSION_START_MAX_CHARS: '8000', ECC_SESSION_RETENTION_DAYS: '30' };
let passed = 0;
let failed = 0;
try {
  for (const code of [null, 'EACCES', 'EPERM']) {
    const faultCount = path.join(root, `fault-count-${code}.json`);
    const args = [];
    if (code) {
      const preload = path.join(root, `deny-${code}.cjs`);
      fs.writeFileSync(preload, [
        "const fs=require('fs'), vm=require('vm');",
        `const file=${JSON.stringify(aliasPath)}, helper=${JSON.stringify(path.join(repo, 'scripts/lib/atomic-write.js'))};`,
        'const original=fs.readFileSync; let denied=0;',
        `fs.readFileSync=function(input){ if(input===file){ denied++; throw Object.assign(new Error('injected unreadable aliases'),{code:${JSON.stringify(code)}}); } return original.apply(this,arguments); };`,
        'const record={exports:{}};',
        "vm.runInNewContext(original(helper,'utf8'),{module:record,exports:record.exports,require,process:{platform:'win32',pid:process.pid},performance,Atomics,SharedArrayBuffer,Int32Array},{filename:helper});",
        'require.cache[helper]={id:helper,filename:helper,loaded:true,exports:record.exports};',
        `process.on('exit',()=>fs.writeFileSync(${JSON.stringify(faultCount)},JSON.stringify(denied)));`
      ].join('\n'));
      args.push('--require', preload);
    }
    try {
      const result = spawnSync(process.execPath, [...args, path.join(repo, 'scripts/hooks/session-start.js')], {
        cwd: project, env, input: JSON.stringify({ hook_event_name: 'SessionStart', source: 'startup', session_id: `startup-${code}`, cwd: project }),
        encoding: 'utf8', timeout: 15000,
      });
      assert.ifError(result.error);
      assert.strictEqual(result.status, 0, result.stderr);
      const output = JSON.parse(result.stdout);
      assert.strictEqual(output.hookSpecificOutput.hookEventName, 'SessionStart');
      const context = output.hookSpecificOutput.additionalContext;
      assert.match(context, /startup-history-sentinel/);
      assert.match(context, /HISTORICAL REFERENCE ONLY/);
      assert.match(context, /startup-learned-sentinel/);
      assert.match(context, /Project type:/);
      assert.match(result.stderr, /Package manager:/);
      assert.match(result.stderr, /No package manager preference found/);
      if (code) {
        assert.match(result.stderr, /Session aliases unavailable/);
        assert.ok(JSON.parse(fs.readFileSync(faultCount, 'utf8')) >= 1);
      } else assert.match(result.stderr, /session alias\(es\) available: kept/);
      assert.strictEqual(fs.readFileSync(aliasPath, 'utf8'), aliasBytes);
      passed++; console.log(`PASS actual startup preserves context with ${code || 'readable'} aliases`);
    } catch (error) { failed++; console.error(`FAIL ${code || 'readable'}: ${error.stack}`); }
  }
} finally { fs.rmSync(root, { recursive: true, force: true }); }
console.log(`Results: Passed: ${passed}, Failed: ${failed}`);
process.exitCode = failed ? 1 : 0;
