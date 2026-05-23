const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const SKILL_ANATOMY = [
  {
    path: 'skills/aw-plan/SKILL.md',
    headings: ['## Overview', '## When to Use', '## The Planning Process', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-spec/SKILL.md',
    headings: ['## Overview', '## When to Use', '## The Gated Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-tasks/SKILL.md',
    headings: ['## Overview', '## When to Use', '## The Planning Process', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-build/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-investigate/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-test/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-review/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-deploy/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-ship/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
  {
    path: 'skills/aw-yolo/SKILL.md',
    headings: ['## Overview', '## When to Use', '## Workflow', '## Common Rationalizations', '## Red Flags', '## Verification'],
  },
];

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

function assertEchoDirectContract(content) {
  assert.ok(content.includes('platform-core:echo-direct'), 'missing Echo Direct runner');
  assert.ok(content.includes('platform-core:human-collaboration-artifacts'), 'missing HCA owner contract');
  assert.ok(content.includes('runner: platform-core:echo-direct'), 'missing Echo Direct state provenance');
  assert.ok(content.includes('echo_agent_status: in_process_fast_path'), 'missing in-process Echo Direct provenance');
  assert.ok(!content.includes('Spawn exactly one `aw:echo` subagent'), 'must not require aw:echo subagent spawning');
}

function assertHtmlProgressContract(content) {
  assert.ok(
    content.includes('status: generated') && content.includes('execution_mode: skill'),
    'missing Echo Direct generated status contract'
  );
  assert.ok(
    content.includes('do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`')
      || !content.includes('generated_fallback'),
    'must forbid fallback statuses for successful Echo Direct output'
  );
}

function assertOutputModeContract(content) {
  assert.ok(
    content.includes('docs.outputMode')
      || content.includes('Resolve output mode as:')
      || content.includes('output mode'),
    'missing output mode contract'
  );
}

function assertRemoteDocsPublishContract(content) {
  assert.ok(content.includes('platform-core:echo-direct'), 'missing Echo Direct handoff owner');
  assert.ok(content.includes('Remote Docs'), 'missing remote docs final handoff');
  assert.ok(content.includes('visible absolute TeamOfOne URLs'), 'remote docs must require visible absolute TeamOfOne URLs');
  assert.ok(content.includes('TeamOfOne: <absolute remote URL>'), 'missing visible TeamOfOne URL format');
  assert.ok(content.includes('GitHub: [spec.html](<absolute repository URL>)'), 'missing compact GitHub link format');
  assert.ok(content.includes('hide the TeamOfOne URL behind Markdown-only links'), 'missing TeamOfOne visibility guard');
  assert.ok(content.includes('print long GitHub URLs inline'), 'missing compact GitHub guard');
  assert.ok(content.includes('publish_status: blocked'), 'missing publish blocker contract');
  assert.ok(content.includes('feature `state.json`'), 'missing state remote-link inspection contract');
  assert.ok(content.includes('`.aw_docs/last-publish.json`'), 'missing last-publish remote-link inspection contract');
  assert.ok(content.includes('Prefer `.html` companion links over `.md` links'), 'missing html-link preference');
  assert.ok(content.includes('A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete'), 'missing markdown-only final handoff guard');
  assert.ok(!content.includes('aw push --aw-docs-only'), 'SDLC stages must not hardcode docs publish commands');
  assert.ok(!content.includes('sync.github_docs'), 'SDLC stages must not duplicate Echo publish config');
  assert.ok(!content.includes('complete feature docs folder'), 'SDLC stages must not own docs package publishing details');
}

function run() {
  console.log(`\n=== AW Stage Behavior Upgrades (${REF}) ===\n`);

  const planCommand = snapshot.readFile('commands/plan.md');
  const buildCommand = snapshot.readFile('commands/build.md');
  const investigateCommand = snapshot.readFile('commands/investigate.md');
  const testCommand = snapshot.readFile('commands/test.md');
  const reviewCommand = snapshot.readFile('commands/review.md');
  const deployCommand = snapshot.readFile('commands/deploy.md');
  const shipCommand = snapshot.readFile('commands/ship.md');
  const executeCommand = snapshot.readFile('commands/execute.md');
  const verifyCommand = snapshot.readFile('commands/verify.md');
  const featureCommand = snapshot.readFile('commands/feature.md');
  const commandContracts = snapshot.readFile('docs/aw-sdlc-command-contracts.md');

  const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
  const specSkill = snapshot.readFile('skills/aw-spec/SKILL.md');
  const tasksSkill = snapshot.readFile('skills/aw-tasks/SKILL.md');
  const buildSkill = snapshot.readFile('skills/aw-build/SKILL.md');
  const investigateSkill = snapshot.readFile('skills/aw-investigate/SKILL.md');
  const testSkill = snapshot.readFile('skills/aw-test/SKILL.md');
  const reviewSkill = snapshot.readFile('skills/aw-review/SKILL.md');
  const deploySkill = snapshot.readFile('skills/aw-deploy/SKILL.md');
  const shipSkill = snapshot.readFile('skills/aw-ship/SKILL.md');
  const featureSkill = snapshot.readFile('skills/aw-feature/SKILL.md');
  const yoloSkill = snapshot.readFile('skills/aw-yolo/SKILL.md');

  let passed = 0;
  let failed = 0;

  if (test('core stage skills follow the upgraded Addy-style anatomy', () => {
    for (const entry of SKILL_ANATOMY) {
      const content = snapshot.readFile(entry.path);
      for (const heading of entry.headings) {
        assert.ok(content.includes(heading), `${entry.path} is missing ${heading}`);
      }
    }
  })) passed++; else failed++;

  if (test('build stays thin-slice oriented and hands off instead of self-certifying', () => {
    assert.ok(buildCommand.includes('thin, reversible slices'));
    assert.ok(buildSkill.includes('thin, reversible increments'));
    assert.ok(buildSkill.includes('Continue through the approved build scope.'));
    assert.ok(buildSkill.includes('Do not stop after the first passing slice if more approved build slices remain.'));
    assert.ok(buildSkill.includes('`save_point_commits`'));
    assert.ok(buildSkill.includes('`completed_phases`'));
    assert.ok(buildSkill.includes('`current_phase`'));
    assert.ok(buildSkill.includes('Meaningful completed build slices must create save-point commits'));
    assert.ok(buildSkill.includes('record phase transitions explicitly'));
    assert.ok(buildSkill.includes('max_parallel_subagents: 3'));
    assert.ok(buildSkill.includes('Parallel build fan-out must stay within the planned `max_parallel_subagents` cap'));
    assert.ok(buildCommand.includes('must not stop after a successful slice if approved build work still remains'));
    assert.ok(buildCommand.includes('record each completed phase and name the next phase'));
    assert.ok(buildCommand.includes('Phase Progress'));
    assert.ok(buildCommand.includes('max_parallel_subagents'));
    assert.ok(buildCommand.includes('defaulting to `3`'));
    assert.ok(buildCommand.includes('/aw:test'));
    assert.ok(buildCommand.includes('/aw:review'));
    assert.ok(buildCommand.includes('must not deploy as part of build'));
  })) passed++; else failed++;

  if (test('investigate requires reproduction and evidence before broad fixes', () => {
    assert.ok(investigateCommand.includes('Reproduce'));
    assert.ok(investigateSkill.includes('Use `aw-debug` and `../../references/debug-triage.md`'));
    assert.ok(investigateCommand.includes('must not guess through an unclear root cause'));
    assert.ok(investigateSkill.includes('Prefer the smallest confirming probe over speculative patching.'));
  })) passed++; else failed++;

  if (test('test and review stay distinct but connected phases', () => {
    assert.ok(testCommand.includes('fresh QA evidence'));
    assert.ok(testCommand.includes('must not implement code while testing'));
    assert.ok(testSkill.includes('Continue through the requested QA scope.'));
    assert.ok(testSkill.includes('Route to `aw-review`'));
    assert.ok(reviewCommand.includes('correctness, simplicity, architecture, security, performance'));
    assert.ok(reviewSkill.includes('Correctness, readability and simplicity, architecture, security, and performance.'));
    assert.ok(reviewSkill.includes('Continue until the requested review scope is covered.'));
    assert.ok(reviewSkill.includes('route back to `aw-test`'));
  })) passed++; else failed++;

  if (test('deploy, ship, and yolo preserve the new release split', () => {
    assert.ok(deployCommand.includes('/aw:ship'));
    assert.ok(deploySkill.toLowerCase().includes('hand off to `aw-ship`'));
    assert.ok(shipCommand.includes('not as the old composite "do everything" shortcut'));
    assert.ok(shipSkill.includes('Do not use for end-to-end orchestration.'));
    assert.ok(yoloSkill.includes('explicit full-flow orchestration skill'));
    assert.ok(yoloSkill.includes('Do not use by default.'));
  })) passed++; else failed++;

  if (test('yolo preserves artifact discipline across the full flow', () => {
    for (const artifact of ['execution.md', 'verification.md', 'release.md', 'state.json']) {
      assert.ok(yoloSkill.includes(artifact), `aw-yolo should preserve ${artifact}`);
    }
    assert.ok(yoloSkill.includes('Stop cleanly on blockers.'));
  })) passed++; else failed++;

  if (test('the command contract requires stage continuation and explicit next-step handoff', () => {
    assert.ok(commandContracts.includes('## Stage Continuation And Handoff Rule'));
    assert.ok(commandContracts.includes('Each stage must finish its own requested scope before it hands off.'));
    assert.ok(commandContracts.includes('recommended_next_commands'));
    assert.ok(commandContracts.includes('save-point commits'));
    assert.ok(commandContracts.includes('completed_phases'));
    assert.ok(commandContracts.includes('current_phase'));
  })) passed++; else failed++;

  if (test('SDLC stages generate TeamOfOne HTML companions while keeping Markdown canonical', () => {
    assert.ok(commandContracts.includes('## Human HTML Companion Rule'));
    assert.ok(commandContracts.includes('## Echo Direct/HCA Remote Docs Handoff Rule'));
    assert.ok(commandContracts.includes('HTML companions are the TeamOfOne-readable surface'));
    assert.ok(commandContracts.includes('platform docs registry owns the reusable design system'));
    assert.ok(commandContracts.includes('remote publish behavior'));
    assert.ok(commandContracts.includes('`platform-core:echo-direct`'));
    assert.ok(commandContracts.includes('Do not spawn `aw:echo` for SDLC HTML generation unless the user explicitly asks'));
    assert.ok(commandContracts.includes('HTML generation is synchronous for SDLC final handoffs by default'));
    assertEchoDirectContract(commandContracts);
    assert.ok(commandContracts.includes('`runner`'));
    assert.ok(commandContracts.includes('`echo_agent_status`'));
    assert.ok(commandContracts.includes('must not rewrite the canonical Markdown source'));
    assert.ok(commandContracts.includes('`html_companion_artifacts`'));
    assertRemoteDocsPublishContract(commandContracts);
    assert.ok(commandContracts.includes('Echo Direct owns communication with humans'));
    assert.ok(commandContracts.includes('human docs package'));
    assert.ok(commandContracts.includes('Stages must not duplicate docs publish commands'));
    assert.ok(commandContracts.includes('platform docs registry is the source of truth'));
    assert.ok(commandContracts.includes('.aw_docs/features/<feature_slug>/<artifact_basename>.html'));
    assert.ok(!commandContracts.includes('server-managed'));
    assert.ok(!commandContracts.includes('subagent id or run handle'));
    assert.ok(!commandContracts.includes('.aw_docs/html/'));
    assert.ok(commandContracts.includes('platform-core:human-collaboration-artifacts'));
    assert.ok(!snapshot.fileExists('skills/aw-html-artifact-designer/SKILL.md'));
    assert.ok(!snapshot.fileExists('skills/aw-excalidraw-diagram-designer/SKILL.md'));
    assert.ok(!snapshot.fileExists('agents/html-artifact-designer.md'));

    const stageSkills = [
      planSkill,
      specSkill,
      tasksSkill,
      buildSkill,
      investigateSkill,
      testSkill,
      reviewSkill,
      deploySkill,
      shipSkill,
    ];

    for (const content of stageSkills) {
      assertEchoDirectContract(content);
      assertHtmlProgressContract(content);
      assert.ok(!content.includes('server-managed'));
      assert.ok(!content.includes('subagent id or run handle'));
      assert.ok(content.includes('platform-core:human-collaboration-artifacts'));
      assertOutputModeContract(content);
      assert.ok(content.includes('AW_DOCS_OUTPUT_MODE'));
      assert.ok(content.includes('html_companion_artifacts'));
      assertRemoteDocsPublishContract(content);
      assert.ok(content.includes('Markdown'));
      assert.ok(content.includes('canonical for agents'));
      assert.ok(!content.includes('.aw_docs/html/'));
    }

    assert.ok(planSkill.includes('`tasks.md` -> `tasks.html`'));
    assert.ok(specSkill.includes('.aw_docs/features/<feature_slug>/spec.html'));
    assert.ok(tasksSkill.includes('.aw_docs/features/<feature_slug>/tasks.html'));
    assert.ok(specSkill.includes('`technical-spec` profile'));
    assert.ok(tasksSkill.includes('`implementation-plan` profile'));
    assert.ok(buildSkill.includes('.aw_docs/features/<feature_slug>/execution.html'));
    assert.ok(investigateSkill.includes('.aw_docs/features/<feature_slug>/investigation.html'));
    assert.ok(testSkill.includes('.aw_docs/features/<feature_slug>/verification.html'));
    assert.ok(reviewSkill.includes('.aw_docs/features/<feature_slug>/verification.html'));
    assert.ok(deploySkill.includes('.aw_docs/features/<feature_slug>/release.html'));
    assert.ok(shipSkill.includes('.aw_docs/features/<feature_slug>/release.html'));
    assert.ok(investigateSkill.includes('`investigation-report` profile'));
    assert.ok(testSkill.includes('`verification-report` profile'));
    assert.ok(reviewSkill.includes('`pr-one-pager` profile'));
    assert.ok(deploySkill.includes('`release-report` profile'));
    assert.ok(shipSkill.includes('`release-report` profile'));

    const publicCommands = [
      planCommand,
      buildCommand,
      investigateCommand,
      testCommand,
      reviewCommand,
      deployCommand,
      shipCommand,
      executeCommand,
      verifyCommand,
      featureCommand,
    ];

    for (const content of publicCommands) {
      assert.ok(content.includes('## Human HTML Companion'));
      assert.ok(content.includes('HTML Companion'));
      assertEchoDirectContract(content);
      assertRemoteDocsPublishContract(content);
      assert.ok(!content.includes('server-managed'));
      assert.ok(content.includes('platform-core:human-collaboration-artifacts'));
      assert.ok(!content.includes('.aw_docs/html/'));
    }

    assert.ok(featureSkill.includes('HTML Companion'));
    assertRemoteDocsPublishContract(featureSkill);
    assertEchoDirectContract(featureSkill);
    assert.ok(yoloSkill.includes('HTML Companions'));
    assertRemoteDocsPublishContract(yoloSkill);
    assertEchoDirectContract(yoloSkill);
    assertHtmlProgressContract(yoloSkill);
    assert.ok(!featureSkill.includes('.aw_docs/html/'));
    assert.ok(!yoloSkill.includes('.aw_docs/html/'));
    assert.ok(featureSkill.includes('platform-core:human-collaboration-artifacts'));
    assert.ok(yoloSkill.includes('platform-core:human-collaboration-artifacts'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
