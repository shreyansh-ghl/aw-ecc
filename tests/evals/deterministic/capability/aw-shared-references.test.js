const assert = require('assert');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const REFERENCE_FILES = [
  'references/testing-patterns.md',
  'references/frontend-quality-checklist.md',
  'references/build-increments.md',
  'references/test-scope-and-evidence.md',
  'references/review-findings-severity.md',
  'references/context-loading-and-intake.md',
  'references/route-selection-patterns.md',
  'references/domain-skill-loading.md',
  'references/task-sizing-and-checkpoints.md',
  'references/interface-stability.md',
  'references/git-save-points.md',
  'references/ci-quality-gates.md',
  'references/debug-triage.md',
  'references/adr-and-docs.md',
  'references/deprecation-and-migration.md',
  'references/ship-launch-checklist.md',
];

const SKILL_REFERENCE_REQUIREMENTS = [
  {
    skillPath: 'skills/using-aw-skills/SKILL.md',
    references: [
      '../../references/context-loading-and-intake.md',
      '../../references/route-selection-patterns.md',
      '../../references/domain-skill-loading.md',
    ],
  },
  {
    skillPath: 'skills/aw-plan/SKILL.md',
    references: ['../../references/task-sizing-and-checkpoints.md'],
  },
  {
    skillPath: 'skills/aw-build/SKILL.md',
    references: [
      '../../references/build-increments.md',
      '../../references/testing-patterns.md',
      '../../references/frontend-quality-checklist.md',
      '../../references/interface-stability.md',
      '../../references/git-save-points.md',
    ],
  },
  {
    skillPath: 'skills/aw-investigate/SKILL.md',
    references: ['../../references/debug-triage.md'],
  },
  {
    skillPath: 'skills/aw-test/SKILL.md',
    references: [
      '../../references/test-scope-and-evidence.md',
      '../../references/testing-patterns.md',
      '../../references/frontend-quality-checklist.md',
    ],
  },
  {
    skillPath: 'skills/aw-review/SKILL.md',
    references: ['../../references/review-findings-severity.md'],
  },
  {
    skillPath: 'skills/aw-ship/SKILL.md',
    references: ['../../references/ship-launch-checklist.md'],
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
  console.log(`\n=== AW Shared References (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('all planned shared reference files exist', () => {
    for (const referencePath of REFERENCE_FILES) {
      assert.ok(snapshot.fileExists(referencePath), `Missing ${referencePath}`);
    }
  })) passed++; else failed++;

  if (test('reference files contain reusable checklist-style content', () => {
    for (const referencePath of REFERENCE_FILES) {
      const content = snapshot.readFile(referencePath);
      assert.ok(content.trim().length > 120, `${referencePath} is unexpectedly short`);
      assert.ok(/^# /m.test(content), `${referencePath} should start with a heading`);
      assert.ok(/^- /m.test(content) || /^\d+\. /m.test(content), `${referencePath} should contain reusable list content`);
    }
  })) passed++; else failed++;

  if (test('stage and router skills point to the right shared references', () => {
    for (const entry of SKILL_REFERENCE_REQUIREMENTS) {
      const skillContent = snapshot.readFile(entry.skillPath);
      for (const referencePath of entry.references) {
        assert.ok(
          skillContent.includes(referencePath),
          `${entry.skillPath} should reference ${referencePath}`
        );
      }
    }
  })) passed++; else failed++;

  if (test('references stay progressive-disclosure assets instead of public commands', () => {
    for (const referencePath of REFERENCE_FILES) {
      const commandCandidate = referencePath
        .replace(/^references\//, 'commands/')
        .replace(/\.md$/, '.md');
      assert.ok(!snapshot.fileExists(commandCandidate), `${referencePath} should not become ${commandCandidate}`);
    }
  })) passed++; else failed++;

  if (test('build/test/review/ship references reinforce the intended stage split', () => {
    const build = snapshot.readFile('skills/aw-build/SKILL.md');
    const testSkill = snapshot.readFile('skills/aw-test/SKILL.md');
    const review = snapshot.readFile('skills/aw-review/SKILL.md');
    const ship = snapshot.readFile('skills/aw-ship/SKILL.md');

    assert.ok(build.includes('thin, reversible'));
    assert.ok(testSkill.includes('fresh QA evidence'));
    assert.ok(review.includes('explicit severity'));
    assert.ok(ship.includes('rollback readiness'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
