const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { parseFrontmatter } = require('../../lib/markdown-frontmatter');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

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

function getCommandFrontmatter(commandName) {
  const filePath = path.join('commands', `${commandName}.md`);
  assert.ok(snapshot.fileExists(filePath), `${filePath} is missing at ${REF}`);
  return parseFrontmatter(snapshot.readFile(filePath));
}

function run() {
  console.log(`\n=== AW SDLC Goal Gates (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('public commands exist for the minimal interface', () => {
    for (const commandName of ['plan', 'execute', 'verify', 'deploy']) {
      assert.ok(
        snapshot.fileExists(`commands/${commandName}.md`),
        `Expected commands/${commandName}.md to exist`
      );
    }
  })) passed++; else failed++;

  if (test('public commands are first-class active commands', () => {
    for (const commandName of ['plan', 'execute', 'verify', 'deploy']) {
      const frontmatter = getCommandFrontmatter(commandName);
      assert.strictEqual(
        frontmatter.status,
        'active',
        `Expected ${commandName}.md status=active, received ${frontmatter.status || '(missing)'}`
      );
    }
  })) passed++; else failed++;

  if (test('internal helper commands are not exposed as active public stages', () => {
    for (const commandName of ['brainstorm', 'finish']) {
      if (!snapshot.fileExists(`commands/${commandName}.md`)) continue;
      const frontmatter = getCommandFrontmatter(commandName);
      assert.notStrictEqual(
        frontmatter.status,
        'active',
        `Expected ${commandName}.md to be internal/alias/deprecated rather than active`
      );
    }
  })) passed++; else failed++;

  if (test('router skill advertises the minimal public command surface', () => {
    const content = snapshot.readFile('skills/using-aw-skills/SKILL.md');
    for (const token of ['/aw:plan', '/aw:build', '/aw:investigate', '/aw:test', '/aw:review', '/aw:deploy', '/aw:ship']) {
      assert.ok(content.includes(token), `Router skill is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('source-of-truth docs exist for plan, contracts, acceptance criteria, and test plan', () => {
    for (const filePath of [
      'docs/aw-sdlc-e2e-plan.md',
      'docs/aw-sdlc-command-contracts.md',
      'docs/aw-sdlc-acceptance-criteria.md',
      'docs/aw-sdlc-test-plan.md',
    ]) {
      assert.ok(snapshot.fileExists(filePath), `Expected ${filePath} to exist at ${REF}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
