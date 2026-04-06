const fs = require('fs');
const path = require('path');

const EVALS_ROOT = path.resolve(__dirname, '..');
const INDEX_PATH = path.join(EVALS_ROOT, 'suites.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSuiteIndex() {
  return readJson(INDEX_PATH);
}

function resolveSuiteFile(relativePath) {
  return path.join(EVALS_ROOT, relativePath);
}

function loadSuites() {
  const index = loadSuiteIndex();
  const suites = (index.suiteFiles || []).map(relativePath => {
    const manifest = readJson(resolveSuiteFile(relativePath));
    return {
      manifestPath: relativePath,
      ...manifest,
    };
  });

  return { index, suites };
}

function getSuiteById(id) {
  const { suites } = loadSuites();
  return suites.find(suite => suite.id === id) || null;
}

module.exports = {
  EVALS_ROOT,
  INDEX_PATH,
  loadSuiteIndex,
  loadSuites,
  getSuiteById,
  resolveSuiteFile,
};
