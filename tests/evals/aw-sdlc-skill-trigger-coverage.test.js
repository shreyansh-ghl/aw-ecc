const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = '/Users/prathameshai/Documents/Agentic Workspace/aw-ecc';
const CASES_FILE = path.join(REPO_ROOT, 'skills/using-aw-skills/tests/skill-trigger-cases.tsv');
const HARNESS_FILE = path.join(REPO_ROOT, 'skills/using-aw-skills/tests/test-skill-triggers.sh');
const ROUTER_SKILL = path.join(REPO_ROOT, 'skills/using-aw-skills/SKILL.md');
const ARCH_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-command-skill-architecture.md');
const COMMUNITIES_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-real-prompts-communities.md');

const PRIMARY_SKILL_BY_ROUTE = {
  plan: 'aw-plan',
  execute: 'aw-execute',
  verify: 'aw-verify',
  deploy: 'aw-deploy',
  ship: 'aw-ship',
};

const SKILL_PATHS = {
  'aw-plan': path.join(REPO_ROOT, 'skills/aw-plan/SKILL.md'),
  'aw-execute': path.join(REPO_ROOT, 'skills/aw-execute/SKILL.md'),
  'aw-verify': path.join(REPO_ROOT, 'skills/aw-verify/SKILL.md'),
  'aw-deploy': path.join(REPO_ROOT, 'skills/aw-deploy/SKILL.md'),
  'aw-ship': path.join(REPO_ROOT, 'skills/aw-ship/SKILL.md'),
  'platform-shared:spec-writing': '/Users/prathameshai/.aw_registry/platform/core/skills/spec-writing/SKILL.md',
  'platform-services:development': '/Users/prathameshai/.aw_registry/platform/services/skills/development/SKILL.md',
  'quality-gate-coder': '/Users/prathameshai/.aw_registry/platform/frontend/skills/quality-gate-coder/SKILL.md',
  'platform-design:system': '/Users/prathameshai/.aw_registry/platform/design/skills/system/SKILL.md',
  'platform-frontend:vue-development': '/Users/prathameshai/.aw_registry/platform/frontend/skills/vue-development/SKILL.md',
  'highrise-ui-governance': '/Users/prathameshai/.aw_registry/platform/frontend/skills/highrise-ui-governance/SKILL.md',
  'platform-review:code-review-pr': '/Users/prathameshai/.aw_registry/platform/review/skills/code-review-pr/SKILL.md',
  'platform-design:review': '/Users/prathameshai/.aw_registry/platform/design/skills/review/SKILL.md',
  'platform-frontend:a11y-review': '/Users/prathameshai/.aw_registry/platform/frontend/skills/a11y-review/SKILL.md',
  'platform-sdet:quality-gates': '/Users/prathameshai/.aw_registry/platform/sdet/skills/quality-gates/SKILL.md',
  'deploy-versioned-mfa': '/Users/prathameshai/.aw_registry/platform/infra/skills/deploy-versioned-mfa/SKILL.md',
  'platform-infra:staging-deploy': '/Users/prathameshai/.aw_registry/platform/infra/skills/staging-deploy/SKILL.md',
  'platform-infra:deployment-strategies': '/Users/prathameshai/.aw_registry/platform/infra/skills/deployment-strategies/SKILL.md',
  'platform-infra:production-readiness': '/Users/prathameshai/.aw_registry/platform/infra/skills/production-readiness/SKILL.md',
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
    ['supporting skills are real installed skills', () => {
      for (const testCase of cases) {
        for (const skill of testCase.supportingSkills) {
          assert.ok(SKILL_PATHS[skill], `missing skill-path mapping for ${skill}`);
          assert.ok(fs.existsSync(SKILL_PATHS[skill]), `missing installed skill file for ${skill}`);
        }
      }
    }],
    ['router and architecture docs advertise the skill families used in the cases', () => {
      assert.ok(routerSkill.includes('platform-services-*'), 'router skill is missing backend skill-family guidance');
      assert.ok(routerSkill.includes('platform-frontend-*'), 'router skill is missing frontend skill-family guidance');
      assert.ok(routerSkill.includes('platform-infra:*'), 'router skill is missing infra skill-family guidance');
      assert.ok(routerSkill.includes('platform-sdet:*'), 'router skill is missing quality skill-family guidance');
      assert.ok(routerSkill.includes('platform-review:*'), 'router skill is missing review skill-family guidance');
      assert.ok(architecture.includes('platform-review:code-review-pr'), 'architecture doc is missing verify support skill guidance');
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
