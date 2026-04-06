const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);
const PLATFORM_ROUTER = 'skills/using-platform-skills/SKILL.md';
const AW_ROUTER = 'skills/using-aw-skills/SKILL.md';
const PLATFORM_CASES = 'skills/using-platform-skills/evals/platform-selection-cases.json';

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
  console.log(`\n=== AW Platform Skill Selection (${REF}) ===\n`);

  const platformRouter = snapshot.readFile(PLATFORM_ROUTER);
  const awRouter = snapshot.readFile(AW_ROUTER);
  const platformCases = JSON.parse(snapshot.readFile(PLATFORM_CASES));
  let passed = 0;
  let failed = 0;

  if (test('platform router exists and follows standard anatomy', () => {
    assert.ok(snapshot.fileExists(PLATFORM_ROUTER), `Missing ${PLATFORM_ROUTER}`);
    for (const heading of [
      '## Overview',
      '## When to Use',
      '## Skill Discovery',
      '## Workflow',
      '## Common Rationalizations',
      '## Red Flags',
      '## Verification',
    ]) {
      assert.ok(platformRouter.includes(heading), `platform router is missing ${heading}`);
    }
  })) passed++; else failed++;

  if (test('platform router maps the major GHL families explicitly', () => {
    for (const token of [
      'platform-services:*',
      'platform-frontend:*',
      'platform-design:*',
      'platform-data:*',
      'platform-infra:*',
      'platform-sdet:*',
      'platform-review:*',
      'platform-product:*',
    ]) {
      assert.ok(platformRouter.includes(token), `platform router is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('platform router documents first supporting skills by stage', () => {
    for (const token of [
      'platform-services:development',
      'platform-infra:grafana',
      'platform-sdet:quality-gates',
      'platform-review:code-review-pr',
      'platform-design:system',
      'platform-frontend:vue-development',
      'highrise-ui-governance',
      'deploy-versioned-mfa',
      'platform-infra:staging-deploy',
      'platform-infra:production-readiness',
    ]) {
      assert.ok(platformRouter.includes(token), `platform router is missing supporting skill ${token}`);
    }
  })) passed++; else failed++;

  if (test('platform router stays domain-specific and does not retake planning ownership', () => {
    assert.ok(!platformRouter.includes('platform-shared:spec-writing'), 'platform router should not reintroduce spec-writing as a default planner');
    assert.ok(!JSON.stringify(platformCases).includes('platform-shared:spec-writing'), 'owner-local platform cases should stay domain-specific');
  })) passed++; else failed++;

  if (test('aw router delegates platform selection to using-platform-skills', () => {
    assert.ok(awRouter.includes('using-platform-skills'), 'AW router should point to using-platform-skills');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
