const assert = require('assert');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

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

  if (test('ship keeps aw-prepare internal while using it as a hidden setup gate', () => {
    assert.ok(commandContent.includes('`aw-prepare`'), 'ship command should mention the internal aw-prepare layer');
    assert.ok(skillContent.includes('`aw-prepare`'), 'ship skill should mention the internal aw-prepare layer');
    assert.ok(commandContent.includes('must not become a public command'));
    assert.ok(skillContent.includes('public route'));
    assert.ok(commandContent.includes('source snapshot or eval workspace'));
    assert.ok(skillContent.includes('degraded snapshot mode'));
  })) passed++; else failed++;

  if (test('ship command stays explicit and not the default path for narrow work', () => {
    assert.ok(commandContent.includes('smallest correct sequence'));
    assert.ok(commandContent.includes('must not silently broaden a narrow request into full ship'));
    assert.ok(commandContent.includes('do not stop after `plan`, `execute`, or `verify`'));
    assert.ok(skillContent.includes('do not end `/aw:ship` after planning or verification'));
  })) passed++; else failed++;

  if (test('ship can perform one bounded repair cycle inside the selected flow', () => {
    assert.ok(commandContent.includes('one internal repair cycle'));
    assert.ok(commandContent.includes('execute -> verify repair cycle'));
    assert.ok(skillContent.includes('one bounded repair cycle'));
    assert.ok(skillContent.includes('aw-execute -> aw-verify'));
  })) passed++; else failed++;

  if (test('ship preserves per-stage artifact obligations during internal traversal', () => {
    assert.ok(commandContent.includes('execution.md'));
    assert.ok(commandContent.includes('verification.md'));
    assert.ok(commandContent.includes('release.md'));
    assert.ok(skillContent.includes('execution.md'));
    assert.ok(skillContent.includes('verification.md'));
    assert.ok(skillContent.includes('release.md'));
    assert.ok(skillContent.includes('required stage artifacts are written to disk'));
  })) passed++; else failed++;

  if (test('ship fast path skips replanning when approved technical inputs are already concrete', () => {
    assert.ok(commandContent.includes('should not reopen planning'));
    assert.ok(commandContent.includes('prepare -> execute -> verify -> deploy'));
    assert.ok(skillContent.includes('Fast Path: Approved Plan To Staging'));
    assert.ok(skillContent.includes('skip replanning'));
    assert.ok(skillContent.includes('Do not reopen `aw-plan`'));
  })) passed++; else failed++;

  if (test('ship rejects diffs or summaries as substitutes for required stage artifacts', () => {
    assert.ok(commandContent.includes('code diff'));
    assert.ok(commandContent.includes('required stage artifact files'));
    assert.ok(skillContent.includes('code diff'));
    assert.ok(skillContent.includes('execution.md'));
    assert.ok(skillContent.includes('verification.md'));
    assert.ok(skillContent.includes('release.md'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
