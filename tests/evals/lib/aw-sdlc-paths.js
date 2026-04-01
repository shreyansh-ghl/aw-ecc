const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PLATFORM_DOCS_ROOT = process.env.AW_SDLC_PLATFORM_DOCS_ROOT
  ? path.resolve(process.env.AW_SDLC_PLATFORM_DOCS_ROOT)
  : path.resolve(REPO_ROOT, '..', 'platform-docs');

const ROUTER_SKILL_PATH = path.join(REPO_ROOT, 'skills', 'using-aw-skills', 'SKILL.md');
const CONFIG_DOC_PATH = path.join(REPO_ROOT, 'docs', 'aw-sdlc-verify-deploy-configuration.md');
const RESEARCH_DOC_PATH = path.join(REPO_ROOT, 'docs', 'aw-sdlc-ghl-staging-research.md');
const COMMAND_CONTRACTS_PATH = path.join(REPO_ROOT, 'docs', 'aw-sdlc-command-contracts.md');
const ECC_BASELINES_PATH = path.join(REPO_ROOT, 'defaults', 'aw-sdlc', 'baseline-profiles.yml');
const PLATFORM_DOCS_BASELINES_PATH = path.join(
  PLATFORM_DOCS_ROOT,
  '.aw_registry',
  'platform',
  'core',
  'defaults',
  'aw-sdlc',
  'baseline-profiles.yml'
);

function pathExists(targetPath) {
  return fs.existsSync(targetPath);
}

module.exports = {
  REPO_ROOT,
  PLATFORM_DOCS_ROOT,
  ROUTER_SKILL_PATH,
  CONFIG_DOC_PATH,
  RESEARCH_DOC_PATH,
  COMMAND_CONTRACTS_PATH,
  ECC_BASELINES_PATH,
  PLATFORM_DOCS_BASELINES_PATH,
  pathExists,
};
