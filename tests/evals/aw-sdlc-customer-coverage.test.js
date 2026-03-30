const assert = require('assert');
const { CUSTOMER_CASES } = require('./fixtures/aw-sdlc-customer-cases');

function uniqueValues(cases, field) {
  return new Set(cases.map(testCase => testCase[field]));
}

function filterByRoute(route) {
  return CUSTOMER_CASES.filter(testCase => testCase.expectedRoute === route);
}

function collectLayers(cases) {
  return new Set(cases.flatMap(testCase => testCase.layersCovered || []));
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

function run() {
  console.log('\n=== AW SDLC Customer Coverage ===\n');

  let passed = 0;
  let failed = 0;

  if (test('customer-behavior matrix is large enough to be meaningful', () => {
    assert.ok(CUSTOMER_CASES.length >= 30, `Expected at least 30 cases, found ${CUSTOMER_CASES.length}`);
  })) passed++; else failed++;

  if (test('core suite covers every public command', () => {
    const coreRoutes = new Set(
      CUSTOMER_CASES.filter(testCase => testCase.suite === 'core').map(testCase => testCase.expectedRoute)
    );
    for (const route of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy']) {
      assert.ok(coreRoutes.has(route), `Core suite is missing ${route}`);
    }
  })) passed++; else failed++;

  if (test('customer-behavior cases are intent-first plain-language prompts', () => {
    const invocations = uniqueValues(CUSTOMER_CASES, 'invocation');
    assert.deepStrictEqual([...invocations], ['intent']);
  })) passed++; else failed++;

  if (test('full suite covers every category deeply enough', () => {
    const counts = CUSTOMER_CASES.reduce((acc, testCase) => {
      acc[testCase.category] = (acc[testCase.category] || 0) + 1;
      return acc;
    }, {});

    assert.ok((counts.plan || 0) >= 10, `Expected at least 10 plan cases, found ${counts.plan || 0}`);
    assert.ok((counts.execute || 0) >= 8, `Expected at least 8 execute cases, found ${counts.execute || 0}`);
    assert.ok((counts.verify || 0) >= 8, `Expected at least 8 verify cases, found ${counts.verify || 0}`);
    assert.ok((counts.deploy || 0) >= 5, `Expected at least 5 deploy cases, found ${counts.deploy || 0}`);
    assert.ok((counts.scope || 0) >= 6, `Expected at least 6 scope cases, found ${counts.scope || 0}`);
  })) passed++; else failed++;

  if (test('every command mode is covered in the customer matrix', () => {
    const expectedModesByRoute = {
      '/aw:plan': ['product', 'design', 'technical', 'tasks', 'full'],
      '/aw:execute': ['code', 'infra', 'docs', 'migration', 'config'],
      '/aw:verify': ['quality', 'review', 'readiness'],
      '/aw:deploy': ['pr', 'branch', 'staging', 'production'],
    };

    for (const [route, modes] of Object.entries(expectedModesByRoute)) {
      const routeModes = new Set(filterByRoute(route).map(testCase => testCase.expectedMode));
      for (const mode of modes) {
        assert.ok(routeModes.has(mode), `${route} is missing customer coverage for mode ${mode}`);
      }
    }
  })) passed++; else failed++;

  if (test('layer coverage exists for every public command', () => {
    const expectedLayersByRoute = {
      '/aw:plan': ['context', 'intent', 'prerequisites', 'authoring', 'coverage-check', 'handoff'],
      '/aw:execute': ['load', 'mode-select', 'task-run', 'spec-review', 'quality-review', 'handoff'],
      '/aw:verify': ['code_review', 'local_validation', 'e2e_validation', 'external_validation', 'pr_governance', 'release_readiness'],
      '/aw:deploy': ['preflight', 'release_path', 'pipeline_resolution', 'execution', 'post_deploy_evidence', 'learning'],
    };

    for (const [route, layers] of Object.entries(expectedLayersByRoute)) {
      const coveredLayers = collectLayers(filterByRoute(route));
      for (const layer of layers) {
        assert.ok(coveredLayers.has(layer), `${route} is missing customer coverage for layer ${layer}`);
      }
    }
  })) passed++; else failed++;

  if (test('stage-boundary protections are asserted for every public route', () => {
    for (const testCase of filterByRoute('/aw:plan')) {
      assert.ok(
        testCase.expectedMustNot.includes('implementation-code') || testCase.expectedMustNot.includes('code-changes'),
        `${testCase.id} should forbid implementation outputs`
      );
    }

    for (const testCase of filterByRoute('/aw:execute')) {
      assert.ok(testCase.expectedMustNot.includes('prd.md'), `${testCase.id} should forbid PRD drift`);
      assert.ok(testCase.expectedMustNot.includes('design.md'), `${testCase.id} should forbid design drift`);
    }

    for (const testCase of filterByRoute('/aw:verify')) {
      assert.ok(testCase.expectedMustNot.includes('deploy-action'), `${testCase.id} should forbid deploy actions`);
      assert.ok(
        testCase.expectedMustNot.includes('implementation-code') || testCase.expectedMustNot.includes('code-changes'),
        `${testCase.id} should forbid implementation work`
      );
    }

    for (const testCase of filterByRoute('/aw:deploy')) {
      assert.ok(
        testCase.expectedMustNot.includes('implementation-code') || testCase.expectedMustNot.includes('code-changes'),
        `${testCase.id} should forbid implementation work`
      );
    }
  })) passed++; else failed++;

  if (test('every case defines route, mode, layers, outputs, must-not, and next', () => {
    for (const testCase of CUSTOMER_CASES) {
      assert.ok(testCase.id, 'Case is missing id');
      assert.ok(testCase.prompt, `${testCase.id} is missing prompt`);
      assert.ok(testCase.invocation, `${testCase.id} is missing invocation`);
      assert.ok(testCase.expectedRoute, `${testCase.id} is missing expectedRoute`);
      assert.ok(testCase.expectedMode, `${testCase.id} is missing expectedMode`);
      assert.ok(Array.isArray(testCase.layersCovered), `${testCase.id} is missing layersCovered`);
      assert.ok(Array.isArray(testCase.expectedOutputs), `${testCase.id} is missing expectedOutputs`);
      assert.ok(Array.isArray(testCase.expectedMustNot), `${testCase.id} is missing expectedMustNot`);
      assert.ok(testCase.expectedNext, `${testCase.id} is missing expectedNext`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
