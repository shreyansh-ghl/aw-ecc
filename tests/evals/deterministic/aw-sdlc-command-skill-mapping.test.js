const assert = require('assert');
const path = require('path');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const PUBLIC_COMMANDS = [
  { command: 'plan', skill: 'aw-plan', skillPath: 'skills/aw-plan/SKILL.md' },
  { command: 'build', skill: 'aw-build', skillPath: 'skills/aw-build/SKILL.md' },
  { command: 'investigate', skill: 'aw-investigate', skillPath: 'skills/aw-investigate/SKILL.md' },
  { command: 'test', skill: 'aw-test', skillPath: 'skills/aw-test/SKILL.md' },
  { command: 'review', skill: 'aw-review', skillPath: 'skills/aw-review/SKILL.md' },
  { command: 'deploy', skill: 'aw-deploy', skillPath: 'skills/aw-deploy/SKILL.md' },
  { command: 'ship', skill: 'aw-ship', skillPath: 'skills/aw-ship/SKILL.md' },
];

const NON_PUBLIC_COMMANDS = [
  { command: 'brainstorm', statuses: ['internal', 'deprecated', 'alias'] },
  { command: 'finish', statuses: ['internal', 'deprecated', 'alias'] },
  { command: 'execute', statuses: ['active'] },
  { command: 'verify', statuses: ['active'] },
  { command: 'code-review', statuses: ['alias'] },
  { command: 'tdd', statuses: ['alias'] },
];

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

function commandFrontmatter(commandName) {
  const commandPath = path.join('commands', `${commandName}.md`);
  assert.ok(snapshot.fileExists(commandPath), `Missing ${commandPath}`);
  return parseFrontmatter(snapshot.readFile(commandPath));
}

function run() {
  console.log(`\n=== AW SDLC Command/Skill Mapping (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('architecture doc exists', () => {
    assert.ok(
      snapshot.fileExists('docs/aw-sdlc-command-skill-architecture.md'),
      'Expected docs/aw-sdlc-command-skill-architecture.md to exist'
    );
  })) passed++; else failed++;

  if (test('every active command declares the expected primary skill', () => {
    for (const entry of PUBLIC_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.strictEqual(frontmatter.status, 'active', `${entry.command} must stay active`);
      assert.strictEqual(
        frontmatter.internal_skill,
        entry.skill,
        `${entry.command} should map to ${entry.skill}`
      );
    }
  })) passed++; else failed++;

  if (test('every declared primary skill file exists', () => {
    for (const entry of PUBLIC_COMMANDS) {
      assert.ok(snapshot.fileExists(entry.skillPath), `Missing ${entry.skillPath}`);
      const content = snapshot.readFile(entry.skillPath);
      assert.ok(content.includes(`name: ${entry.skill}`), `${entry.skillPath} should declare ${entry.skill}`);
    }
  })) passed++; else failed++;

  if (test('compatibility and helper commands stay off the canonical public-stage list', () => {
    for (const entry of NON_PUBLIC_COMMANDS) {
      const frontmatter = commandFrontmatter(entry.command);
      assert.ok(
        entry.statuses.includes(frontmatter.status),
        `${entry.command} should be one of [${entry.statuses.join(', ')}], received ${frontmatter.status || '(missing)'}`
      );
      if (entry.command === 'execute' || entry.command === 'verify') {
        assert.strictEqual(frontmatter.stage, 'compatibility', `${entry.command} should stay in compatibility stage`);
      }
    }
  })) passed++; else failed++;

  if (test('compatibility verify points to test and review instead of owning the whole stage', () => {
    const verifySkill = snapshot.readFile('skills/aw-verify/SKILL.md');
    assert.ok(verifySkill.includes('aw-test'), 'aw-verify should route to aw-test');
    assert.ok(verifySkill.includes('aw-review'), 'aw-verify should route to aw-review');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
