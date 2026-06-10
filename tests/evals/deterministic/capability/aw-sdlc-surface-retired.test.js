const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');

const REMOVED_COMMANDS = [
  'brainstorm',
  'build',
  'code-review',
  'deploy',
  'execute',
  'feature',
  'finish',
  'investigate',
  'plan',
  'review',
  'ship',
  'tdd',
  'test',
  'verify',
];

const REMOVED_SKILLS = [
  'aw-brainstorm',
  'aw-build',
  'aw-debug',
  'aw-deploy',
  'aw-design',
  'aw-execute',
  'aw-feature',
  'aw-finish',
  'aw-investigate',
  'aw-plan',
  'aw-prepare',
  'aw-review',
  'aw-rules',
  'aw-ship',
  'aw-spec',
  'aw-tasks',
  'aw-test',
  'aw-verify',
  'aw-yolo',
  'diagnose',
  'grill-me',
  'grill-with-docs',
  'improve-codebase-architecture',
  'tdd',
  'to-issues',
  'to-prd',
  'using-aw-skills',
  'zoom-out',
];

const REMOVED_OPENCODE_COMMANDS = ['plan', 'tdd', 'verify'];

function exists(relativePath) {
  return fs.existsSync(path.join(REPO_ROOT, relativePath));
}

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

function run() {
  console.log('\n=== Testing retired AW SDLC surface ===\n');

  let passed = 0;
  let failed = 0;

  if (test('root AW SDLC command adapters are absent', () => {
    for (const command of REMOVED_COMMANDS) {
      assert.ok(!exists(`commands/${command}.md`), `commands/${command}.md must not be shipped by aw-ecc`);
    }
  })) passed++; else failed++;

  if (test('canonical AW SDLC skills are absent', () => {
    for (const skill of REMOVED_SKILLS) {
      assert.ok(!exists(`skills/${skill}/SKILL.md`), `skills/${skill}/SKILL.md must not be shipped by aw-ecc`);
    }
  })) passed++; else failed++;

  if (test('opencode AW SDLC command mirrors are absent', () => {
    for (const command of REMOVED_OPENCODE_COMMANDS) {
      assert.ok(!exists(`.opencode/commands/${command}.md`), `.opencode/commands/${command}.md must not be shipped by aw-ecc`);
    }
  })) passed++; else failed++;

  if (test('install manifests no longer expose aw-stages', () => {
    const modules = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifests/install-modules.json'), 'utf8'));
    const profiles = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifests/install-profiles.json'), 'utf8'));
    const components = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'manifests/install-components.json'), 'utf8'));

    assert.ok(!modules.modules.some(module => module.id === 'aw-stages'), 'aw-stages module must be retired');
    for (const module of modules.modules) {
      assert.ok(!module.dependencies.includes('aw-stages'), `${module.id} must not depend on aw-stages`);
      for (const modulePath of module.paths) {
        assert.ok(!modulePath.includes('using-aw-skills'), `${module.id} must not ship using-aw-skills`);
        for (const retiredSkill of REMOVED_SKILLS) {
          assert.notStrictEqual(modulePath, `skills/${retiredSkill}`, `${module.id} must not ship ${retiredSkill}`);
        }
      }
    }
    for (const profile of Object.values(profiles.profiles)) {
      assert.ok(!profile.modules.includes('aw-stages'), 'profiles must not include aw-stages');
    }
    assert.ok(!components.components.some(component => component.id === 'baseline:aw-stages'), 'baseline:aw-stages component must be retired');
  })) passed++; else failed++;

  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
