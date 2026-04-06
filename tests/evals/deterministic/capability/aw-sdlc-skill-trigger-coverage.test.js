const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const CASES_FILE = path.join(REPO_ROOT, 'skills/using-aw-skills/evals/skill-trigger-cases.tsv');
const HARNESS_FILE = path.join(REPO_ROOT, 'skills/using-aw-skills/evals/test-skill-triggers.sh');
const ROUTER_SKILL = path.join(REPO_ROOT, 'skills/using-aw-skills/SKILL.md');
const PLATFORM_ROUTER_SKILL = path.join(REPO_ROOT, 'skills/using-platform-skills/SKILL.md');
const ARCH_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-command-skill-architecture.md');
const COMMUNITIES_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-outcomes-prompts-communities.md');
const REGISTRY_ROOT = process.env.AW_REGISTRY_ROOT
  ? path.resolve(process.env.AW_REGISTRY_ROOT)
  : path.join(REPO_ROOT, '.aw_registry');

const PRIMARY_SKILL_BY_ROUTE = {
  plan: 'aw-plan',
  build: 'aw-build',
  investigate: 'aw-investigate',
  test: 'aw-test',
  review: 'aw-review',
  deploy: 'aw-deploy',
  ship: 'aw-ship',
};

function registrySkillPath(...segments) {
  return path.join(REGISTRY_ROOT, ...segments, 'SKILL.md');
}

const SKILL_PATHS = {
  'aw-plan': path.join(REPO_ROOT, 'skills/aw-plan/SKILL.md'),
  'aw-build': path.join(REPO_ROOT, 'skills/aw-build/SKILL.md'),
  'aw-investigate': path.join(REPO_ROOT, 'skills/aw-investigate/SKILL.md'),
  'aw-test': path.join(REPO_ROOT, 'skills/aw-test/SKILL.md'),
  'aw-review': path.join(REPO_ROOT, 'skills/aw-review/SKILL.md'),
  'aw-deploy': path.join(REPO_ROOT, 'skills/aw-deploy/SKILL.md'),
  'aw-ship': path.join(REPO_ROOT, 'skills/aw-ship/SKILL.md'),
  'platform-services:development': registrySkillPath('platform', 'services', 'skills', 'development'),
  'quality-gate-coder': registrySkillPath('platform', 'frontend', 'skills', 'quality-gate-coder'),
  'platform-infra:grafana': registrySkillPath('platform', 'infra', 'skills', 'grafana'),
  'platform-design:system': registrySkillPath('platform', 'design', 'skills', 'system'),
  'platform-frontend:vue-development': registrySkillPath('platform', 'frontend', 'skills', 'vue-development'),
  'highrise-ui-governance': registrySkillPath('platform', 'frontend', 'skills', 'highrise-ui-governance'),
  'platform-review:code-review-pr': registrySkillPath('platform', 'review', 'skills', 'code-review-pr'),
  'platform-design:review': registrySkillPath('platform', 'design', 'skills', 'review'),
  'platform-frontend:a11y-review': registrySkillPath('platform', 'frontend', 'skills', 'a11y-review'),
  'platform-sdet:quality-gates': registrySkillPath('platform', 'sdet', 'skills', 'quality-gates'),
  'deploy-versioned-mfa': registrySkillPath('platform', 'infra', 'skills', 'deploy-versioned-mfa'),
  'platform-infra:staging-deploy': registrySkillPath('platform', 'infra', 'skills', 'staging-deploy'),
  'platform-infra:deployment-strategies': registrySkillPath('platform', 'infra', 'skills', 'deployment-strategies'),
  'platform-infra:production-readiness': registrySkillPath('platform', 'infra', 'skills', 'production-readiness'),
  'idea-refine': path.join(REPO_ROOT, 'skills/idea-refine/SKILL.md'),
  'api-and-interface-design': path.join(REPO_ROOT, 'skills/api-and-interface-design/SKILL.md'),
  'browser-testing-with-devtools': path.join(REPO_ROOT, 'skills/browser-testing-with-devtools/SKILL.md'),
  'code-simplification': path.join(REPO_ROOT, 'skills/code-simplification/SKILL.md'),
  'security-and-hardening': path.join(REPO_ROOT, 'skills/security-and-hardening/SKILL.md'),
  'performance-optimization': path.join(REPO_ROOT, 'skills/performance-optimization/SKILL.md'),
  'git-workflow-and-versioning': path.join(REPO_ROOT, 'skills/git-workflow-and-versioning/SKILL.md'),
  'ci-cd-and-automation': path.join(REPO_ROOT, 'skills/ci-cd-and-automation/SKILL.md'),
  'deprecation-and-migration': path.join(REPO_ROOT, 'skills/deprecation-and-migration/SKILL.md'),
  'documentation-and-adrs': path.join(REPO_ROOT, 'skills/documentation-and-adrs/SKILL.md'),
};

