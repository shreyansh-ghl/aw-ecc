#!/usr/bin/env node
/**
 * Ensure every release-facing manifest advertises the same version.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '../..');

function readJson(relativePath) {
  const filePath = path.join(REPO_ROOT, relativePath);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`);
  }
}

function getMarketplaceVersion() {
  const data = readJson('.claude-plugin/marketplace.json');
  const awPlugin = Array.isArray(data.plugins)
    ? data.plugins.find(plugin => plugin && plugin.name === 'aw')
    : null;
  return awPlugin ? awPlugin.version : undefined;
}

function main() {
  const checks = [
    {
      label: 'package.json',
      version: readJson('package.json').version,
    },
    {
      label: 'package-lock.json',
      version: readJson('package-lock.json').version,
    },
    {
      label: 'package-lock.json packages[""]',
      version: readJson('package-lock.json').packages?.['']?.version,
    },
    {
      label: '.claude-plugin/plugin.json',
      version: readJson('.claude-plugin/plugin.json').version,
    },
    {
      label: '.claude-plugin/marketplace.json plugins.aw',
      version: getMarketplaceVersion(),
    },
    {
      label: '.opencode/package.json',
      version: readJson('.opencode/package.json').version,
    },
  ];

  const expected = checks[0].version;
  let failures = 0;

  for (const check of checks) {
    if (!check.version) {
      console.error(`ERROR: ${check.label} does not expose a version`);
      failures += 1;
      continue;
    }

    if (check.version !== expected) {
      console.error(`ERROR: ${check.label} has ${check.version}, expected ${expected}`);
      failures += 1;
      continue;
    }

    console.log(`✓ ${check.label} -> ${check.version}`);
  }

  if (failures > 0) {
    console.error(`Version sync validation failed with ${failures} mismatch(es)`);
    process.exit(1);
  }

  console.log(`All release manifests are in sync at ${expected}`);
}

main();
