#!/usr/bin/env node
/**
 * Unified AW hook generator.
 *
 * Usage:
 *   node scripts/generate-aw-hooks.js            # generate all harnesses
 *   node scripts/generate-aw-hooks.js claude     # generate just Claude
 *   node scripts/generate-aw-hooks.js codex      # generate just Codex
 *   node scripts/generate-aw-hooks.js cursor     # generate just Cursor
 */

const fs = require('fs');
const path = require('path');

const { getHarnessConfig, getSupportedHarnesses } = require('./lib/aw-harness-registry');

const repoRoot = path.join(__dirname, '..');

/**
 * Generate hook outputs for a single harness.
 *
 * @param {string} harnessName - one of 'claude', 'codex', 'cursor'
 */
function generateForHarness(harnessName) {
  const harness = getHarnessConfig(harnessName);

  const homeSourceDir = path.join(repoRoot, harness.getHomeSourceDir());
  fs.mkdirSync(homeSourceDir, { recursive: true });

  // Copy non-shared hook files from their canonical source to the output dir.
  if (harness.hookFiles.length > 0) {
    const sourceDir = path.join(repoRoot, harness.getHookSourceDir());
    const outputDir = path.join(repoRoot, harness.getOutputDir());
    fs.mkdirSync(outputDir, { recursive: true });

    for (const fileName of harness.hookFiles) {
      const sourcePath = path.join(sourceDir, fileName);
      const destinationPath = path.join(outputDir, fileName);
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(destinationPath, content);
      if (path.extname(fileName) === '.sh') {
        fs.chmodSync(destinationPath, 0o755);
      }
    }
  }

  // Copy shared hook files (e.g. cursor shared/).
  if (harness.sharedHookFiles && harness.sharedHookFiles.length > 0) {
    const sharedSourceDir = path.join(repoRoot, harness.getSharedHookSourceDir());
    const outputSharedDir = path.join(repoRoot, harness.getOutputSharedDir());
    fs.mkdirSync(outputSharedDir, { recursive: true });

    for (const fileName of harness.sharedHookFiles) {
      const sourcePath = path.join(sharedSourceDir, fileName);
      const destinationPath = path.join(outputSharedDir, fileName);
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(destinationPath, content);
    }
  }

  // Serialize and write the hooks.json config.
  const hooksJson = harness.serialize(repoRoot);

  // Write to the harness home source dir (used as neutral source).
  const homeSourceHooksJsonPath = path.join(homeSourceDir, 'hooks.json');
  fs.writeFileSync(homeSourceHooksJsonPath, hooksJson);

  // Write to the harness runtime output location.
  const outputHooksJsonPath = getOutputHooksJsonPath(harness);
  if (outputHooksJsonPath) {
    fs.mkdirSync(path.dirname(outputHooksJsonPath), { recursive: true });
    fs.writeFileSync(outputHooksJsonPath, hooksJson);
  }
}

/**
 * Returns the runtime output path for hooks.json for the given harness.
 * Returns null if the harness does not have a separate runtime output.
 *
 * @param {object} harness
 * @returns {string|null}
 */
function getOutputHooksJsonPath(harness) {
  switch (harness.name) {
    case 'claude':
      return path.join(repoRoot, 'hooks', 'hooks.json');
    case 'codex':
      return path.join(repoRoot, '.codex', 'hooks.json');
    case 'cursor':
      return path.join(repoRoot, '.cursor', 'hooks.json');
    default:
      return null;
  }
}

function main() {
  const requestedHarness = process.argv[2];
  const harnesses = requestedHarness ? [requestedHarness] : getSupportedHarnesses();

  // Validate before generating so we fail fast on typos.
  for (const h of harnesses) {
    getHarnessConfig(h); // throws on unknown harness
  }

  for (const h of harnesses) {
    generateForHarness(h);
  }
}

main();
