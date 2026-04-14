const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('../../lib/repo-snapshot');
const { REPO_ROOT } = require('../../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

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
  console.log(`\n=== AW SDLC Activation Strictness (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('repo-local AGENTS requires AW skill-stack selection before substantive response', () => {
    const agents = snapshot.readFile('AGENTS.md');
    for (const phrase of [
      'Before any substantive response',
      'select the smallest correct AW skill stack first',
      'Do not begin with generic workflow commentary',
    ]) {
      assert.ok(agents.includes(phrase), `AGENTS.md is missing "${phrase}"`);
    }
  })) passed++; else failed++;

  if (test('router skill encodes skill-first activation before deeper behavior', () => {
    const skill = snapshot.readFile('skills/using-aw-skills/SKILL.md');
    for (const phrase of [
      '## Hard Gate',
      'before any substantive response',
      '## Skill Loading Priority',
      '## Red Flags',
      'do not produce substantive non-routing output before skill selection',
    ]) {
      assert.ok(skill.includes(phrase), `router skill is missing "${phrase}"`);
    }
  })) passed++; else failed++;

  if (test('session-start hook injects the full SKILL.md with activation directive', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-activation-'));
    const repoRoot = path.join(tempRoot, 'repo');
    const hookPath = path.join(repoRoot, 'skills/using-aw-skills/hooks/session-start.sh');

    try {
      writeFile(repoRoot, 'skills/using-aw-skills/hooks/session-start.sh', snapshot.readFile('skills/using-aw-skills/hooks/session-start.sh'));
      fs.chmodSync(hookPath, 0o755);
      writeFile(
        repoRoot,
        'skills/using-aw-skills/SKILL.md',
        [
          '---',
          'name: local-router',
          'description: local router',
          '---',
          '',
          '# Local Router',
        ].join('\n')
      );

      const result = spawnSync('bash', [hookPath], {
        cwd: repoRoot,
        encoding: 'utf8',
      });

      assert.strictEqual(result.status, 0, result.stderr || result.stdout);
      const payload = JSON.parse(result.stdout);
      const context = payload?.hookSpecificOutput?.additionalContext || '';

      for (const phrase of [
        '<EXTREMELY_IMPORTANT>',
        'using-aw-skills',
        '# Local Router',
        'YOU MUST USE IT',
      ]) {
        assert.ok(context.includes(phrase), `hook context is missing "${phrase}"`);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
