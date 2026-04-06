const assert = require('assert');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');
const {
  ROUTE_TO_SKILL,
  readJson,
  skillExists,
  validateFixtureAgainstSchema,
} = require('../lib/aw-scenario-helpers');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const FIXTURE_PATH = 'tests/evals/fixtures/aw-archetype-scenarios.json';
const DOC_PATH = 'docs/aw-archetype-scenario-matrix.md';
const BASE_SCHEMA_PATH = 'tests/evals/schemas/aw-scenario-case.schema.json';
const ARCHETYPE_SCHEMA_PATH = 'tests/evals/schemas/aw-archetype-scenarios.schema.json';

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
  console.log(`\n=== AW Archetype Scenarios (${REF}) ===\n`);

  const fixture = readJson(snapshot, FIXTURE_PATH);
  const doc = snapshot.readFile(DOC_PATH);

  let passed = 0;
  let failed = 0;

  if (test('archetype fixture validates against the shared schema', () => {
    validateFixtureAgainstSchema(snapshot, BASE_SCHEMA_PATH, ARCHETYPE_SCHEMA_PATH, fixture);
  })) passed++; else failed++;

  if (test('archetype suite covers the expected repo shapes and routes', () => {
    const archetypes = new Set(fixture.cases.map(testCase => testCase.repoArchetype));
    const routes = new Set(fixture.cases.map(testCase => testCase.expectedPublicRoute));

    assert.deepStrictEqual(
      [...archetypes].sort(),
      ['microfrontend', 'microservice', 'worker'],
      'archetype suite should cover microservice, worker, and microfrontend'
    );

    for (const route of Object.keys(ROUTE_TO_SKILL)) {
      assert.ok(routes.has(route), `missing route coverage for ${route}`);
    }
  })) passed++; else failed++;

  if (test('archetype scenario ids are unique and route-to-primary mapping stays canonical', () => {
    const ids = fixture.cases.map(testCase => testCase.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'scenario ids must be unique');

    for (const testCase of fixture.cases) {
      assert.strictEqual(
        testCase.expectedPrimarySkill,
        ROUTE_TO_SKILL[testCase.expectedPublicRoute],
        `route-to-primary mismatch for ${testCase.id}`
      );
    }
  })) passed++; else failed++;

  if (test('supporting skills and org-standard skills resolve on disk', () => {
    for (const testCase of fixture.cases) {
      skillExists(snapshot, testCase.expectedPrimarySkill);
      for (const skill of testCase.expectedSupportingSkills) {
        skillExists(snapshot, skill);
      }
      for (const standard of testCase.expectedOrgStandards) {
        skillExists(snapshot, standard);
      }
    }
  })) passed++; else failed++;

  if (test('archetype-specific org standards are enforced in the fixture', () => {
    const byId = Object.fromEntries(fixture.cases.map(testCase => [testCase.id, testCase]));

    assert.ok(byId['microservice-contract-plan'].expectedOrgStandards.includes('platform-services:development'));
    assert.ok(byId['worker-alert-investigate'].expectedOrgStandards.includes('platform-infra:grafana'));
    assert.ok(byId['worker-alert-investigate'].expectedOrgStandards.includes('platform-services:worker-patterns'));
    assert.ok(byId['microfrontend-browser-proof'].expectedOrgStandards.includes('platform-frontend:accessibility'));
    assert.ok(byId['microfrontend-browser-proof'].expectedOrgStandards.includes('platform-design:review'));
    assert.ok(byId['microservice-staging-deploy'].expectedOrgStandards.includes('platform-infra:staging-deploy'));
    assert.ok(byId['worker-launch-closeout'].expectedOrgStandards.includes('platform-infra:production-readiness'));
    assert.ok(byId['microfrontend-yolo-staging'].expectedOrgStandards.includes('highrise-ui-governance'));
  })) passed++; else failed++;

  if (test('archetype matrix doc stays aligned with the machine-readable fixture', () => {
    assert.ok(doc.includes('Scenario Matrix'), 'archetype doc is missing Scenario Matrix');
    assert.ok(doc.includes('Coverage Goals'), 'archetype doc is missing Coverage Goals');
    for (const testCase of fixture.cases) {
      assert.ok(doc.includes(`\`${testCase.id}\``), `archetype doc is missing ${testCase.id}`);
      assert.ok(doc.includes(`\`${testCase.repoArchetype}\``), `archetype doc is missing ${testCase.repoArchetype}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
