const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const P1_SKILLS = [
  'skills/code-simplification/SKILL.md',
  'skills/incremental-implementation/SKILL.md',
  'skills/context-engineering/SKILL.md',
  'skills/frontend-ui-engineering/SKILL.md',
  'skills/security-and-hardening/SKILL.md',
  'skills/performance-optimization/SKILL.md',
];

const P1_REFERENCES = [
  'references/security-checklist.md',
  'references/performance-checklist.md',
  'references/accessibility-checklist.md',
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
  console.log(`\n=== AW Addy Parity P1 (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('P1 parity skills exist', () => {
    for (const skillPath of P1_SKILLS) {
      assert.ok(snapshot.fileExists(skillPath), `Missing ${skillPath}`);
    }
  })) passed++; else failed++;

  if (test('P1 parity skills follow the Addy-style anatomy', () => {
    for (const skillPath of P1_SKILLS) {
      const content = snapshot.readFile(skillPath);
      for (const heading of STANDARD_HEADINGS) {
        assert.ok(content.includes(heading), `${skillPath} is missing ${heading}`);
      }
    }
  })) passed++; else failed++;

  if (test('P1 reference packs exist', () => {
    for (const referencePath of P1_REFERENCES) {
      assert.ok(snapshot.fileExists(referencePath), `Missing ${referencePath}`);
    }
  })) passed++; else failed++;

  if (test('AW stage skills load the new parity skills where they matter', () => {
    const build = snapshot.readFile('skills/aw-build/SKILL.md');
    const testSkill = snapshot.readFile('skills/aw-test/SKILL.md');
    const review = snapshot.readFile('skills/aw-review/SKILL.md');
    const router = snapshot.readFile('skills/using-aw-skills/SKILL.md');

    assert.ok(build.includes('incremental-implementation'));
    assert.ok(build.includes('context-engineering'));
    assert.ok(build.includes('frontend-ui-engineering'));

    assert.ok(testSkill.includes('frontend-ui-engineering'));
    assert.ok(testSkill.includes('performance-optimization'));
    assert.ok(testSkill.includes('references/accessibility-checklist.md'));

    assert.ok(review.includes('code-simplification'));
    assert.ok(review.includes('security-and-hardening'));
    assert.ok(review.includes('performance-optimization'));

    assert.ok(router.includes('Cross-Cutting Engineering Skills'));
    assert.ok(router.includes('context-engineering'));
    assert.ok(router.includes('incremental-implementation'));
    assert.ok(router.includes('frontend-ui-engineering'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
