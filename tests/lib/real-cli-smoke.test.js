/**
 * Tests for scripts/lib/real-cli-smoke.js
 *
 * Run with: node tests/lib/real-cli-smoke.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  SMOKE_WORKSPACE_FILES,
  createRepoBackedSmokeWorkspace,
  detectAuthFailure,
  detectTurnLimitFailure,
  detectWorkspaceTrustFailure,
  getCliInvocation,
  parseSmokeMarkers,
  validateSmokeMarkers,
} = require(path.join(__dirname, '..', '..', 'scripts', 'lib', 'real-cli-smoke'));

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing real-cli-smoke.js ===\n');

  let passed = 0;
  let failed = 0;

  if (test('builds the expected CLI invocation shapes', () => {
    const claude = getCliInvocation('claude', 'hello', '/tmp/workspace');
    const codex = getCliInvocation('codex', 'hello', '/tmp/workspace');
    const cursor = getCliInvocation('cursor', 'hello', '/tmp/workspace');

    assert.deepStrictEqual(claude.args.slice(0, 2), ['-p', 'hello']);
    assert.ok(claude.args.includes('--max-turns'));
    assert.strictEqual(codex.args[0], 'exec');
    assert.deepStrictEqual(cursor.args, ['agent', 'hello']);
  })) passed++; else failed++;

  if (test('detects authentication-style failures', () => {
    assert.strictEqual(detectAuthFailure('Authentication required'), true);
    assert.strictEqual(detectAuthFailure('please login first'), true);
    assert.strictEqual(detectAuthFailure("You've hit your limit"), true);
    assert.strictEqual(detectAuthFailure('tokens used: 1234'), false);
    assert.strictEqual(detectAuthFailure('all good and verified'), false);
  })) passed++; else failed++;

  if (test('detects workspace trust and turn-limit failures', () => {
    assert.strictEqual(detectWorkspaceTrustFailure('Workspace Trust Required'), true);
    assert.strictEqual(detectTurnLimitFailure('Error: Reached max turns (3)'), true);
    assert.strictEqual(detectWorkspaceTrustFailure('all good'), false);
    assert.strictEqual(detectTurnLimitFailure('all good'), false);
  })) passed++; else failed++;

  if (test('parses smoke markers from output', () => {
    const markers = parseSmokeMarkers([
      'AW_SMOKE_STAGE: plan',
      'AW_SMOKE_COMMAND: /aw:brainstorm',
      'AW_SMOKE_SKILL: platform-core-aw-brainstorm',
      'AW_SMOKE_STAGE: verify',
    ].join('\n'));

    assert.strictEqual(markers.AW_SMOKE_STAGE, 'plan');
    assert.strictEqual(markers.AW_SMOKE_COMMAND, '/aw:brainstorm');
    assert.strictEqual(markers.AW_SMOKE_SKILL, 'platform-core-aw-brainstorm');
  })) passed++; else failed++;

  if (test('validates expected smoke markers exactly', () => {
    const output = [
      'AW_SMOKE_STAGE: verify',
      'AW_SMOKE_COMMAND: /aw:verify',
      'AW_SMOKE_SKILL: platform-core-aw-verify',
    ].join('\n');

    const success = validateSmokeMarkers(output, {
      AW_SMOKE_STAGE: 'verify',
      AW_SMOKE_COMMAND: '/aw:verify',
    });
    const failure = validateSmokeMarkers(output, {
      AW_SMOKE_STAGE: 'review',
    });

    assert.strictEqual(success.ok, true);
    assert.strictEqual(failure.ok, false);
    assert.ok(failure.failures[0].includes('Expected AW_SMOKE_STAGE=review'));
  })) passed++; else failed++;

  if (test('creates a minimal repo-backed smoke workspace', () => {
    const sourceRepoRoot = '/tmp/aw-ecc-review';
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-ecc-real-cli-smoke-test-'));
    const workspace = createRepoBackedSmokeWorkspace(sourceRepoRoot, tempRoot);

    assert.ok(fs.existsSync(workspace.workspaceDir));
    assert.ok(fs.existsSync(workspace.fixturePath));

    for (const relativePath of SMOKE_WORKSPACE_FILES) {
      assert.ok(fs.existsSync(path.join(workspace.workspaceDir, relativePath)), `${relativePath} missing`);
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
