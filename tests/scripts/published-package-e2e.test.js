/**
 * Tests for the published-package E2E helpers.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const { runSuite } = require('../lib/harness-test-helpers');

const REPO_ROOT = path.join(__dirname, '..', '..');
const INIT_HELPER = path.join(REPO_ROOT, 'tests', 'evals', 'run-aw-isolated-init.sh');
const PUBLISHED_E2E = path.join(REPO_ROOT, 'tests', 'evals', 'run-aw-published-package-e2e.sh');
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json');

runSuite('Testing published package E2E helpers', [
  ['run-aw-isolated-init defaults to the current beta package spec', () => {
    const script = fs.readFileSync(INIT_HELPER, 'utf8');
    assert.match(script, /PACKAGE_SPEC="\$\{AW_PACKAGE_SPEC:-@ghl-ai\/aw@beta\}"/);
  }],

  ['run-aw-published-package-e2e exports AW_PACKAGE_SPEC and delegates to fresh-env runner', () => {
    const script = fs.readFileSync(PUBLISHED_E2E, 'utf8');
    assert.match(script, /PACKAGE_SPEC="\$\{2:-@ghl-ai\/aw@beta\}"/);
    assert.match(script, /export AW_PACKAGE_SPEC="\$PACKAGE_SPEC"/);
    assert.match(script, /bash "\$FRESH_ENV_RUNNER" "\$ROOT" package "\$ECC_MODE" "\$AUTH_MODE"/);
  }],

  ['package.json exposes the published-package E2E npm script', () => {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
    assert.strictEqual(
      pkg.scripts['eval:aw:published-package-e2e'],
      'bash tests/evals/run-aw-published-package-e2e.sh'
    );
  }],
]);