function parseCases() {
  const lines = fs.readFileSync(CASES_FILE, 'utf8').split(/\r?\n/);
  return lines
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [mode, prompt, expectedPattern, description, expectedRoute, primarySkill, supportingSkills] = line.split('\t');
      return {
        mode,
        prompt,
        expectedPattern,
        description,
        expectedRoute,
        primarySkill,
        supportingSkills: supportingSkills ? supportingSkills.split(',').map(item => item.trim()).filter(Boolean) : [],
      };
    });
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
  console.log('\n=== AW SDLC Skill Trigger Coverage ===\n');

  const cases = parseCases();
  const routerSkill = fs.readFileSync(ROUTER_SKILL, 'utf8');
  const platformRouterSkill = fs.readFileSync(PLATFORM_ROUTER_SKILL, 'utf8');
  const architecture = fs.readFileSync(ARCH_DOC, 'utf8');
  const communities = fs.readFileSync(COMMUNITIES_DOC, 'utf8');
  const harness = fs.readFileSync(HARNESS_FILE, 'utf8');

  let passed = 0;
  let failed = 0;

  const checks = [
    ['cases file exists and is non-trivial', () => {
      assert.ok(fs.existsSync(CASES_FILE), 'missing skill-trigger cases file');
      assert.ok(cases.length >= 8, 'skill-trigger matrix is too small');
    }],
    ['cases stay intent-first and slash-command free', () => {
      for (const testCase of cases) {
        assert.ok(!/\/aw:/i.test(testCase.prompt), `prompt should stay intent-first: ${testCase.description}`);
      }
    }],
    ['cases cover every public route', () => {
      const covered = new Set(cases.map(testCase => testCase.expectedRoute));
      for (const route of Object.keys(PRIMARY_SKILL_BY_ROUTE)) {
        assert.ok(covered.has(route), `missing route coverage for ${route}`);
      }
    }],
    ['expanded matrix covers the new Addy-parity craft skills', () => {
      const coveredSupportingSkills = new Set(cases.flatMap(testCase => testCase.supportingSkills));
      for (const skill of [
        'idea-refine',
        'api-and-interface-design',
        'browser-testing-with-devtools',
        'code-simplification',
        'security-and-hardening',
        'performance-optimization',
        'git-workflow-and-versioning',
        'ci-cd-and-automation',
        'deprecation-and-migration',
        'documentation-and-adrs',
      ]) {
        assert.ok(coveredSupportingSkills.has(skill), `missing trigger coverage for ${skill}`);
      }
    }],
    ['primary skill expectations match the public route contract', () => {
      for (const testCase of cases) {
        assert.equal(
          testCase.primarySkill,
          PRIMARY_SKILL_BY_ROUTE[testCase.expectedRoute],
          `primary skill mismatch for ${testCase.description}`
        );
        assert.ok(fs.existsSync(SKILL_PATHS[testCase.primarySkill]), `missing primary skill file for ${testCase.primarySkill}`);
      }
    }],
    ['supporting skills have stable skill-file mappings', () => {
      for (const testCase of cases) {
        for (const skill of testCase.supportingSkills) {
          const skillPath = SKILL_PATHS[skill];
          assert.ok(skillPath, `missing skill-path mapping for ${skill}`);
          assert.ok(skillPath.endsWith(`${path.sep}SKILL.md`) || skillPath.endsWith('/SKILL.md'), `invalid skill file mapping for ${skill}`);
          if (skill.startsWith('aw-')) {
            assert.ok(fs.existsSync(skillPath), `missing installed skill file for ${skill}`);
          }
        }
      }
    }],
    ['router and architecture docs advertise the skill families used in the cases', () => {
      assert.ok(routerSkill.includes('using-platform-skills'), 'router skill should delegate platform selection');
      assert.ok(platformRouterSkill.includes('platform-services:*'), 'platform router is missing backend skill-family guidance');
      assert.ok(platformRouterSkill.includes('platform-frontend:*'), 'platform router is missing frontend skill-family guidance');
      assert.ok(platformRouterSkill.includes('platform-infra:*'), 'platform router is missing infra skill-family guidance');
      assert.ok(platformRouterSkill.includes('platform-sdet:*'), 'platform router is missing quality skill-family guidance');
      assert.ok(platformRouterSkill.includes('platform-review:*'), 'platform router is missing review skill-family guidance');
      assert.ok(architecture.includes('platform-review:code-review-pr'), 'architecture doc is missing review support skill guidance');
      assert.ok(architecture.includes('deploy-versioned-mfa'), 'architecture doc is missing deploy support skill guidance');
    }],
    ['Communities prompt pack is represented in the trigger matrix', () => {
      assert.ok(communities.includes('Communities Moderation API'), 'communities doc should cover backend app');
      assert.ok(communities.includes('Communities Feed MFA'), 'communities doc should cover frontend app');
      assert.ok(cases.some(testCase => /Communities moderation API/i.test(testCase.prompt)), 'missing backend Communities trigger case');
      assert.ok(cases.some(testCase => /Communities feed MFA/i.test(testCase.prompt)), 'missing frontend Communities trigger case');
    }],
    ['shell harness uses the shared cases file', () => {
      assert.ok(harness.includes('skill-trigger-cases.tsv'), 'trigger harness should read from the shared cases file');
      assert.ok(harness.includes('load_test_cases'), 'trigger harness should load shared test cases');
    }],
  ];

  for (const [name, fn] of checks) {
    if (test(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
