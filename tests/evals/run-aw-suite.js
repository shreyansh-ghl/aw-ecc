#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const { EVALS_ROOT, loadSuites, getSuiteById } = require('./lib/suite-manifest');

function printUsage() {
  console.log('Usage: node tests/evals/run-aw-suite.js <suite-id> [deterministic|routing|outcomes]');
  console.log('       node tests/evals/run-aw-suite.js --list');
}

function listSuites() {
  const { suites } = loadSuites();

  console.log('\nAvailable eval suites:\n');
  for (const suite of suites) {
    console.log(`- ${suite.id}`);
    console.log(`  layer: ${suite.layer}`);
    console.log(`  modes: ${suite.modes.join(', ')}`);
    console.log(`  manifest: ${suite.manifestPath}`);
  }
  console.log();
}

function runTestFile(testPath) {
  const absolutePath = path.join(path.resolve(EVALS_ROOT, '..', '..'), testPath);
  console.log(`\n━━━ Running ${testPath} ━━━`);

  const result = spawnSync('node', [absolutePath], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stdout.write(result.stderr);

  return result.status || 0;
}

function main() {
  const arg = process.argv[2];
  const modeFilter = process.argv[3] || null;

  if (!arg || arg === '--help' || arg === '-h') {
    printUsage();
    process.exit(arg ? 0 : 1);
  }

  if (arg === '--list') {
    listSuites();
    process.exit(0);
  }

  const suite = getSuiteById(arg);
  if (!suite) {
    console.error(`Unknown suite: ${arg}`);
    console.error('Run with --list to see available suites.');
    process.exit(1);
  }

  console.log(`\n=== Running eval suite: ${suite.id} ===`);
  console.log(`layer: ${suite.layer}`);
  console.log(`modes: ${suite.modes.join(', ')}`);
  console.log(`manifest: ${suite.manifestPath}`);
  if (modeFilter) {
    console.log(`mode filter: ${modeFilter}`);
  }

  const testPaths = suite.tests.filter(testPath => {
    if (!modeFilter) return true;
    return testPath.includes(`/tests/evals/${modeFilter}/`) || testPath.includes(`tests/evals/${modeFilter}/`);
  });

  if (modeFilter && testPaths.length === 0) {
    console.error(`No ${modeFilter} tests found in suite ${suite.id}.`);
    process.exit(1);
  }

  let failures = 0;
  for (const testPath of testPaths) {
    failures += runTestFile(testPath) === 0 ? 0 : 1;
  }

  console.log(`\nSuite ${suite.id}: ${failures === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
