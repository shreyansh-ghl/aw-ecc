const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const FIXTURE_PATH = 'tests/evals/fixtures/aw-addy-validation-cases.json';
const DOC_PATH = 'docs/aw-addy-validation-matrix.md';

const EXPECTED_ADDY_SKILLS = [
  'idea-refine',
  'spec-driven-development',
  'planning-and-task-breakdown',
  'incremental-implementation',
  'context-engineering',
  'frontend-ui-engineering',
  'api-and-interface-design',
  'test-driven-development',
  'browser-testing-with-devtools',
  'debugging-and-error-recovery',
  'code-review-and-quality',
  'code-simplification',
  'security-and-hardening',
  'performance-optimization',
  'git-workflow-and-versioning',
  'ci-cd-and-automation',
  'deprecation-and-migration',
  'documentation-and-adrs',
  'shipping-and-launch',
];

const ROUTE_TO_SKILL = {
  '/aw:plan': 'aw-plan',
  '/aw:build': 'aw-build',
  '/aw:investigate': 'aw-investigate',
  '/aw:test': 'aw-test',
  '/aw:review': 'aw-review',
  '/aw:deploy': 'aw-deploy',
  '/aw:ship': 'aw-ship',
  'aw-yolo': 'aw-yolo',
};

function readFixture() {
  return JSON.parse(snapshot.readFile(FIXTURE_PATH));
}

function skillExists(skillName) {
  return snapshot.fileExists(`skills/${skillName}/SKILL.md`);
}

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

function validateCaseShape(testCase, label) {
  assert.ok(testCase.id, `${label} is missing id`);
  assert.ok(testCase.input, `${label} is missing input`);
  assert.ok(testCase.expectedPublicRoute, `${label} is missing expectedPublicRoute`);
  assert.ok(testCase.expectedPrimarySkill, `${label} is missing expectedPrimarySkill`);
  assert.ok(Array.isArray(testCase.expectedOutputs) && testCase.expectedOutputs.length > 0, `${label} must define expectedOutputs`);
}

