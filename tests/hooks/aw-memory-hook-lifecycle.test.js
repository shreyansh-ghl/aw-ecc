/**
 * Tests for AW memory hook process lifecycle safety.
 *
 * Run with: node tests/hooks/aw-memory-hook-lifecycle.test.js
 */

const assert = require('assert');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result.then(
        () => {
          console.log(`  ok ${name}`);
          return true;
        },
        (error) => {
          console.log(`  not ok ${name}`);
          console.log(`    ${error.stack || error.message}`);
          return false;
        }
      );
    }
    console.log(`  ok ${name}`);
    return true;
  } catch (error) {
    console.log(`  not ok ${name}`);
    console.log(`    ${error.stack || error.message}`);
    return false;
  }
}

function waitForExit(child, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      resolve({ exited: false });
    }, timeoutMs);

    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exited: true, code, signal });
    });
  });
}

async function runHookWithOpenStdin(scriptName) {
  const child = spawn(process.execPath, [path.join(repoRoot, 'scripts', 'hooks', scriptName)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      AW_MEMORY_HOOKS: '0',
      AW_MEMORY_HOOK_TIMEOUT_MS: '200',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdin.write('{"prompt":"partial hook payload"');
  const result = await waitForExit(child, 1500);

  return result;
}

async function runTests() {
  console.log('\n=== Testing AW memory hook lifecycle ===\n');

  const results = [];

  for (const scriptName of [
    'aw-memory-recall.js',
    'aw-memory-intent-capture.js',
    'aw-memory-sync.js',
  ]) {
    results.push(await test(`${scriptName} exits when stdin never closes`, async () => {
      const result = await runHookWithOpenStdin(scriptName);

      assert.strictEqual(result.exited, true);
      assert.strictEqual(result.signal, null);
      assert.strictEqual(result.code, 0);
    }));
  }

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
