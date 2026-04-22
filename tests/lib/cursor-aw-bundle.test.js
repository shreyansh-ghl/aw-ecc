/**
 * Tests for the Cursor AW routing bundle.
 *
 * The Cursor routing rule is now generated at install time as common-aw-routing.mdc
 * by the aw CLI (render-rules.mjs). Cursor only loads .mdc files, so the former
 * .md routing rule has been removed. The canonical skills/ directory is now the
 * single source of truth; .cursor/skills/ duplication was removed in favour of
 * the aw-stages install module that ships canonical skills to all targets at
 * install time.
 *
 * Run with: node tests/lib/cursor-aw-bundle.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CANONICAL_SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const INSTALL_MODULES_PATH = path.join(REPO_ROOT, 'manifests', 'install-modules.json');
const REQUIRED_SKILLS = [
  'using-aw-skills',
  'using-platform-skills',
  'aw-adk',
  'aw-publish',
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

  if (test('Cursor global AW routing rule is shipped via aw-stages install module for cursor target', () => {
    assert.ok(fs.existsSync(INSTALL_MODULES_PATH), `Missing install-modules.json: ${INSTALL_MODULES_PATH}`);
    const manifest = JSON.parse(fs.readFileSync(INSTALL_MODULES_PATH, 'utf8'));
    const awStages = manifest.modules.find(m => m.id === 'aw-stages');
    assert.ok(awStages, 'Expected aw-stages module in install-modules.json');
    assert.ok(awStages.targets.includes('cursor'), 'Expected aw-stages to support cursor target');
    assert.ok(awStages.paths.includes('skills/using-aw-skills'), 'Expected aw-stages to ship using-aw-skills');
    const routerSkill = path.join(REPO_ROOT, 'skills', 'using-aw-skills', 'SKILL.md');
    const content = fs.readFileSync(routerSkill, 'utf8');
    assert.ok(content.includes('using-aw-skills'), 'Expected router skill to reference using-aw-skills');
    assert.ok(content.includes('~/.aw_rules/platform/') || content.includes('aw_rules'), 'Expected router skill to point at org AW rules');
    assert.ok(content.includes('references/'), 'Expected router skill to mention domain references');
  })) passed++; else failed++;

  if (test('Cursor bundle includes the required AW routing and stage skills in canonical skills/', () => {
    for (const skillName of REQUIRED_SKILLS) {
      const skillPath = path.join(CANONICAL_SKILLS_DIR, skillName, 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `Missing canonical skill: ${skillPath}`);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
