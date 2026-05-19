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
  assert.ok(content.includes('exactly one `aw:echo` subagent'), `${label} must authorize one aw:echo subagent`);
  assert.ok(content.includes('platform-core:human-collaboration-artifacts') && content.includes('generated_hca_fallback'), `${label} must require controlled HCA fallback generation`);
  assert.ok(content.includes('generated_hca_fallback'), `${label} must require a recorded HCA fallback when Echo is unavailable`);
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

  if (test('stage skills require real HTML sidecars and controlled HCA fallback generation', () => {
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

  if (test('plan gives Codex a valid Echo subagent spawn shape', () => {
    const planCommand = snapshot.readFile('commands/plan.md');
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');

    for (const [label, content] of [
      ['commands/plan.md', planCommand],
      ['skills/aw-plan/SKILL.md', planSkill],
    ]) {
      assert.ok(content.includes('spawn the `echo` agent role without a full-history fork'), `${label} must avoid invalid forked Echo spawn shape`);
      assert.ok(content.includes('omit `agent_type`, `model`, and `reasoning_effort`'), `${label} must document inherited fields for full-history fork fallback`);
    }
  })) passed++; else failed++;

  if (test('existing build-ready plans still repair stale or unpublished HTML companions', () => {
    const planCommand = snapshot.readFile('commands/plan.md');
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
    const contracts = snapshot.readFile('docs/aw-sdlc-command-contracts.md');
    const router = snapshot.readFile('skills/using-aw-skills/SKILL.md');

    for (const [label, content] of [
      ['commands/plan.md', planCommand],
      ['skills/aw-plan/SKILL.md', planSkill],
      ['docs/aw-sdlc-command-contracts.md', contracts],
      ['skills/using-aw-skills/SKILL.md', router],
    ]) {
      assert.ok(content.includes('existing'), `${label} must cover existing artifact folders`);
      assert.ok(content.includes('legacy uncontrolled fallback'), `${label} must repair old uncontrolled fallback sidecars`);
      assert.ok(content.includes('local-only') || content.includes('local_only'), `${label} must repair local-only companions`);
      assert.ok(content.includes('remote links'), `${label} must require remote links for dual/html output`);
    }

    assert.ok(planCommand.includes('ready_for_build'), 'commands/plan.md must reject ready_for_build-only short-circuiting');
    assert.ok(planSkill.includes('ready_for_build'), 'skills/aw-plan/SKILL.md must reject ready_for_build-only short-circuiting');
    assert.ok(contracts.includes('ready_for_build'), 'contracts must reject ready_for_build-only short-circuiting');
    assert.ok(planCommand.includes('Echo handoff'), 'commands/plan.md must route repair through Echo');
    assert.ok(planSkill.includes('Echo handoff'), 'skills/aw-plan/SKILL.md must route repair through Echo');
    assert.ok(contracts.includes('Echo handoff'), 'contracts must route repair through Echo');
    assert.ok(planCommand.includes('generated_hca_fallback'), 'commands/plan.md must repair HCA fallback sidecars when Echo is available');
    assert.ok(planSkill.includes('generated_hca_fallback'), 'skills/aw-plan/SKILL.md must repair HCA fallback sidecars when Echo is available');
    assert.ok(contracts.includes('generated_hca_fallback'), 'contracts must repair HCA fallback sidecars when Echo is available');
    assert.ok(planCommand.includes('relative `/too/docs/...` paths are not enough'), 'commands/plan.md must require absolute TeamOfOne URLs when configured');
    assert.ok(planSkill.includes('relative `/too/docs/...` paths are not enough'), 'skills/aw-plan/SKILL.md must require absolute TeamOfOne URLs when configured');
    assert.ok(router.includes('repair human docs handoff'), 'router must route incomplete human docs to aw-plan repair');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
