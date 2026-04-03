const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const PUBLIC_COMMANDS = ['plan', 'execute', 'verify', 'deploy', 'ship'];
const INTERNAL_HELPER_TOKENS = ['aw-review', 'aw-debug'];
const LEGACY_HELPERS = [
  { command: 'brainstorm', canonical: '/aw:plan' },
  { command: 'finish', canonical: '/aw:deploy' },
];

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    return true;
  } catch (error) {
    console.log(`  FAIL ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

function run() {
  console.log(`\n=== AW SDLC Command Boundaries (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('architecture doc defines thin command vs deep skill ownership', () => {
    const architecture = snapshot.readFile('docs/aw-sdlc-command-skill-architecture.md');
    assert.ok(architecture.includes('Commands should stay thin.'));
    assert.ok(architecture.includes('Never define the full workflow twice.'));
    assert.ok(architecture.includes('subskills are reusable capabilities used by the stage skills'));
  })) passed++; else failed++;

  if (test('public commands do not expose internal helper skills directly', () => {
    for (const command of PUBLIC_COMMANDS) {
      const content = snapshot.readFile(path.join('commands', `${command}.md`));
      for (const token of INTERNAL_HELPER_TOKENS) {
        assert.ok(
          !content.includes(token),
          `${command}.md should keep ${token} behind the skill boundary`
        );
      }
    }
  })) passed++; else failed++;

  if (test('legacy helper commands stay thin compatibility wrappers', () => {
    for (const entry of LEGACY_HELPERS) {
      const content = snapshot.readFile(path.join('commands', `${entry.command}.md`));
      assert.ok(content.includes(entry.canonical), `${entry.command}.md should route people to ${entry.canonical}`);
      assert.ok(!content.includes('## Role'), `${entry.command}.md should stay thin`);
      assert.ok(!content.includes('## Hard Gates'), `${entry.command}.md should keep workflow depth in skills`);
    }
  })) passed++; else failed++;

  if (test('specialized review and debugging behavior lives in internal skills', () => {
    const reviewLoop = snapshot.readFile('skills/aw-review/SKILL.md');
    const debugging = snapshot.readFile('skills/aw-debug/SKILL.md');
    assert.ok(reviewLoop.includes('Requested Review'));
    assert.ok(reviewLoop.includes('Re-review Status'));
    assert.ok(debugging.includes('Reproduction'));
    assert.ok(debugging.includes('Expected vs Actual'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
