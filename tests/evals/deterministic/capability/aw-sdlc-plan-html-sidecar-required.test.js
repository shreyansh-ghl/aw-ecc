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
  assert.ok(content.includes('platform-core:echo-direct'), `${label} must require Echo Direct`);
  assert.ok(content.includes('Do not use a subagent for HTML generation'), `${label} must forbid HTML subagents`);
  assert.ok(content.includes('runner: platform-core:echo-direct'), `${label} must record Echo Direct runner provenance`);
  assert.ok(content.includes('status: generated'), `${label} must record successful skill output as generated`);
  assert.ok(content.includes('execution_mode: skill'), `${label} must record skill execution provenance`);
  assert.ok(content.includes('explicit Markdown-only mode') && content.includes('skip'), `${label} must document explicit markdown-only skip`);
  assert.ok(content.includes('`dual` and `html`'), `${label} must require HTML in dual and html modes`);
  assert.ok(content.includes('generated_fallback') && content.includes('generated_hca_fallback'), `${label} must repair legacy fallback statuses`);
  assert.ok(!content.includes('exactly one `aw:echo` subagent'), `${label} must not authorize aw:echo subagents`);
  assert.ok(!content.includes('echo_agent_status'), `${label} must not require Echo agent provenance`);
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
    'skills/aw-execute/SKILL.md',
    'skills/aw-test/SKILL.md',
    'skills/aw-verify/SKILL.md',
    'skills/aw-review/SKILL.md',
    'skills/aw-investigate/SKILL.md',
    'skills/aw-deploy/SKILL.md',
    'skills/aw-ship/SKILL.md',
    'skills/aw-feature/SKILL.md',
    'skills/aw-yolo/SKILL.md',
  ];

  if (test('public SDLC commands require Echo Direct HTML sidecars in dual/html modes', () => {
    for (const file of stageCommands) {
      assertRequiredHtmlContract(snapshot.readFile(file), file);
    }
  })) passed++; else failed++;

  if (test('stage skills require Echo Direct HTML sidecars in dual/html modes', () => {
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

  if (test('explicit Markdown-only mode skips HTML instead of silently suppressing it', () => {
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
    assert.ok(planSkill.includes('explicit Markdown-only mode skips HTML'));
    assert.ok(planSkill.includes('skip_reason: explicit_markdown_only'));
    assert.ok(planSkill.includes('In explicit Markdown-only mode, do not generate HTML.'));
    assert.ok(!planSkill.includes('must not silently suppress required SDLC HTML sidecars'));
  })) passed++; else failed++;

  if (test('SDLC stages use one direct skill path and no aw:echo spawn path', () => {
    const files = [...stageCommands, ...stageSkills];
    for (const file of files) {
      const content = snapshot.readFile(file);
      assert.ok(content.includes('platform-core:echo-direct'), `${file} must name Echo Direct`);
      assert.ok(content.includes('Do not use a subagent for HTML generation'), `${file} must forbid HTML subagents`);
      assert.ok(content.includes('runner: platform-core:echo-direct'), `${file} must record direct runner provenance`);
      assert.ok(!content.includes('spawn the `echo` agent role'), `${file} must not document Codex spawn shape`);
      assert.ok(!content.includes('omit `agent_type`, `model`, and `reasoning_effort`'), `${file} must not document subagent inherited fields`);
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
    assert.ok(planCommand.includes('Echo Direct Human Docs Handoff'), 'commands/plan.md must route repair through Echo Direct');
    assert.ok(planSkill.includes('Echo Direct Human Docs Handoff'), 'skills/aw-plan/SKILL.md must route repair through Echo Direct');
    assert.ok(contracts.includes('Echo Direct Remote Docs Handoff Rule'), 'contracts must route repair through Echo Direct');
    assert.ok(contracts.includes('legacy statuses that must be repaired'), 'contracts must repair legacy fallback sidecars');
    assert.ok(router.includes('repair human docs handoff'), 'router must route incomplete human docs to aw-plan repair');
  })) passed++; else failed++;

  if (test('final handoff must surface html remote links from state or last publish', () => {
    const planCommand = snapshot.readFile('commands/plan.md');
    const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
    const contracts = snapshot.readFile('docs/aw-sdlc-command-contracts.md');

    for (const [label, content] of [
      ['commands/plan.md', planCommand],
      ['skills/aw-plan/SKILL.md', planSkill],
      ['docs/aw-sdlc-command-contracts.md', contracts],
    ]) {
      assert.ok(content.includes('feature `state.json`'), `${label} must inspect feature state for remote links`);
      assert.ok(content.includes('`.aw_docs/last-publish.json`'), `${label} must inspect last publish metadata for remote links`);
      assert.ok(content.includes('Prefer `.html` companion links over `.md` links'), `${label} must prefer html remote links`);
      assert.ok(content.includes('A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete'), `${label} must reject md-only final handoffs when html links exist`);
      assert.ok(content.includes('TeamOfOne: <absolute remote URL>'), `${label} must require visible TeamOfOne URLs`);
      assert.ok(content.includes('GitHub: [spec.html](<absolute repository URL>)'), `${label} must require compact GitHub links`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
