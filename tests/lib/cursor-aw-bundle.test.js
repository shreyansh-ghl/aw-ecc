/**
 * Tests for the Cursor AW routing bundle.
 *
 * Run with: node tests/lib/cursor-aw-bundle.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CURSOR_RULE = path.join(REPO_ROOT, '.cursor', 'rules', 'common-aw-routing.md');
const CURSOR_SKILLS_DIR = path.join(REPO_ROOT, '.cursor', 'skills');
const REQUIRED_SKILLS = [
  'using-aw-skills',
  'using-platform-skills',
  'aw-plan',
  'aw-build',
  'aw-investigate',
  'aw-test',
  'aw-review',
  'aw-deploy',
  'aw-ship',
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

  if (test('Cursor global AW routing rule exists and is alwaysApply', () => {
    assert.ok(fs.existsSync(CURSOR_RULE), `Missing Cursor routing rule: ${CURSOR_RULE}`);
    const content = fs.readFileSync(CURSOR_RULE, 'utf8');
    assert.ok(content.includes('alwaysApply: true'), 'Expected Cursor routing rule to be alwaysApply');
    assert.ok(content.includes('using-aw-skills'), 'Expected Cursor routing rule to require using-aw-skills');
    assert.ok(content.includes('~/.aw/.aw_rules/platform/'), 'Expected Cursor routing rule to point at org AW rules');
    assert.ok(content.includes('references/'), 'Expected Cursor routing rule to mention domain references');
  })) passed++; else failed++;

  if (test('Cursor bundle includes the required AW routing and stage skills', () => {
    for (const skillName of REQUIRED_SKILLS) {
      const skillPath = path.join(CURSOR_SKILLS_DIR, skillName, 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `Missing bundled Cursor skill: ${skillPath}`);
    }
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
