const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);
const HOOK_PATH = 'skills/using-aw-skills/hooks/session-start.sh';

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

function run() {
  console.log(`\n=== AW SDLC Session Hook Precedence (${REF}) ===\n`);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-hook-'));
  const repoRoot = path.join(tempRoot, 'repo');
  const hookFile = path.join(repoRoot, HOOK_PATH);
  let passed = 0;
  let failed = 0;

  try {
    writeFile(repoRoot, HOOK_PATH, snapshot.readFile(HOOK_PATH));
    fs.chmodSync(hookFile, 0o755);

    writeFile(
      repoRoot,
      'skills/using-aw-skills/SKILL.md',
      [
        '---',
        'name: local-router-skill',
        'description: repo-local routing skill',
        '---',
        '',
        '# Local Router',
        'LOCAL_ROUTER_MARKER',
      ].join('\n')
    );
    writeFile(
      repoRoot,
      'skills/aw-plan/SKILL.md',
      [
        '---',
        'name: local-plan-skill',
        'description: local planning skill',
        '---',
      ].join('\n')
    );
    writeFile(
      repoRoot,
      'commands/plan.md',
      [
        '---',
        'name: aw:plan',
        'description: local plan command',
        '---',
        '',
        '# Plan',
      ].join('\n')
    );

    writeFile(
      tempRoot,
      '.aw_registry/platform/core/skills/using-aw-skills/SKILL.md',
      [
        '---',
        'name: global-router-skill',
        'description: fallback routing skill',
        '---',
        '',
        '# Global Router',
        'GLOBAL_ROUTER_MARKER',
      ].join('\n')
    );
    writeFile(
      tempRoot,
      '.aw_registry/platform/core/skills/fallback-skill/SKILL.md',
      [
        '---',
        'name: fallback-skill-marker',
        'description: fallback domain skill',
        '---',
      ].join('\n')
    );
    writeFile(
      tempRoot,
      '.aw_registry/commands/fallback.md',
      [
        '---',
        'name: aw:fallback',
        'description: fallback command',
        '---',
        '',
        '# Fallback',
      ].join('\n')
    );

    const result = spawnSync('bash', [hookFile], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (test('hook exits successfully', () => {
      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    })) passed++; else failed++;

    const payload = JSON.parse(result.stdout);
    const context = payload?.hookSpecificOutput?.additionalContext || '';

    if (test('repo-local routing skill wins over fallback registry routing', () => {
      assert.ok(context.includes('LOCAL_ROUTER_MARKER'), 'Expected local routing content in the hook context');
      assert.ok(!context.includes('GLOBAL_ROUTER_MARKER'), 'Fallback routing content should not override the repo-local router');
    })) passed++; else failed++;

    if (test('fallback registry discovery still contributes domain skills and commands', () => {
      assert.ok(context.includes('fallback-skill-marker'), 'Expected fallback skills to remain discoverable');
      assert.ok(context.includes('- fallback:'), 'Expected fallback commands to remain discoverable');
    })) passed++; else failed++;
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
