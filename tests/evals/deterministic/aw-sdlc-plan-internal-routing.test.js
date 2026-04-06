const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

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

function run() {
  console.log(`\n=== AW SDLC Plan Internal Routing (${REF}) ===\n`);

  const brainstormSkill = snapshot.readFile('skills/aw-brainstorm/SKILL.md');
  const planSkill = snapshot.readFile('skills/aw-plan/SKILL.md');
  const specAuthorSkill = snapshot.readFile('skills/aw-spec/SKILL.md');
  const taskPlannerSkill = snapshot.readFile('skills/aw-tasks/SKILL.md');
  let passed = 0;
  let failed = 0;

  if (test('repo ships dedicated spec-author and task-planner internal skills', () => {
    assert.ok(snapshot.fileExists('skills/aw-spec/SKILL.md'));
    assert.ok(snapshot.fileExists('skills/aw-tasks/SKILL.md'));
  })) passed++; else failed++;

  if (test('aw-plan routes work through an explicit internal planning graph', () => {
    for (const phrase of [
      'fuzzy request, open design question, or overscoped feature -> `aw-brainstorm`',
      'approved direction but missing technical contract -> `aw-spec`',
      'approved spec but missing execution recipe -> `aw-tasks`',
      'already execution-ready tasks -> stop and recommend `aw-build`',
    ]) {
      assert.ok(planSkill.includes(phrase), `aw-plan is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('planning skills follow the Addy-style anatomy', () => {
    for (const phrase of [
      '## Overview',
      '## When to Use',
      '## Workflow',
      '## Common Rationalizations',
      '## Red Flags',
      '## Verification',
    ]) {
      assert.ok(planSkill.includes(phrase), `aw-plan is missing ${phrase}`);
      assert.ok(specAuthorSkill.includes(phrase), `aw-spec is missing ${phrase}`);
      assert.ok(taskPlannerSkill.includes(phrase), `aw-tasks is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('brainstorm stops at approved direction and routes into spec authoring', () => {
    for (const phrase of [
      'explore project context first',
      'request is too large for one spec',
      'run a quick self-review',
      'hand the approved direction to `aw-spec`',
    ]) {
      assert.ok(brainstormSkill.includes(phrase), `aw-brainstorm is missing ${phrase}`);
    }
  })) passed++; else failed++;

  if (test('spec author and task planner define review gates before execution', () => {
    for (const phrase of [
      'placeholder scan',
      'internal consistency check',
      'scope check',
      'ambiguity check',
      'Execution Route',
      'No Placeholders',
      'confirm every spec requirement maps to at least one task',
    ]) {
      assert.ok(
        specAuthorSkill.includes(phrase) || taskPlannerSkill.includes(phrase),
        `planning subskills are missing ${phrase}`
      );
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
