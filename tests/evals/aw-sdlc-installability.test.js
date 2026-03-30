const assert = require('assert');
const { readFileSync } = require('fs');
const { CONFIG_DOC_PATH, REPO_ROOT } = require('./lib/aw-sdlc-paths');

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
  console.log('\n=== AW SDLC Installability ===\n');

  const installPlan = readFileSync(`${REPO_ROOT}/docs/aw-sdlc-installability-plan.md`, 'utf8');
  const triggerHarness = readFileSync(`${REPO_ROOT}/skills/using-aw-skills/tests/test-skill-triggers.sh`, 'utf8');
  const configDoc = readFileSync(CONFIG_DOC_PATH, 'utf8');
  let passed = 0;
  let failed = 0;

  if (test('installability plan exists and defines the product boundary', () => {
    assert.ok(installPlan.includes('## Product Boundary'));
    assert.ok(installPlan.includes('portable install guidance'));
  })) passed++; else failed++;

  if (test('trigger harness is repo-relative and aligned to the minimal public surface', () => {
    assert.ok(triggerHarness.includes('DEFAULT_WORKSPACE_DIR'));
    for (const token of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy', '/aw:ship']) {
      assert.ok(triggerHarness.includes(token), `trigger harness is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('configuration docs still describe the AW verify and deploy contract', () => {
    assert.ok(configDoc.includes('PR description checklist'));
    assert.ok(configDoc.includes('ghl-ai'));
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
