const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

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

function command(commandName) {
  const content = snapshot.readFile(`commands/${commandName}.md`);
  return { content, frontmatter: parseFrontmatter(content) };
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
  console.log(`\n=== AW Command Aliases (${REF}) ===\n`);

  const execute = command('execute');
  const verify = command('verify');
  const codeReview = command('code-review');
  const tdd = command('tdd');
  const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
  const verifySkill = snapshot.readFile('skills/aw-verify/SKILL.md');

  let passed = 0;
  let failed = 0;

  if (test('execute stays a compatibility entrypoint to build', () => {
    assert.strictEqual(execute.frontmatter.stage, 'compatibility');
    assert.strictEqual(execute.frontmatter.internal_skill, 'aw-build');
    assert.ok(execute.content.includes('canonical implementation stage is `/aw:build`'));
    assert.ok(execute.content.includes('/aw:test'));
    assert.ok(execute.content.includes('/aw:review'));
    assert.ok(executeSkill.includes('compatibility layer'));
    assert.ok(executeSkill.includes('aw-build'));
  })) passed++; else failed++;

  if (test('verify stays a compatibility umbrella for test and review', () => {
    assert.strictEqual(verify.frontmatter.stage, 'compatibility');
    assert.strictEqual(verify.frontmatter.internal_skill, 'aw-verify');
    assert.ok(verify.content.includes('/aw:test'));
    assert.ok(verify.content.includes('/aw:review'));
    assert.ok(verify.content.includes('Compatibility Mapping'));
    assert.ok(verifySkill.includes('compatibility layer'));
    assert.ok(verifySkill.includes('aw-test'));
    assert.ok(verifySkill.includes('aw-review'));
  })) passed++; else failed++;

  if (test('code-review aliases into review instead of restoring a separate review command family', () => {
    assert.strictEqual(codeReview.frontmatter.status, 'alias');
    assert.strictEqual(codeReview.frontmatter.stage, 'review');
    assert.strictEqual(codeReview.frontmatter['aliases-to'], 'aw:review');
    assert.ok(codeReview.content.includes('The canonical review surface is `/aw:review`'));
    assert.ok(codeReview.content.includes('findings severity'));
  })) passed++; else failed++;

  if (test('tdd aliases into build instead of bypassing the new stage model', () => {
    assert.strictEqual(tdd.frontmatter.status, 'alias');
    assert.strictEqual(tdd.frontmatter.stage, 'build');
    assert.strictEqual(tdd.frontmatter['aliases-to'], 'aw:build');
    assert.ok(tdd.content.includes('The canonical implementation surface is `/aw:build`'));
    assert.ok(tdd.content.includes('references/testing-patterns.md'));
  })) passed++; else failed++;

  if (test('aliases preserve guidance without reintroducing legacy public ownership', () => {
    assert.ok(!snapshot.fileExists('commands/debug.md'), 'debug should stay internal');
    assert.ok(!snapshot.fileExists('commands/yolo.md'), 'yolo should stay internal');
    assert.ok(execute.content.includes('must not drift into a separate execute-only workflow'));
    assert.ok(verify.content.includes('must not preserve the old overloaded verify semantics'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
