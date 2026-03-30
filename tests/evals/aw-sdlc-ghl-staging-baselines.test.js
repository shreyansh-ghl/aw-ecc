const assert = require('assert');
const { readFileSync } = require('fs');

const PLATFORM_DOCS_BASELINES = '/Users/prathameshai/Documents/Agentic Workspace/platform-docs/.aw_registry/platform/core/defaults/aw-sdlc/profiles.yml';
const ECC_SYNCED_BASELINES = '/Users/prathameshai/Documents/Agentic Workspace/aw-ecc/defaults/aw-sdlc/profiles.yml';
const CONFIG_DOC = '/Users/prathameshai/Documents/Agentic Workspace/aw-ecc/docs/aw-sdlc-verify-deploy-configuration.md';
const RESEARCH_DOC = '/Users/prathameshai/Documents/Agentic Workspace/aw-ecc/docs/aw-sdlc-ghl-staging-research.md';

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

  const platformBaselines = readFileSync(PLATFORM_DOCS_BASELINES, 'utf8');
  const eccBaselines = readFileSync(ECC_SYNCED_BASELINES, 'utf8');
  const configDoc = readFileSync(CONFIG_DOC, 'utf8');
  const researchDoc = readFileSync(RESEARCH_DOC, 'utf8');

  let passed = 0;
  let failed = 0;

  if (test('ECC synced baseline matches the canonical platform-docs baseline', () => {
    assert.strictEqual(eccBaselines, platformBaselines, 'aw-ecc baseline snapshot is out of sync with platform-docs');
  })) passed++; else failed++;

  if (test('all three staging archetypes are defined', () => {
    for (const baseline of [
      'ghl-microfrontend-standard',
      'ghl-microservice-standard',
      'ghl-worker-standard',
    ]) {
      assert.ok(platformBaselines.includes(`${baseline}:`), `Missing baseline ${baseline}`);
    }
  })) passed++; else failed++;

  if (test('local validation requires unit testing in the baselines', () => {
    assert.ok(platformBaselines.includes('- unit'), 'Expected unit testing to be listed in local validation');
    assert.ok(platformBaselines.includes('required_minimums:'), 'Expected explicit local validation minimums');
  })) passed++; else failed++;

  if (test('PR governance enforces PR description checklist verification', () => {
    for (const check of [
      'pr_description_present',
      'pr_description_checklist_complete',
      'pr_verification_items_checked',
      'required_status_checks_green',
      'required_approvals_present',
      'quality_gates_green',
    ]) {
      assert.ok(platformBaselines.includes(check), `Missing PR governance check ${check}`);
    }
  })) passed++; else failed++;

  if (test('staging deployment uses GHL AI transport with concrete MFA, service, and worker mechanisms', () => {
    assert.ok(platformBaselines.includes('provider: ghl-ai'), 'Missing GHL AI staging transport');
    for (const mechanism of [
      'mechanism: versioned-mfa-staging',
      'mechanism: versioned-service-staging',
      'mechanism: versioned-worker-staging',
    ]) {
      assert.ok(platformBaselines.includes(mechanism), `Missing staging mechanism ${mechanism}`);
    }
  })) passed++; else failed++;

  if (test('current baseline intentionally disables production deploys by default', () => {
    const productionDisabledMatches = platformBaselines.match(/production:\n\s+enabled: false/g) || [];
    assert.ok(productionDisabledMatches.length >= 4, 'Expected production to be disabled across the baseline set');
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
