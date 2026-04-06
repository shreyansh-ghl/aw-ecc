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

const FIXTURE_PATH = 'tests/evals/fixtures/aw-product-scenarios.json';
const DOC_PATH = 'docs/aw-product-scenario-matrix.md';
const BASE_SCHEMA_PATH = 'tests/evals/schemas/aw-scenario-case.schema.json';
const PRODUCT_SCHEMA_PATH = 'tests/evals/schemas/aw-product-scenarios.schema.json';

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
  console.log(`\n=== AW Product Scenarios (${REF}) ===\n`);

  const fixture = readJson(snapshot, FIXTURE_PATH);
  const doc = snapshot.readFile(DOC_PATH);

  let passed = 0;
  let failed = 0;

  if (test('product fixture validates against the shared schema', () => {
    validateFixtureAgainstSchema(snapshot, BASE_SCHEMA_PATH, PRODUCT_SCHEMA_PATH, fixture);
  })) passed++; else failed++;

  if (test('product suite covers the expected product areas and full route surface', () => {
    const productAreas = new Set(fixture.cases.map(testCase => testCase.productArea));
    const routes = new Set(fixture.cases.map(testCase => testCase.expectedPublicRoute));

    for (const productArea of ['automation', 'communities', 'contacts', 'memberships', 'payments', 'workflows']) {
      assert.ok(productAreas.has(productArea), `missing product area coverage for ${productArea}`);
    }

    for (const route of Object.keys(ROUTE_TO_SKILL)) {
      assert.ok(routes.has(route), `missing route coverage for ${route}`);
    }
  })) passed++; else failed++;

  if (test('product scenario ids are unique and route-to-primary mapping stays canonical', () => {
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

  if (test('product scenarios enforce GHL-specific standards rather than generic-only guidance', () => {
    const byId = Object.fromEntries(fixture.cases.map(testCase => [testCase.id, testCase]));

    assert.ok(byId['communities-feed-highrise-build'].expectedOrgStandards.includes('highrise-ui-governance'));
    assert.ok(byId['communities-feed-browser-test'].expectedOrgStandards.includes('platform-frontend:accessibility'));
    assert.ok(byId['payments-service-readiness-review'].expectedOrgStandards.includes('platform-review:code-review-pr'));
    assert.ok(byId['memberships-mfa-staging-deploy'].expectedOrgStandards.includes('deploy-versioned-mfa'));
    assert.ok(byId['legacy-webhook-migration-plan'].expectedOrgStandards.includes('platform-product:knowledge'));
    assert.ok(byId['workflows-retry-alert-investigate'].expectedOrgStandards.includes('platform-infra:grafana'));
  })) passed++; else failed++;

  if (test('product matrix doc stays aligned with the machine-readable fixture', () => {
    assert.ok(doc.includes('Scenario Matrix'), 'product doc is missing Scenario Matrix');
    assert.ok(doc.includes('Coverage Goals'), 'product doc is missing Coverage Goals');
    for (const testCase of fixture.cases) {
      assert.ok(doc.includes(`\`${testCase.id}\``), `product doc is missing ${testCase.id}`);
      assert.ok(doc.includes(`\`${testCase.productArea}\``), `product doc is missing ${testCase.productArea}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
