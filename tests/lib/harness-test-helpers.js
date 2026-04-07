/**
 * Shared test helpers for harness-generated-output and generator-script tests.
 *
 * Usage:
 *
 *   const { test, runSuite } = require('./harness-test-helpers');
 *
 *   runSuite('My Suite', [
 *     ['does the thing', () => { assert.ok(true); }],
 *   ]);
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/**
 * Run a single named test, printing pass/fail and returning a boolean.
 *
 * @param {string} name
 * @param {() => void} fn - synchronous test body; throws on failure
 * @returns {boolean} true if passed
 */
function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

/**
 * Run a suite of [name, fn] pairs, print a summary, and exit with 0 or 1.
 *
 * @param {string} suiteName
 * @param {Array<[string, () => void]>} cases
 */
function runSuite(suiteName, cases) {
  console.log(`\n=== ${suiteName} ===\n`);
  let passed = 0;
  let failed = 0;
  for (const [name, fn] of cases) {
    if (test(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Build test cases that verify generated hook outputs match their canonical
 * source files.
 *
 * @param {object} opts
 * @param {string} opts.sourceDir    - dir containing canonical source files
 * @param {string} opts.outputDir    - dir containing generated output files
 * @param {string[]} opts.files      - file names to compare source vs output
 * @param {string} [opts.configSourceFile] - path to the canonical config JSON
 * @param {string} [opts.configOutputFile] - path to the generated config JSON
 * @returns {Array<[string, () => void]>}
 */
function buildGeneratedOutputTests({
  sourceDir,
  outputDir,
  files = [],
  configSourceFile,
  configOutputFile,
} = {}) {
  const cases = [];

  if (sourceDir) {
    cases.push([`source directory exists: ${path.basename(sourceDir)}`, () => {
      assert.ok(fs.existsSync(sourceDir), `Expected source dir to exist: ${sourceDir}`);
    }]);
  }

  if (outputDir && files.length > 0) {
    cases.push([`generated hook files match source files`, () => {
      for (const fileName of files) {
        const sourcePath = path.join(sourceDir, fileName);
        const outputPath = path.join(outputDir, fileName);
        assert.ok(fs.existsSync(sourcePath), `Missing source file: ${sourcePath}`);
        assert.ok(fs.existsSync(outputPath), `Missing generated file: ${outputPath}`);
        assert.strictEqual(
          fs.readFileSync(outputPath, 'utf8'),
          fs.readFileSync(sourcePath, 'utf8'),
          `Generated output drifted from source for ${fileName}`
        );
      }
    }]);
  }

  if (configSourceFile && configOutputFile) {
    cases.push([`generated hooks.json matches source`, () => {
      assert.ok(fs.existsSync(configSourceFile), `Missing config source: ${configSourceFile}`);
      assert.ok(fs.existsSync(configOutputFile), `Missing generated config: ${configOutputFile}`);
      assert.strictEqual(
        fs.readFileSync(configOutputFile, 'utf8'),
        fs.readFileSync(configSourceFile, 'utf8'),
        `Generated hooks.json drifted from source`
      );
    }]);
  }

  return cases;
}

/**
 * Build a test case that verifies a generator script (or the unified
 * generate-aw-hooks.js with a harness arg) can regenerate its outputs.
 *
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {string} opts.scriptPath       - absolute path to generate-aw-hooks.js
 * @param {string} [opts.harnessArg]     - optional CLI arg (e.g. 'claude')
 * @param {string} opts.targetHookFile   - a representative generated hook file
 * @param {string} opts.sourceHookFile   - canonical source for that hook file
 * @param {string} [opts.targetSharedFile]  - optional shared file
 * @param {string} [opts.sourceSharedFile]  - canonical source for shared file
 * @param {string} opts.targetConfigFile - generated hooks.json path
 * @param {string} opts.sourceConfigFile - canonical hooks.json source path
 * @param {string} opts.caseName         - human-readable test case label
 * @returns {[string, () => void]}
 */
function buildGeneratorScriptTest({
  repoRoot,
  scriptPath,
  harnessArg,
  targetHookFile,
  sourceHookFile,
  targetSharedFile,
  sourceSharedFile,
  targetConfigFile,
  sourceConfigFile,
  caseName,
}) {
  const scriptArgs = harnessArg ? [scriptPath, harnessArg] : [scriptPath];

  return [caseName, () => {
    const sourceHookContent = sourceHookFile ? fs.readFileSync(sourceHookFile, 'utf8') : null;
    const sourceSharedContent = sourceSharedFile ? fs.readFileSync(sourceSharedFile, 'utf8') : null;
    const sourceConfigContent = fs.readFileSync(sourceConfigFile, 'utf8');

    try {
      if (targetHookFile) {
        fs.writeFileSync(targetHookFile, '# drifted output\n');
      }
      if (targetSharedFile) {
        fs.writeFileSync(targetSharedFile, '# drifted output\n');
      }
      fs.writeFileSync(targetConfigFile, '{"drifted":true}\n');
      if (sourceConfigFile && targetHookFile === null && targetSharedFile === null) {
        // claude: also drift the source
        fs.writeFileSync(sourceConfigFile, '{"drifted":true}\n');
      }

      execFileSync('node', scriptArgs, {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      if (targetHookFile && sourceHookContent !== null) {
        assert.strictEqual(fs.readFileSync(targetHookFile, 'utf8'), sourceHookContent);
      }
      if (targetSharedFile && sourceSharedContent !== null) {
        assert.strictEqual(fs.readFileSync(targetSharedFile, 'utf8'), sourceSharedContent);
      }
      assert.strictEqual(fs.readFileSync(targetConfigFile, 'utf8'), sourceConfigContent);
      assert.notStrictEqual(fs.readFileSync(targetConfigFile, 'utf8'), '{"drifted":true}\n');
    } finally {
      if (targetHookFile && sourceHookContent !== null) {
        fs.writeFileSync(targetHookFile, sourceHookContent);
      }
      if (targetSharedFile && sourceSharedContent !== null) {
        fs.writeFileSync(targetSharedFile, sourceSharedContent);
      }
      execFileSync('node', scriptArgs, {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    }
  }];
}

module.exports = {
  test,
  runSuite,
  buildGeneratedOutputTests,
  buildGeneratorScriptTest,
};