function run() {
  console.log(`\n=== AW Addy Validation Matrix (${REF}) ===\n`);

  const fixture = readFixture();
  const doc = snapshot.readFile(DOC_PATH);

  let passed = 0;
  let failed = 0;

  if (test('validation fixture exists and contains the expected sections', () => {
    assert.ok(Array.isArray(fixture.topUseCases) && fixture.topUseCases.length >= 8, 'topUseCases coverage is too small');
    assert.ok(Array.isArray(fixture.skillCases) && fixture.skillCases.length === 19, 'skillCases must cover the 19 Addy lifecycle skills exactly');
    assert.ok(Array.isArray(fixture.autoIntentCases) && fixture.autoIntentCases.length >= 10, 'autoIntentCases coverage is too small');
  })) passed++; else failed++;

  if (test('skill cases cover every Addy lifecycle skill exactly once', () => {
    const actual = fixture.skillCases.map(testCase => testCase.addySkill).sort();
    const expected = [...EXPECTED_ADDY_SKILLS].sort();
    assert.deepStrictEqual(actual, expected, 'skillCases do not match the 19 Addy lifecycle skills');
  })) passed++; else failed++;

  if (test('every case has input and expected-output detail', () => {
    for (const testCase of fixture.topUseCases) {
      assert.ok(testCase.id, 'top use case is missing id');
      assert.ok(testCase.goal, `${testCase.id} is missing goal`);
      assert.ok(testCase.input, `${testCase.id} is missing input`);
      assert.ok(Array.isArray(testCase.expectedRouteSequence) && testCase.expectedRouteSequence.length > 0, `${testCase.id} must define route sequence`);
      assert.ok(Array.isArray(testCase.expectedSkillStack) && testCase.expectedSkillStack.length > 0, `${testCase.id} must define skill stack`);
      assert.ok(Array.isArray(testCase.expectedOutputs) && testCase.expectedOutputs.length > 0, `${testCase.id} must define expected outputs`);
    }

    for (const testCase of fixture.skillCases) {
      validateCaseShape(testCase, testCase.id);
      assert.ok(Array.isArray(testCase.eccSkills) && testCase.eccSkills.length > 0, `${testCase.id} must define eccSkills`);
      assert.ok(Array.isArray(testCase.expectedSupportingSkills), `${testCase.id} must define expectedSupportingSkills`);
    }

    for (const testCase of fixture.autoIntentCases) {
      validateCaseShape(testCase, testCase.id);
      assert.ok(Array.isArray(testCase.expectedSupportingSkills), `${testCase.id} must define expectedSupportingSkills`);
    }
  })) passed++; else failed++;

  if (test('public routes and primary skills stay aligned with the canonical AW model', () => {
    const allCases = [...fixture.skillCases, ...fixture.autoIntentCases];
    for (const testCase of allCases) {
      const expectedPrimarySkill = ROUTE_TO_SKILL[testCase.expectedPublicRoute];
      assert.ok(expectedPrimarySkill, `${testCase.id} uses unknown route ${testCase.expectedPublicRoute}`);
      assert.strictEqual(testCase.expectedPrimarySkill, expectedPrimarySkill, `${testCase.id} does not align route to primary skill`);
      assert.ok(skillExists(testCase.expectedPrimarySkill), `Missing primary skill file for ${testCase.expectedPrimarySkill}`);
    }
  })) passed++; else failed++;

  if (test('referenced ECC skills all exist on disk', () => {
    const allSkillLists = [];
    for (const testCase of fixture.topUseCases) allSkillLists.push(testCase.expectedSkillStack);
    for (const testCase of fixture.skillCases) allSkillLists.push(testCase.eccSkills, testCase.expectedSupportingSkills);
    for (const testCase of fixture.autoIntentCases) allSkillLists.push(testCase.expectedSupportingSkills);

    for (const skills of allSkillLists) {
      for (const skill of skills) {
        assert.ok(skillExists(skill), `Missing skills/${skill}/SKILL.md`);
      }
    }
  })) passed++; else failed++;

  if (test('top use cases cover the whole stage surface plus yolo', () => {
    const covered = new Set(fixture.topUseCases.flatMap(testCase => testCase.expectedRouteSequence));
    for (const route of Object.keys(ROUTE_TO_SKILL)) {
      assert.ok(covered.has(route), `top use cases are missing ${route}`);
    }
  })) passed++; else failed++;

  if (test('auto-intent cases cover the important craft-skill routing paths', () => {
    const coveredSkills = new Set(fixture.autoIntentCases.flatMap(testCase => testCase.expectedSupportingSkills));
    const required = [
      'idea-refine',
      'api-and-interface-design',
      'browser-testing-with-devtools',
      'code-simplification',
      'security-and-hardening',
      'performance-optimization',
      'git-workflow-and-versioning',
      'ci-cd-and-automation',
      'deprecation-and-migration',
      'documentation-and-adrs',
    ];

    for (const skill of required) {
      assert.ok(coveredSkills.has(skill), `auto-intent coverage is missing ${skill}`);
    }
  })) passed++; else failed++;

  if (test('human-readable validation matrix stays in sync with the fixture', () => {
    assert.ok(doc.includes('Top Use Cases'), 'validation matrix doc is missing Top Use Cases');
    assert.ok(doc.includes('Per-Skill Test Cases'), 'validation matrix doc is missing Per-Skill Test Cases');
    assert.ok(doc.includes('Auto-Intent Routing Cases'), 'validation matrix doc is missing Auto-Intent Routing Cases');
    for (const addySkill of EXPECTED_ADDY_SKILLS) {
      assert.ok(doc.includes(`\`${addySkill}\``), `validation matrix doc is missing ${addySkill}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
