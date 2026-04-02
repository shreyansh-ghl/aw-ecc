const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

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
  console.log(`\n=== AW SDLC Execute Worker Assets (${REF}) ===\n`);

  let passed = 0;
  let failed = 0;

  if (test('repo ships concrete worker references and bundle generator', () => {
    for (const filePath of [
      'skills/aw-execute/references/worker-implementer.md',
      'skills/aw-execute/references/worker-spec-reviewer.md',
      'skills/aw-execute/references/worker-quality-reviewer.md',
      'skills/aw-execute/references/worker-parallel-worker.md',
      'skills/aw-execute/scripts/build-worker-bundle.js',
    ]) {
      assert.ok(snapshot.fileExists(filePath), `Missing ${filePath}`);
    }
  })) passed++; else failed++;

  if (test('execute skill and command point to the runtime assets', () => {
    const executeSkill = snapshot.readFile('skills/aw-execute/SKILL.md');
    const executeCommand = snapshot.readFile('commands/execute.md');

    for (const phrase of [
      '## Worker Runtime Assets',
      'worker-implementer.md',
      'worker-spec-reviewer.md',
      'worker-quality-reviewer.md',
      'worker-parallel-worker.md',
      'build-worker-bundle.js',
    ]) {
      assert.ok(
        executeSkill.includes(phrase) || executeCommand.includes(phrase),
        `Missing worker runtime guidance for ${phrase}`
      );
    }
  })) passed++; else failed++;

  if (test('worker bundle generator emits orchestration-ready role manifests', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-execute-bundle-'));

    try {
      const tasksFilePath = path.join(tempRoot, 'tasks.md');
      fs.writeFileSync(
        tasksFilePath,
        [
          '# Tasks',
          '',
          '1. Add normalizeBatchId helper.',
          '2. Update queue payload to use the normalized value.',
        ].join('\n'),
        'utf8'
      );

      const stdout = execFileSync(
        'node',
        [
          path.join(REPO_ROOT, 'skills/aw-execute/scripts/build-worker-bundle.js'),
          '--feature',
          'contact-sync-api',
          '--tasks-file',
          tasksFilePath,
          '--allow-parallel',
        ],
        {
          cwd: REPO_ROOT,
          encoding: 'utf8',
        }
      );

      const bundle = JSON.parse(stdout);
      assert.strictEqual(bundle.schema_version, 'aw.execute.worker-bundle.v1');
      assert.strictEqual(bundle.feature_slug, 'contact-sync-api');
      assert.strictEqual(bundle.task_units.length, 2);
      assert.ok(bundle.task_units[0].roles.implementer.reference_path.includes('worker-implementer.md'));
      assert.ok(bundle.task_units[0].roles.spec_reviewer.reference_path.includes('worker-spec-reviewer.md'));
      assert.ok(bundle.task_units[0].roles.quality_reviewer.reference_path.includes('worker-quality-reviewer.md'));
      assert.ok(bundle.task_units[0].roles.parallel_worker.reference_path.includes('worker-parallel-worker.md'));
      assert.strictEqual(bundle.orchestration_plan.sessionName, 'aw-execute-contact-sync-api');
      assert.strictEqual(bundle.orchestration_plan.workers.length, 2);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
