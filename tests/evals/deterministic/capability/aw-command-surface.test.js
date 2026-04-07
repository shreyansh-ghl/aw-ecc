const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');
const { parseFrontmatter } = require('../../lib/markdown-frontmatter');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const CANONICAL_COMMANDS = [
  { command: 'plan', stage: 'plan', internalSkill: 'aw-plan' },
  { command: 'build', stage: 'build', internalSkill: 'aw-build' },
  { command: 'investigate', stage: 'investigate', internalSkill: 'aw-investigate' },
  { command: 'test', stage: 'test', internalSkill: 'aw-test' },
  { command: 'review', stage: 'review', internalSkill: 'aw-review' },
  { command: 'deploy', stage: 'deploy', internalSkill: 'aw-deploy' },
  { command: 'ship', stage: 'ship', internalSkill: 'aw-ship' },
];

const COMPATIBILITY_COMMANDS = [
  { command: 'execute', stage: 'compatibility', internalSkill: 'aw-build' },
  { command: 'verify', stage: 'compatibility', internalSkill: 'aw-verify' },
];

const ALIAS_COMMANDS = [
  { command: 'code-review', stage: 'review', aliasesTo: 'aw:review' },
  { command: 'tdd', stage: 'build', aliasesTo: 'aw:build' },
];

const SURFACE_DOCS = [
  'AGENTS.md',
  'README.md',
  'docs/aw-sdlc-command-contracts.md',
  'docs/aw-sdlc-command-skill-architecture.md',
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
  console.log(`\n=== AW Command Surface (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('canonical public command files exist and stay active', () => {
    for (const entry of CANONICAL_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.strictEqual(frontmatter.status, 'active', `${entry.command} must stay active`);
      assert.strictEqual(frontmatter.stage, entry.stage, `${entry.command} should stay in ${entry.stage}`);
      assert.strictEqual(frontmatter.internal_skill, entry.internalSkill, `${entry.command} should map to ${entry.internalSkill}`);
    }
  })) passed++; else failed++;

  if (test('surface docs advertise the canonical stage sequence', () => {
    for (const docPath of SURFACE_DOCS) {
      const content = snapshot.readFile(docPath);
      for (const entry of CANONICAL_COMMANDS) {
        assert.ok(content.includes(`/aw:${entry.command}`), `${docPath} is missing /aw:${entry.command}`);
      }
    }
  })) passed++; else failed++;

  if (test('compatibility commands stay explicit and off the canonical stage list', () => {
    for (const entry of COMPATIBILITY_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.strictEqual(frontmatter.status, 'active', `${entry.command} should remain active for migration`);
      assert.strictEqual(frontmatter.stage, entry.stage, `${entry.command} should remain compatibility-only`);
      assert.strictEqual(frontmatter.internal_skill, entry.internalSkill, `${entry.command} should route to ${entry.internalSkill}`);
    }
  })) passed++; else failed++;

  if (test('aliases point to canonical commands instead of expanding the public surface', () => {
    for (const entry of ALIAS_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.strictEqual(frontmatter.status, 'alias', `${entry.command} should stay an alias`);
      assert.strictEqual(frontmatter.stage, entry.stage, `${entry.command} should stay in ${entry.stage}`);
      assert.strictEqual(frontmatter['aliases-to'], entry.aliasesTo, `${entry.command} should alias to ${entry.aliasesTo}`);
    }
  })) passed++; else failed++;

  if (test('aw-yolo exists only as an internal skill, not a public command', () => {
    assert.ok(snapshot.fileExists('skills/aw-yolo/SKILL.md'), 'Missing skills/aw-yolo/SKILL.md');
    assert.ok(!snapshot.fileExists('commands/yolo.md'), 'aw-yolo should not be exposed as a public command');
  })) passed++; else failed++;

  if (test('ship remains part of the public surface while yolo stays internal', () => {
    const router = snapshot.readFile('skills/using-aw-skills/SKILL.md');
    assert.ok(router.includes('/aw:ship'));
    assert.ok(router.includes('aw-yolo'));
    assert.ok(router.includes('internal power workflow'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
