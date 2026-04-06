const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const { REPO_ROOT } = require('./aw-sdlc-paths');

const ROUTE_TO_SKILL = {
  '/aw:plan': 'aw-plan',
  '/aw:build': 'aw-build',
  '/aw:investigate': 'aw-investigate',
  '/aw:test': 'aw-test',
  '/aw:review': 'aw-review',
  '/aw:deploy': 'aw-deploy',
  '/aw:ship': 'aw-ship',
  'aw-yolo': 'aw-yolo',
};

const REGISTRY_ROOT = process.env.AW_REGISTRY_ROOT
  ? path.resolve(process.env.AW_REGISTRY_ROOT)
  : path.join(REPO_ROOT, '.aw', '.aw_registry');

function isExternalRegistryPath(skillPath) {
  const relativePath = path.relative(REPO_ROOT, skillPath);
  return relativePath.startsWith('..');
}

function hasRegistryContent() {
  return fs.existsSync(REGISTRY_ROOT);
}

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
  'aw-yolo': path.join(REPO_ROOT, 'skills/aw-yolo/SKILL.md'),
  'aw-debug': path.join(REPO_ROOT, 'skills/aw-debug/SKILL.md'),
  'api-and-interface-design': path.join(REPO_ROOT, 'skills/api-and-interface-design/SKILL.md'),
  'browser-testing-with-devtools': path.join(REPO_ROOT, 'skills/browser-testing-with-devtools/SKILL.md'),
  'ci-cd-and-automation': path.join(REPO_ROOT, 'skills/ci-cd-and-automation/SKILL.md'),
  'code-simplification': path.join(REPO_ROOT, 'skills/code-simplification/SKILL.md'),
  'deprecation-and-migration': path.join(REPO_ROOT, 'skills/deprecation-and-migration/SKILL.md'),
  'documentation-and-adrs': path.join(REPO_ROOT, 'skills/documentation-and-adrs/SKILL.md'),
  'frontend-ui-engineering': path.join(REPO_ROOT, 'skills/frontend-ui-engineering/SKILL.md'),
  'git-workflow-and-versioning': path.join(REPO_ROOT, 'skills/git-workflow-and-versioning/SKILL.md'),
  'idea-refine': path.join(REPO_ROOT, 'skills/idea-refine/SKILL.md'),
  'incremental-implementation': path.join(REPO_ROOT, 'skills/incremental-implementation/SKILL.md'),
  'performance-optimization': path.join(REPO_ROOT, 'skills/performance-optimization/SKILL.md'),
  'security-and-hardening': path.join(REPO_ROOT, 'skills/security-and-hardening/SKILL.md'),
  'platform-design:review': registrySkillPath('platform', 'design', 'skills', 'review'),
  'platform-design:system': registrySkillPath('platform', 'design', 'skills', 'system'),
  'platform-frontend:accessibility': registrySkillPath('platform', 'frontend', 'skills', 'accessibility'),
  'platform-frontend:vue-development': registrySkillPath('platform', 'frontend', 'skills', 'vue-development'),
  'platform-infra:deployment-strategies': registrySkillPath('platform', 'infra', 'skills', 'deployment-strategies'),
  'platform-infra:grafana': registrySkillPath('platform', 'infra', 'skills', 'grafana'),
  'platform-infra:log-analysis': registrySkillPath('platform', 'infra', 'skills', 'log-analysis'),
  'platform-infra:production-readiness': registrySkillPath('platform', 'infra', 'skills', 'production-readiness'),
  'platform-infra:staging-deploy': registrySkillPath('platform', 'infra', 'skills', 'staging-deploy'),
  'platform-product:knowledge': registrySkillPath('platform', 'product', 'skills', 'knowledge'),
  'platform-review:code-review-pr': registrySkillPath('platform', 'review', 'skills', 'code-review-pr'),
  'platform-sdet:playwright-pom': registrySkillPath('platform', 'sdet', 'skills', 'playwright-pom'),
  'platform-sdet:quality-gates': registrySkillPath('platform', 'sdet', 'skills', 'quality-gates'),
  'platform-services:development': registrySkillPath('platform', 'services', 'skills', 'development'),
  'platform-services:worker-patterns': registrySkillPath('platform', 'services', 'skills', 'worker-patterns'),
  'deploy-versioned-mfa': registrySkillPath('platform', 'infra', 'skills', 'deploy-versioned-mfa'),
  'highrise-ui-governance': registrySkillPath('platform', 'frontend', 'skills', 'highrise-ui-governance'),
};

function readJson(snapshot, filePath) {
  return JSON.parse(snapshot.readFile(filePath));
}

function validateFixtureAgainstSchema(snapshot, baseSchemaPath, layerSchemaPath, fixture) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const baseSchema = readJson(snapshot, baseSchemaPath);
  const layerSchema = readJson(snapshot, layerSchemaPath);

  ajv.addSchema(baseSchema, baseSchema.$id);
  const validate = ajv.compile(layerSchema);
  const valid = validate(fixture);

  if (!valid) {
    const message = (validate.errors || [])
      .map(error => `${error.instancePath || '/'} ${error.message}`)
      .join('; ');
    throw new Error(`fixture failed schema validation: ${message}`);
  }
}

function skillPathFor(skillName) {
  const skillPath = SKILL_PATHS[skillName];
  if (!skillPath) {
    throw new Error(`missing skill-path mapping for ${skillName}`);
  }
  return skillPath;
}

function readPathFromSnapshotOrDisk(snapshot, absolutePath) {
  const relativePath = path.relative(REPO_ROOT, absolutePath);
  if (!relativePath.startsWith('..') && snapshot.fileExists(relativePath)) {
    return snapshot.readFile(relativePath);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function skillExists(snapshot, skillName) {
  const skillPath = skillPathFor(skillName);
  const isExternalRegistrySkill = isExternalRegistryPath(skillPath);

  if (isExternalRegistrySkill && !hasRegistryContent()) {
    return;
  }

  if (snapshot.isWorktree()) {
    if (!fs.existsSync(skillPath)) {
      throw new Error(`missing skill file for ${skillName}`);
    }
    return;
  }

  const relativePath = path.relative(REPO_ROOT, skillPath);
  if (!relativePath.startsWith('..')) {
    if (!snapshot.fileExists(relativePath)) {
      throw new Error(`missing skill file for ${skillName}`);
    }
    return;
  }

  if (!fs.existsSync(skillPath)) {
    throw new Error(`missing skill file for ${skillName}`);
  }
}

module.exports = {
  REGISTRY_ROOT,
  ROUTE_TO_SKILL,
  SKILL_PATHS,
  readJson,
  readPathFromSnapshotOrDisk,
  registrySkillPath,
  skillExists,
  skillPathFor,
  validateFixtureAgainstSchema,
};
