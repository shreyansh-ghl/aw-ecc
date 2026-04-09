const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');

// On Windows, bash's $(pwd) returns POSIX-style paths (/c/Users/...) while
// Node's path.join returns Windows-style (C:\Users\...). Normalize for assertions.
function toPosix(p) {
  if (process.platform !== 'win32') return p;
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
}
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const MATERIALIZED_PATHS = [
  'scripts/hooks/shared/user-prompt-submit.sh',
  '.cursor/hooks/before-submit-prompt.js',
  '.cursor/hooks/adapter.js',
];

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
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

function createWorkspace() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-prompt-hook-'));
  const repoRoot = path.join(tempRoot, 'repo');
  snapshot.materializePaths(repoRoot, MATERIALIZED_PATHS);

  writeFile(repoRoot, 'AGENTS.md', '# Repo Instructions\n');
  writeFile(
    repoRoot,
    '.aw_rules/platform/universal/AGENTS.md',
    '# Universal Rules\n\n- Handle every error explicitly. [MUST]\n'
  );
  writeFile(
    repoRoot,
    '.aw_rules/platform/security/AGENTS.md',
    '# Security Rules\n\n- Never hardcode secrets. [MUST]\n'
  );

  fs.chmodSync(path.join(repoRoot, 'scripts/hooks/shared/user-prompt-submit.sh'), 0o755);
  return { tempRoot, repoRoot };
}

function run() {
  console.log(`\n=== AW SDLC Prompt Hook Reminder Contract (${REF}) ===\n`);

  const { tempRoot, repoRoot } = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    const sharedHook = path.join(repoRoot, 'scripts/hooks/shared/user-prompt-submit.sh');
    const sharedPayload = JSON.stringify({
      cwd: '/tmp/not-the-repo',
      prompt: 'Investigate the failing worker and check the staging logs.',
    });
    const sharedResult = spawnSync('bash', [sharedHook], {
      cwd: repoRoot,
      input: sharedPayload,
      encoding: 'utf8',
    });

    if (test('shared prompt hook emits the canonical AW reminder contract', () => {
      assert.strictEqual(sharedResult.status, 0, sharedResult.stderr || sharedResult.stdout);
      const output = sharedResult.stdout;
      assert.ok(output.includes('[AW Router reminder]'));
      assert.ok(output.includes('[Rules reminder]'));
      assert.ok(output.includes(`${toPosix(repoRoot)}/AGENTS.md`));
      assert.ok(output.includes(`${toPosix(repoRoot)}/.aw_rules/platform/universal/AGENTS.md`));
      assert.ok(output.includes(`${toPosix(repoRoot)}/.aw_rules/platform/security/AGENTS.md`));
      assert.ok(!output.includes('.aw_registry/.aw_rules/platform'), 'Prompt reminder should not mention the removed legacy rules path');
    })) passed++; else failed++;

    const cursorHook = path.join(repoRoot, '.cursor/hooks/before-submit-prompt.js');
    const cursorPayload = JSON.stringify({
      cwd: '/tmp/stale-cwd-from-payload',
      prompt: 'Plan the next staging deploy slice.',
    });
    const cursorResult = spawnSync('node', [cursorHook], {
      cwd: repoRoot,
      input: cursorPayload,
      encoding: 'utf8',
    });

    if (test('cursor prompt hook preserves passthrough and emits canonical reminders from the real repo cwd', () => {
      assert.strictEqual(cursorResult.status, 0, cursorResult.stderr || cursorResult.stdout);
      assert.strictEqual(cursorResult.stdout, cursorPayload);
      assert.ok(cursorResult.stderr.includes('[AW Router reminder]'));
      assert.ok(cursorResult.stderr.includes('[Rules reminder]'));
      assert.ok(cursorResult.stderr.includes(`${toPosix(repoRoot)}/AGENTS.md`));
      assert.ok(cursorResult.stderr.includes(`${toPosix(repoRoot)}/.aw_rules/platform/universal/AGENTS.md`));
      assert.ok(cursorResult.stderr.includes(`${toPosix(repoRoot)}/.aw_rules/platform/security/AGENTS.md`));
      assert.ok(!cursorResult.stderr.includes('.aw_registry/.aw_rules/platform'), 'Cursor reminder should not mention the removed legacy rules path');
    })) passed++; else failed++;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
