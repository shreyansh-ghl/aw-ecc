const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const P2_SKILLS = [
  'skills/idea-refine/SKILL.md',
  'skills/api-and-interface-design/SKILL.md',
  'skills/browser-testing-with-devtools/SKILL.md',
  'skills/git-workflow-and-versioning/SKILL.md',
  'skills/ci-cd-and-automation/SKILL.md',
  'skills/deprecation-and-migration/SKILL.md',
  'skills/documentation-and-adrs/SKILL.md',
];

const STANDARD_HEADINGS = [
  '## Overview',
  '## When to Use',
  '## Workflow',
  '## Common Rationalizations',
  '## Red Flags',
  '## Verification',
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
  console.log(`\n=== AW Addy Parity P2 (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('P2 parity skills exist', () => {
    for (const skillPath of P2_SKILLS) {
      assert.ok(snapshot.fileExists(skillPath), `Missing ${skillPath}`);
    }
  })) passed++; else failed++;

  if (test('P2 parity skills follow the Addy-style anatomy', () => {
    for (const skillPath of P2_SKILLS) {
      const content = snapshot.readFile(skillPath);
      for (const heading of STANDARD_HEADINGS) {
        assert.ok(content.includes(heading), `${skillPath} is missing ${heading}`);
      }
    }
  })) passed++; else failed++;

  if (test('AW stage skills load the P2 parity skills where they matter', () => {
    const router = snapshot.readFile('skills/using-aw-skills/SKILL.md');
    const plan = snapshot.readFile('skills/aw-plan/SKILL.md');
    const build = snapshot.readFile('skills/aw-build/SKILL.md');
    const investigate = snapshot.readFile('skills/aw-investigate/SKILL.md');
    const testSkill = snapshot.readFile('skills/aw-test/SKILL.md');
    const review = snapshot.readFile('skills/aw-review/SKILL.md');
    const deploy = snapshot.readFile('skills/aw-deploy/SKILL.md');
    const ship = snapshot.readFile('skills/aw-ship/SKILL.md');

    assert.ok(router.includes('idea-refine'));
    assert.ok(router.includes('api-and-interface-design'));
    assert.ok(router.includes('browser-testing-with-devtools'));
    assert.ok(router.includes('git-workflow-and-versioning'));
    assert.ok(router.includes('ci-cd-and-automation'));
    assert.ok(router.includes('deprecation-and-migration'));
    assert.ok(router.includes('documentation-and-adrs'));

    assert.ok(plan.includes('idea-refine'));
    assert.ok(plan.includes('api-and-interface-design'));
    assert.ok(plan.includes('deprecation-and-migration'));
    assert.ok(plan.includes('documentation-and-adrs'));

    assert.ok(build.includes('api-and-interface-design'));
    assert.ok(build.includes('git-workflow-and-versioning'));
    assert.ok(build.includes('deprecation-and-migration'));

    assert.ok(investigate.includes('browser-testing-with-devtools'));
    assert.ok(testSkill.includes('browser-testing-with-devtools'));

    assert.ok(review.includes('api-and-interface-design'));
    assert.ok(review.includes('git-workflow-and-versioning'));
    assert.ok(review.includes('documentation-and-adrs'));

    assert.ok(deploy.includes('ci-cd-and-automation'));
    assert.ok(deploy.includes('deprecation-and-migration'));

    assert.ok(ship.includes('ci-cd-and-automation'));
    assert.ok(ship.includes('documentation-and-adrs'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
