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
  const supportedHarnesses = readFileSync(`${REPO_ROOT}/docs/aw-sdlc-supported-harnesses.md`, 'utf8');
  const repoAgents = readFileSync(`${REPO_ROOT}/AGENTS.md`, 'utf8');
  const codexInstall = readFileSync(`${REPO_ROOT}/.codex/INSTALL.md`, 'utf8');
  const claudeInstall = readFileSync(`${REPO_ROOT}/.claude/INSTALL.md`, 'utf8');
  const cursorInstall = readFileSync(`${REPO_ROOT}/.cursor/INSTALL.md`, 'utf8');
  const opencodeInstall = readFileSync(`${REPO_ROOT}/.opencode/INSTALL.md`, 'utf8');
  const triggerHarness = readFileSync(`${REPO_ROOT}/skills/using-aw-skills/tests/test-skill-triggers.sh`, 'utf8');
  const configDoc = readFileSync(CONFIG_DOC_PATH, 'utf8');
  let passed = 0;
  let failed = 0;

  if (test('installability plan exists and defines the product boundary', () => {
    assert.ok(installPlan.includes('## Product Boundary'));
    assert.ok(installPlan.includes('portable install guidance'));
    assert.ok(installPlan.includes('Portable Smoke Bar'));
    for (const token of ['AGENTS.md', '.claude/INSTALL.md', '.cursor/INSTALL.md', '.opencode/INSTALL.md']) {
      assert.ok(installPlan.includes(token), `installability plan is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('supported harness guide describes the minimal public surface across harnesses', () => {
    for (const token of ['Codex', 'Claude Code', 'Cursor', 'OpenCode']) {
      assert.ok(supportedHarnesses.includes(token), `supported harnesses guide is missing ${token}`);
    }
    for (const token of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy', '/aw:ship']) {
      assert.ok(supportedHarnesses.includes(token), `supported harnesses guide is missing ${token}`);
    }
  })) passed++; else failed++;

  if (test('repo-local AGENTS.md preserves the same minimal AW public surface', () => {
    for (const token of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy', '/aw:ship']) {
      assert.ok(repoAgents.includes(token), `AGENTS.md is missing ${token}`);
    }
    assert.ok(repoAgents.includes('.aw_docs/features/<feature_slug>/'), 'AGENTS.md should preserve deterministic artifacts');
  })) passed++; else failed++;

  if (test('Codex install guide is repo-local and routing-first', () => {
    assert.ok(codexInstall.includes('repo-local'));
    assert.ok(codexInstall.includes('AGENTS.md'));
    assert.ok(codexInstall.includes('skills/using-aw-skills/SKILL.md'));
    assert.ok(codexInstall.includes('commands/'));
    assert.ok(codexInstall.includes('.aw_docs/features/<feature_slug>/'));
  })) passed++; else failed++;

  if (test('supported harness install guides preserve the same public surface', () => {
    for (const content of [claudeInstall, cursorInstall, opencodeInstall]) {
      assert.ok(content.includes('AGENTS.md'), 'install guide should mention repo-local AGENTS.md');
      for (const token of ['/aw:plan', '/aw:execute', '/aw:verify', '/aw:deploy', '/aw:ship']) {
        assert.ok(content.includes(token), `install guide is missing ${token}`);
      }
      assert.ok(content.includes('.aw_docs/features/<feature_slug>/'), 'install guide should preserve deterministic artifacts');
    }
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
