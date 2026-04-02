const assert = require('assert');
const { readFileSync } = require('fs');
const { DEFAULT_SESSION_CASES } = require('../fixtures/aw-sdlc-default-session-cases');
const {
  ROUTER_SKILL_PATH,
  CONFIG_DOC_PATH,
  ECC_BASELINES_PATH,
} = require('../lib/aw-sdlc-paths');
const {
  parseBaselineCatalog,
  normalizeBaselineCatalog,
} = require('../lib/aw-sdlc-baseline-catalog');

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
  console.log('\n=== AW SDLC Default Session Coverage ===\n');

  const routerSkill = readFileSync(ROUTER_SKILL_PATH, 'utf8');
  const configDoc = readFileSync(CONFIG_DOC_PATH, 'utf8');
  const baselines = normalizeBaselineCatalog(parseBaselineCatalog(readFileSync(ECC_BASELINES_PATH, 'utf8')));

  let passed = 0;
  let failed = 0;

  if (test('default session matrix is broad enough to be meaningful', () => {
    assert.ok(DEFAULT_SESSION_CASES.length >= 9, `Expected at least 9 cases, found ${DEFAULT_SESSION_CASES.length}`);
  })) passed++; else failed++;

  if (test('every session case expects the same minimal public interface', () => {
    for (const testCase of DEFAULT_SESSION_CASES) {
      assert.deepStrictEqual(
        testCase.expectedPublicSurface,
        ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy'],
        `${testCase.id} does not use the minimal public surface`
      );
    }
  })) passed++; else failed++;

  if (test('session cases cover all public routes plus surface-only help', () => {
    const routes = new Set(DEFAULT_SESSION_CASES.map(testCase => testCase.expectedRoute));
    for (const route of ['unknown', '/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy']) {
      assert.ok(routes.has(route), `Missing default session route ${route}`);
    }
  })) passed++; else failed++;

  if (test('session cases cover all GHL baseline archetypes and safe fallback', () => {
    const baselinesCovered = new Set(DEFAULT_SESSION_CASES.map(testCase => testCase.expectedBaseline));
    for (const baseline of [
      'ghl-microfrontend-standard',
      'ghl-microservice-standard',
      'ghl-worker-standard',
      'ghl-safe-fallback',
    ]) {
      assert.ok(baselinesCovered.has(baseline), `Missing default session baseline ${baseline}`);
    }
  })) passed++; else failed++;

  if (test('verify defaults cover PR governance and local validation expectations', () => {
    const layeredCases = DEFAULT_SESSION_CASES.filter(testCase => testCase.expectedRoute === '/aw:verify');
    assert.ok(layeredCases.some(testCase => testCase.expectedVerifyLayers.includes('pr_governance')));
    assert.ok(layeredCases.some(testCase => testCase.expectedVerifyLayers.includes('local_validation')));
  })) passed++; else failed++;

  if (test('deploy defaults cover GHL AI transport plus MFA, microservice, worker, and fail-closed fallback mechanisms', () => {
    const providers = new Set(
      DEFAULT_SESSION_CASES
        .filter(testCase => testCase.expectedRoute === '/aw:deploy')
        .map(testCase => testCase.expectedStagingProvider)
    );
    for (const provider of ['ghl-ai', 'unconfigured']) {
      assert.ok(providers.has(provider), `Missing default session staging provider ${provider}`);
    }

    const mechanisms = new Set(
      DEFAULT_SESSION_CASES
        .filter(testCase => testCase.expectedRoute === '/aw:deploy')
        .map(testCase => testCase.expectedStagingMechanism)
    );
    for (const mechanism of [
      'versioned-mfa-staging',
      'versioned-service-staging',
      'versioned-worker-staging',
      'unconfigured',
    ]) {
      assert.ok(mechanisms.has(mechanism), `Missing default session staging mechanism ${mechanism}`);
    }
  })) passed++; else failed++;

  if (test('configuration docs describe the default session behavior the cases expect', () => {
    for (const phrase of [
      '/aw:plan',
      '/aw:execute',
      '/aw:verify',
      '/aw:deploy',
      'PR description checklist',
      'ghl-ai',
      'versioned MFA staging',
      'versioned service staging',
      'versioned worker staging',
    ]) {
      assert.ok(configDoc.includes(phrase), `Config doc is missing "${phrase}"`);
    }
  })) passed++; else failed++;

  if (test('baseline catalog contains every provider and governance check used by the session cases', () => {
    const governanceChecks = new Set(
      Object.values(baselines.baselines).flatMap(baseline => baseline.verify.pr_governance.checks || [])
    );
    const stagingProviders = new Set(
      Object.values(baselines.baselines).map(baseline => baseline.deploy.staging.provider).filter(Boolean)
    );
    const stagingMechanisms = new Set(
      Object.values(baselines.baselines).map(baseline => baseline.deploy.staging.mechanism).filter(Boolean)
    );

    for (const phrase of [
      'pr_description_present',
      'pr_description_checklist_complete',
      'pr_verification_items_checked',
      'ghl-safe-fallback',
    ]) {
      if (phrase === 'ghl-safe-fallback') {
        assert.ok(baselines.baselines['ghl-safe-fallback'], `Baseline catalog is missing "${phrase}"`);
      } else {
        assert.ok(governanceChecks.has(phrase), `Baseline catalog is missing "${phrase}"`);
      }
    }

    assert.ok(stagingProviders.has('ghl-ai'), 'Baseline catalog is missing "ghl-ai" staging provider');
    for (const mechanism of [
      'versioned-mfa-staging',
      'versioned-service-staging',
      'versioned-worker-staging',
    ]) {
      assert.ok(stagingMechanisms.has(mechanism), `Baseline catalog is missing "${mechanism}"`);
    }
  })) passed++; else failed++;

  if (test('router skill now advertises the minimal AW SDLC surface instead of legacy revex commands', () => {
    for (const token of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy', '/aw:ship']) {
      assert.ok(routerSkill.includes(token), `Router skill is missing ${token}`);
    }
    assert.ok(!routerSkill.includes('/aw:revex-'), 'Router skill should no longer advertise legacy revex commands');
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
