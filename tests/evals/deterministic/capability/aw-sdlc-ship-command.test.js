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
  const yoloSkill = snapshot.readFile('skills/aw-yolo/SKILL.md');

  if (test('ship command exists and is active', () => {
    assert.strictEqual(commandFrontmatter.name, 'aw:ship');
    assert.strictEqual(commandFrontmatter.status, 'active');
    assert.strictEqual(commandFrontmatter.internal_skill, 'aw-ship');
  })) passed++; else failed++;

  if (test('ship skill exists and declares aw-ship', () => {
    assert.ok(skillContent.includes('name: aw-ship'));
  })) passed++; else failed++;

  if (test('ship stays a launch-stage contract instead of the old composite workflow', () => {
    for (const token of ['launch', 'rollout', 'rollback', 'closeout']) {
      assert.ok(commandContent.toLowerCase().includes(token), `ship command is missing ${token}`);
      assert.ok(skillContent.toLowerCase().includes(token), `ship skill is missing ${token}`);
    }
    assert.ok(commandContent.includes('not as the old composite "do everything" shortcut'));
    assert.ok(skillContent.includes('not the composite "do everything" workflow'));
  })) passed++; else failed++;

  if (test('aw-yolo now owns the explicit full-flow automation path', () => {
    assert.ok(yoloSkill.includes('name: aw-yolo'));
    for (const token of ['`aw-plan`', '`aw-build`', '`aw-test`', '`aw-review`', '`aw-deploy`', '`aw-ship`']) {
      assert.ok(yoloSkill.includes(token), `aw-yolo is missing ${token}`);
    }
    assert.ok(yoloSkill.includes('explicit full-flow orchestration skill'));
    assert.ok(yoloSkill.includes('Do not use by default.'));
  })) passed++; else failed++;

  if (test('ship and yolo preserve clear boundary semantics', () => {
    assert.ok(commandContent.includes('must not quietly rerun the whole SDLC under the name `ship`'));
    assert.ok(skillContent.includes('Do not use for end-to-end orchestration.'));
    assert.ok(yoloSkill.includes('the user explicitly asks to handle the full flow in one run'));
  })) passed++; else failed++;

  if (test('aw-yolo preserves stage artifact obligations across the flow', () => {
    assert.ok(yoloSkill.includes('execution.md'));
    assert.ok(yoloSkill.includes('verification.md'));
    assert.ok(yoloSkill.includes('release.md'));
    assert.ok(yoloSkill.includes('state.json'));
  })) passed++; else failed++;

  if (test('ship focuses on release evidence instead of build or review artifacts', () => {
    assert.ok(commandContent.includes('release.md'));
    assert.ok(skillContent.includes('release.md'));
    assert.ok(!commandContent.includes('execution.md'));
    assert.ok(!commandContent.includes('verification.md'));
    assert.ok(!skillContent.includes('execution.md'));
    assert.ok(!skillContent.includes('verification.md'));
  })) passed++; else failed++;

  if (test('ship uses the launch checklist and rollback readiness as hard expectations', () => {
    assert.ok(skillContent.includes('references/ship-launch-checklist.md'));
    assert.ok(commandContent.includes('rollback plan or blocker'));
    assert.ok(skillContent.includes('rollback readiness is documented'));
  })) passed++; else failed++;

  if (test('ship cleanly recommends review if launch blockers appear', () => {
    assert.ok(commandContent.includes('/aw:review'));
    assert.ok(skillContent.includes('blocker'));
  })) passed++; else failed++;

  if (test('ship and yolo both exist in the new model', () => {
    assert.ok(snapshot.fileExists('commands/ship.md'));
    assert.ok(snapshot.fileExists('skills/aw-ship/SKILL.md'));
    assert.ok(snapshot.fileExists('skills/aw-yolo/SKILL.md'));
  })) passed++; else failed++;

  if (test('ship is no longer described as the fast path from approved plan to staging', () => {
    assert.ok(!commandContent.includes('prepare -> execute -> verify -> deploy'));
    assert.ok(!skillContent.includes('Fast Path: Approved Plan To Staging'));
  })) passed++; else failed++;

  if (test('aw-yolo stops cleanly on blockers instead of pretending the whole run succeeded', () => {
    assert.ok(yoloSkill.includes('Stop cleanly on blockers.'));
    assert.ok(yoloSkill.includes('Name the blocking stage and the smallest safe next action.'));
  })) passed++; else failed++;

  if (test('ship does not use code diffs as a substitute for release evidence', () => {
    assert.ok(commandContent.includes('launch recommendation'));
    assert.ok(skillContent.includes('launch checklist'));
    assert.ok(!skillContent.includes('code diff'));
    assert.ok(skillContent.includes('release.md'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
