const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

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

function assertRequiredHtmlContract(content, label) {
  assert.ok(content.includes('HTML sidecars are required'), `${label} must make HTML required`);
  assert.ok(content.includes('platform-core:human-collaboration-artifacts'), `${label} must use the HCA skill`);
  assert.ok(content.includes('exactly one `aw:echo` subagent') || content.includes('optional Echo subagent'), `${label} must preserve optional aw:echo delegation`);
  assert.ok(content.includes('execution_mode'), `${label} must record generation provenance`);
  assert.ok(content.includes('owner'), `${label} must record HCA ownership`);
  assert.ok(content.includes('do not create stage-local fallback HTML'), `${label} must not hand-roll fallback HTML`);
  assert.ok(!content.includes('generated_fallback'), `${label} must not allow generated_fallback HTML`);
  assert.ok(!content.includes('skipped by output mode'), `${label} must not silently skip HTML via output mode`);
}

function run() {
  console.log(`\n=== AW SDLC Required HTML Sidecars (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  const stageCommands = [
    'commands/plan.md',
    'commands/build.md',
    'commands/execute.md',
    'commands/test.md',
    'commands/verify.md',
    'commands/review.md',
    'commands/investigate.md',
    'commands/deploy.md',
    'commands/ship.md',
    'commands/feature.md',
  ];

  const stageSkills = [
    'skills/aw-plan/SKILL.md',
    'skills/aw-spec/SKILL.md',
    'skills/aw-tasks/SKILL.md',
    'skills/aw-build/SKILL.md',
    'skills/aw-test/SKILL.md',
    'skills/aw-review/SKILL.md',
    'skills/aw-investigate/SKILL.md',
    'skills/aw-deploy/SKILL.md',
    'skills/aw-ship/SKILL.md',
    'skills/aw-feature/SKILL.md',
    'skills/aw-yolo/SKILL.md',
  ];

  if (test('public SDLC commands require real HTML sidecars', () => {
    for (const file of stageCommands) {
      assertRequiredHtmlContract(snapshot.readFile(file), file);
    }
  })) passed++; else failed++;

  if (test('stage skills require real HTML sidecars through the HCA skill path', () => {
    for (const file of stageSkills) {
      assertRequiredHtmlContract(snapshot.readFile(file), file);
    }
  })) passed++; else failed++;

  if (test('plan sidecars are explicitly colocated with canonical markdown', () => {
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
    for (const pair of [
      '`prd.md` -> `prd.html`',
      '`design.md` -> `design.html`',
      '`spec.md` -> `spec.html`',
      '`tasks.md` -> `tasks.html`',
    ]) {
      assert.ok(planSkill.includes(pair), `aw-plan missing ${pair}`);
    }
  })) passed++; else failed++;

  if (test('Markdown-only cannot be inferred from config or environment', () => {
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
    assert.ok(planSkill.includes('explicit user request for Markdown-only'));
    assert.ok(planSkill.includes('must not silently suppress required SDLC HTML sidecars'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
