const assert = require('assert');
const { createRepoSnapshot } = require('./lib/repo-snapshot');

const REPO_ROOT = '/Users/prathameshai/Documents/Agentic Workspace/aw-ecc';
const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  const attributes = {};
  if (!match) return attributes;

  for (const line of match[1].split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    attributes[key] = value;
  }

  return attributes;
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
  console.log(`\n=== AW SDLC Ship Command (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  const commandContent = snapshot.readFile('commands/ship.md');
  const commandFrontmatter = parseFrontmatter(commandContent);
  const skillContent = snapshot.readFile('skills/aw-ship/SKILL.md');

  if (test('ship command exists and is active', () => {
    assert.strictEqual(commandFrontmatter.name, 'aw:ship');
    assert.strictEqual(commandFrontmatter.status, 'active');
    assert.strictEqual(commandFrontmatter.internal_skill, 'aw-ship');
  })) passed++; else failed++;

  if (test('ship skill exists and declares aw-ship', () => {
    assert.ok(skillContent.includes('name: aw-ship'));
  })) passed++; else failed++;

  if (test('ship command explicitly composes all four stage commands', () => {
    for (const token of ['`aw-plan`', '`aw-execute`', '`aw-verify`', '`aw-deploy`']) {
      assert.ok(commandContent.includes(token), `ship command is missing ${token}`);
      assert.ok(skillContent.includes(token), `ship skill is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('ship command stays explicit and not the default path for narrow work', () => {
    assert.ok(commandContent.includes('smallest correct sequence'));
    assert.ok(commandContent.includes('must not silently broaden a narrow request into full ship'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
