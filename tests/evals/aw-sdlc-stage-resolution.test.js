const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 120000);
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const MATERIALIZED_PATHS = [
  'AGENTS.md',
  'commands/brainstorm.md',
  'commands/plan.md',
  'commands/execute.md',
  'commands/verify.md',
  'commands/finish.md',
  'commands/deploy.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-finish/SKILL.md',
];

const CASES = [
  {
    id: 'plan-stage-resolution',
    userPrompt: 'Create a PRD for a contact sync worker feature.',
    expectedPublicCommand: '/aw:plan',
    expectedInternalStage: 'plan',
    expectedInternalCommand: '/aw:plan',
    expectedInternalSkill: 'aw-plan',
  },
  {
    id: 'execute-stage-resolution',
    userPrompt: 'Implement the approved contact sync worker spec.',
    expectedPublicCommand: '/aw:execute',
    expectedInternalStage: 'execute',
    expectedInternalCommand: '/aw:execute',
    expectedInternalSkill: 'aw-execute',
  },
  {
    id: 'verify-stage-resolution',
    userPrompt: 'Review and validate the completed contact sync worker implementation.',
    expectedPublicCommand: '/aw:verify',
    expectedInternalStage: 'verify',
    expectedInternalCommand: '/aw:verify',
    expectedInternalSkill: 'aw-verify',
  },
  {
    id: 'deploy-stage-resolution',
    userPrompt: 'Deploy the verified contact sync worker to staging.',
    expectedPublicCommand: '/aw:deploy',
    expectedInternalStage: 'deploy',
    expectedInternalCommand: '/aw:deploy',
    expectedInternalSkill: 'aw-deploy',
  },
];

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function createWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-stage-eval-'));
  snapshot.materializePaths(workspaceDir, MATERIALIZED_PATHS);

  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    `AW SDLC internal stage resolution workspace for ${REF}\n`,
    'utf8'
  );

  return workspaceDir;
}

function buildPrompt(userPrompt) {
  return [
    'You are evaluating both the public routing and the first internal execution stage for this AW SDLC repo snapshot.',
    'Use only the repo-local command and skill files as the source of truth.',
    'Inspect commands/ and skills/using-aw-skills/SKILL.md before deciding.',
    'Return exactly these lines and nothing else:',
    'AW_EVAL_PUBLIC_COMMAND: </aw:plan|/aw:execute|/aw:verify|/aw:deploy|unknown>',
    'AW_EVAL_INTERNAL_STAGE: <plan|execute|verify|deploy|brainstorm|finish|unknown>',
    'AW_EVAL_INTERNAL_COMMAND: </aw:plan|/aw:execute|/aw:verify|/aw:deploy|/aw:brainstorm|/aw:finish|unknown>',
    'AW_EVAL_INTERNAL_SKILL: <aw-plan|aw-execute|aw-verify|aw-deploy|aw-brainstorm|aw-finish|unknown>',
    'AW_EVAL_REASON: <one short sentence>',
    '',
    `User request: ${userPrompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const result = spawnSync(CLI, ['exec', '--skip-git-repo-check', prompt], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });
  return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
}

function parseLine(output, key) {
  return output.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim();
}

function run() {
  console.log(`\n=== AW SDLC Stage Resolution Eval (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of CASES) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase.userPrompt));
      const publicCommand = parseLine(output, 'AW_EVAL_PUBLIC_COMMAND');
      const internalStage = parseLine(output, 'AW_EVAL_INTERNAL_STAGE');
      const internalCommand = parseLine(output, 'AW_EVAL_INTERNAL_COMMAND');
      const internalSkill = parseLine(output, 'AW_EVAL_INTERNAL_SKILL');
      const reason = parseLine(output, 'AW_EVAL_REASON');

      try {
        assert.strictEqual(publicCommand, testCase.expectedPublicCommand);
        assert.strictEqual(internalStage, testCase.expectedInternalStage);
        assert.strictEqual(internalCommand, testCase.expectedInternalCommand);
        assert.strictEqual(internalSkill, testCase.expectedInternalSkill);
        console.log(`  PASS ${testCase.id}`);
        passed++;
      } catch (error) {
        console.log(`  FAIL ${testCase.id}`);
        console.log(`    ${error.message}`);
        if (reason) {
          console.log(`    Reason: ${reason}`);
        }
        failed++;
      }
    }
  } finally {
    fs.rmSync(workspaceDir, { recursive: true, force: true });
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
