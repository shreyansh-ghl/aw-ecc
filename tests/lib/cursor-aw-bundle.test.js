/**
 * Tests for the post-SDLC-removal Cursor bundle.
 *
 * aw-ecc no longer ships canonical AW SDLC routing/stage skills. Those live in
 * the AW registry now; this package keeps non-SDLC command, hook, agent, and
 * registry-tooling surfaces.
 *
 * Run with: node tests/lib/cursor-aw-bundle.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CANONICAL_SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const INSTALL_MODULES_PATH = path.join(REPO_ROOT, 'manifests', 'install-modules.json');
const REMOVED_SDLC_SKILLS = [
  'using-aw-skills',
  'aw-plan',
  'aw-build',
  'aw-investigate',
  'aw-test',
  'aw-review',
  'aw-deploy',
  'aw-ship',
  'aw-feature',
  'aw-execute',
  'aw-verify',
  'aw-brainstorm',
  'aw-debug',
  'aw-prepare',
  'aw-yolo',
  'aw-spec',
  'aw-tasks',
  'aw-finish',
  'diagnose',
  'grill-with-docs',
  'grill-me',
  'improve-codebase-architecture',
  'tdd',
  'to-issues',
  'to-prd',
  'zoom-out',
];
const REQUIRED_REMAINING_SKILLS = [
  'using-platform-skills',
  'aw-adk',
  'aw-publish',
  'idea-refine',
  'api-and-interface-design',
  'documentation-and-adrs',
  'ci-cd-and-automation',
  'deprecation-and-migration',
  'context-engineering',
  'incremental-implementation',
  'frontend-ui-engineering',
  'browser-testing-with-devtools',
  'code-simplification',
  'security-and-hardening',
  'performance-optimization',
  'git-workflow-and-versioning',
];

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
  console.log('\n=== Testing Cursor AW bundle ===\n');

  let passed = 0;
  let failed = 0;

  if (test('aw-stages install module is not shipped from aw-ecc', () => {
    assert.ok(fs.existsSync(INSTALL_MODULES_PATH), `Missing install-modules.json: ${INSTALL_MODULES_PATH}`);
    const manifest = JSON.parse(fs.readFileSync(INSTALL_MODULES_PATH, 'utf8'));
    const awStages = manifest.modules.find(m => m.id === 'aw-stages');
    assert.strictEqual(awStages, undefined, 'aw-stages should not be installable from aw-ecc');
  })) passed++; else failed++;

  if (test('canonical skills exclude AW SDLC and keep non-SDLC registry tooling', () => {
    for (const skillName of REMOVED_SDLC_SKILLS) {
      const skillPath = path.join(CANONICAL_SKILLS_DIR, skillName, 'SKILL.md');
      assert.ok(!fs.existsSync(skillPath), `Deprecated SDLC skill should be absent: ${skillPath}`);
    }

    for (const skillName of REQUIRED_REMAINING_SKILLS) {
      const skillPath = path.join(CANONICAL_SKILLS_DIR, skillName, 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `Missing canonical skill: ${skillPath}`);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
