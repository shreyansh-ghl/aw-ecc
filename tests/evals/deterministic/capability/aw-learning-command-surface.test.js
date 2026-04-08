const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { parseFrontmatter } = require('../../lib/markdown-frontmatter');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const LEARNING_COMMANDS = [
  { command: 'learn', name: 'aw:learn' },
  { command: 'learn-eval', name: 'aw:learn-eval' },
  { command: 'instinct-status', name: 'aw:instinct-status' },
  { command: 'instinct-import', name: 'aw:instinct-import' },
  { command: 'instinct-export', name: 'aw:instinct-export' },
  { command: 'promote', name: 'aw:promote' },
  { command: 'evolve', name: 'aw:evolve' },
  { command: 'projects', name: 'aw:projects' },
  { command: 'publish-learning', name: 'aw:publish-learning' },
  { command: 'save-session', name: 'aw:save-session' },
  { command: 'resume-session', name: 'aw:resume-session' },
  { command: 'sessions', name: 'aw:sessions' },
];

const PORTABILITY_DOCS = [
  '.codex/INSTALL.md',
  '.cursor/INSTALL.md',
  '.claude/INSTALL.md',
  'docs/SKILL-PLACEMENT-POLICY.md',
  'README.md',
];

function commandFrontmatter(commandName) {
  const commandPath = `commands/${commandName}.md`;
  assert.ok(snapshot.fileExists(commandPath), `Missing ${commandPath}`);
  return parseFrontmatter(snapshot.readFile(commandPath));
}

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
  console.log(`\n=== AW Learning Command Surface (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('learning commands declare aw-prefixed canonical names', () => {
    for (const entry of LEARNING_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.strictEqual(frontmatter.name, entry.name, `${entry.command} should expose ${entry.name}`);
      assert.strictEqual(frontmatter.status, 'active', `${entry.command} should stay active`);
      assert.strictEqual(frontmatter.stage, 'learning', `${entry.command} should declare learning stage`);
    }
  })) passed++; else failed++;

  if (test('publish-learning makes repo skills the portable cross-harness surface', () => {
    const publish = snapshot.readFile('commands/publish-learning.md');
    assert.ok(publish.includes('skills/'), 'publish-learning should target repo skills/');
    assert.ok(publish.includes('Codex, Cursor, and Claude'), 'publish-learning should describe cross-harness portability');

    const learnEval = snapshot.readFile('commands/learn-eval.md');
    const evolve = snapshot.readFile('commands/evolve.md');
    assert.ok(learnEval.includes('/aw:publish-learning'), 'learn-eval should route portable patterns to publish-learning');
    assert.ok(evolve.includes('/aw:publish-learning'), 'evolve should route portable patterns to publish-learning');
  })) passed++; else failed++;

  if (test('install and placement docs describe publish-learning as the portable path', () => {
    for (const docPath of PORTABILITY_DOCS) {
      const content = snapshot.readFile(docPath);
      assert.ok(content.includes('/aw:publish-learning'), `${docPath} should mention /aw:publish-learning`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
