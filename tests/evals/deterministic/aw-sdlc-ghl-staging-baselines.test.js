const assert = require('assert');
const { readFileSync } = require('fs');
const {
  PLATFORM_DOCS_BASELINES_PATH,
  ECC_BASELINES_PATH,
  CONFIG_DOC_PATH,
  RESEARCH_DOC_PATH,
  pathExists,
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
  console.log('\n=== AW SDLC GHL Staging Baselines ===\n');

  const hasPlatformDocsBaselines = pathExists(PLATFORM_DOCS_BASELINES_PATH);
  const platformBaselines = hasPlatformDocsBaselines ? readFileSync(PLATFORM_DOCS_BASELINES_PATH, 'utf8') : '';
  const eccBaselines = readFileSync(ECC_BASELINES_PATH, 'utf8');
  const parsedEccBaselines = normalizeBaselineCatalog(parseBaselineCatalog(eccBaselines));
  const parsedPlatformBaselines = hasPlatformDocsBaselines
    ? normalizeBaselineCatalog(parseBaselineCatalog(platformBaselines))
    : parsedEccBaselines;
  const baselineCatalog = hasPlatformDocsBaselines ? parsedPlatformBaselines : parsedEccBaselines;
  const configDoc = readFileSync(CONFIG_DOC_PATH, 'utf8');
  const researchDoc = readFileSync(RESEARCH_DOC_PATH, 'utf8');

  let passed = 0;
  let failed = 0;

  if (test('ECC synced baseline matches the canonical platform-docs baseline when available', () => {
    if (!hasPlatformDocsBaselines) {
      return;
    }
    assert.deepStrictEqual(parsedEccBaselines, parsedPlatformBaselines, 'aw-ecc baseline snapshot is semantically out of sync with platform-docs');
  })) passed++; else failed++;

  if (test('all three staging archetypes are defined', () => {
    for (const baseline of [
      'ghl-microfrontend-standard',
      'ghl-microservice-standard',
      'ghl-worker-standard',
    ]) {
      assert.ok(baselineCatalog.baselines[baseline], `Missing baseline ${baseline}`);
    }
  })) passed++; else failed++;

  if (test('repo-local snapshot uses the simplified flat verify/deploy shape', () => {
    assert.ok(!/^\s+layers:\s*$/m.test(eccBaselines), 'baseline snapshot should not use verify.layers wrappers');
    assert.ok(!/^\s+modes:\s*$/m.test(eccBaselines), 'baseline snapshot should not use deploy.modes wrappers');
    assert.ok(/verify:\n\s+code_review:/m.test(eccBaselines), 'baseline snapshot should define verify sections directly');
    assert.ok(/deploy:\n\s+pr:/m.test(eccBaselines), 'baseline snapshot should define deploy sections directly');
  })) passed++; else failed++;

  if (test('local validation requires unit testing in the baselines', () => {
    for (const baseline of Object.values(baselineCatalog.baselines)) {
      const minimums = baseline.verify.local_validation.required_minimums || [];
      assert.ok(minimums.includes('unit'), 'Expected unit testing to be listed in local validation minimums');
    }
  })) passed++; else failed++;

  if (test('PR governance enforces PR description checklist verification', () => {
    const governanceChecks = new Set(
      Object.values(baselineCatalog.baselines).flatMap(baseline => baseline.verify.pr_governance.checks || [])
    );
    for (const check of [
      'pr_description_present',
      'pr_description_checklist_complete',
      'pr_verification_items_checked',
      'required_status_checks_green',
      'required_approvals_present',
      'quality_gates_green',
    ]) {
      assert.ok(governanceChecks.has(check), `Missing PR governance check ${check}`);
    }
  })) passed++; else failed++;

  if (test('staging deployment uses GHL AI transport with concrete MFA, service, and worker mechanisms', () => {
    assert.strictEqual(baselineCatalog.baselines['ghl-microfrontend-standard'].deploy.staging.provider, 'ghl-ai');
    assert.strictEqual(baselineCatalog.baselines['ghl-microservice-standard'].deploy.staging.provider, 'ghl-ai');
    assert.strictEqual(baselineCatalog.baselines['ghl-worker-standard'].deploy.staging.provider, 'ghl-ai');

    assert.strictEqual(baselineCatalog.baselines['ghl-microfrontend-standard'].deploy.staging.mechanism, 'versioned-mfa-staging');
    assert.strictEqual(baselineCatalog.baselines['ghl-microservice-standard'].deploy.staging.mechanism, 'versioned-service-staging');
    assert.strictEqual(baselineCatalog.baselines['ghl-worker-standard'].deploy.staging.mechanism, 'versioned-worker-staging');
  })) passed++; else failed++;

  if (test('current baseline intentionally disables production deploys by default', () => {
    for (const [baselineName, baseline] of Object.entries(baselineCatalog.baselines)) {
      assert.strictEqual(
        baseline.deploy.production.enabled,
        false,
        `Expected production to be disabled for ${baselineName}`
      );
    }
  })) passed++; else failed++;

  if (test('configuration doc explains PR governance and staging-only deployment scope', () => {
    assert.ok(configDoc.includes('PR description checklist'));
    assert.ok(configDoc.includes('Production can remain disabled in the baseline profiles until the staging path is proven'));
  })) passed++; else failed++;

  if (test('research doc captures the real GHL deployment mechanisms', () => {
    for (const phrase of [
      'spm-ts',
      'deploy_version',
      'developer_version',
      'ghl-ai',
      'versioned-service-staging',
      'versioned-worker-staging',
    ]) {
      assert.ok(researchDoc.includes(phrase), `Missing research anchor ${phrase}`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
