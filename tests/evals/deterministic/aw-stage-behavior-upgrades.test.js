const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

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

function run() {
  console.log(`\n=== AW Stage Behavior Upgrades (${REF}) ===\n`);

  const buildCommand = snapshot.readFile('commands/build.md');
  const investigateCommand = snapshot.readFile('commands/investigate.md');
  const testCommand = snapshot.readFile('commands/test.md');
  const reviewCommand = snapshot.readFile('commands/review.md');
  const deployCommand = snapshot.readFile('commands/deploy.md');
  const shipCommand = snapshot.readFile('commands/ship.md');

  const buildSkill = snapshot.readFile('skills/aw-build/SKILL.md');
  const investigateSkill = snapshot.readFile('skills/aw-investigate/SKILL.md');
  const testSkill = snapshot.readFile('skills/aw-test/SKILL.md');
  const reviewSkill = snapshot.readFile('skills/aw-review/SKILL.md');
  const deploySkill = snapshot.readFile('skills/aw-deploy/SKILL.md');
  const shipSkill = snapshot.readFile('skills/aw-ship/SKILL.md');
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
    assert.ok(buildCommand.includes('/aw:test'));
    assert.ok(buildCommand.includes('/aw:review'));
    assert.ok(buildCommand.includes('must not deploy as part of build'));
  })) passed++; else failed++;

  if (test('investigate requires reproduction and evidence before broad fixes', () => {
    assert.ok(investigateCommand.includes('Reproduce'));
    assert.ok(investigateSkill.includes('Use `aw-debug` and `references/debug-triage.md`'));
    assert.ok(investigateCommand.includes('must not guess through an unclear root cause'));
    assert.ok(investigateSkill.includes('Prefer the smallest confirming probe over speculative patching.'));
  })) passed++; else failed++;

  if (test('test and review stay distinct but connected phases', () => {
    assert.ok(testCommand.includes('fresh QA evidence'));
    assert.ok(testCommand.includes('must not implement code while testing'));
    assert.ok(testSkill.includes('Route to `aw-review`'));
    assert.ok(reviewCommand.includes('correctness, simplicity, architecture, security, performance'));
    assert.ok(reviewSkill.includes('Correctness, readability and simplicity, architecture, security, and performance.'));
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

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
