const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
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
  'commands/ship.md',
  'commands/code-review.md',
  'commands/tdd.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'skills/aw-finish/SKILL.md',
];

const CASES = [
  {
    id: 'explicit-plan',
    prompt: '/aw:plan Create the feature plan for a contact sync worker.',
    expectedMode: 'plan',
    expectedCommand: '/aw:plan',
  },
  {
    id: 'explicit-ship',
    prompt: '/aw:ship Take this contact sync idea from planning to staging.',
    expectedMode: 'ship',
    expectedCommand: '/aw:ship',
  },
  {
    id: 'intent-plan-prd',
    prompt: 'Create a PRD for a contact sync worker feature.',
    expectedMode: 'plan',
    expectedCommand: '/aw:plan',
  },
  {
    id: 'intent-ship',
    prompt: 'Take this from idea to ship.',
    expectedMode: 'ship',
    expectedCommand: '/aw:ship',
  },
  {
    id: 'intent-execute',
    prompt: 'Implement the approved contact sync worker spec.',
    expectedMode: 'execute',
    expectedCommand: '/aw:execute',
  },
  {
    id: 'intent-verify',
    prompt: 'Review and validate the completed contact sync worker implementation.',
    expectedMode: 'verify',
    expectedCommand: '/aw:verify',
  },
  {
    id: 'intent-deploy',
    prompt: 'Deploy the verified contact sync worker to staging.',
    expectedMode: 'deploy',
    expectedCommand: '/aw:deploy',
  },
  {
    id: 'communities-backend-plan-intent',
    prompt: 'Create the implementation spec for the approved Communities moderation API contract. Do not make me write a PRD first.',
    expectedMode: 'plan',
    expectedCommand: '/aw:plan',
  },
  {
    id: 'communities-backend-verify-intent',
    prompt: 'Review this Communities moderation API PR and tell me if it is ready for staging.',
    expectedMode: 'verify',
    expectedCommand: '/aw:verify',
  },
  {
    id: 'communities-backend-ship-intent',
    prompt: 'Take this Communities moderation API change through PR creation and staging version deployment.',
    expectedMode: 'ship',
    expectedCommand: '/aw:ship',
  },
  {
    id: 'communities-frontend-plan-intent',
    prompt: 'Create the implementation spec for the approved Communities feed MFA change.',
    expectedMode: 'plan',
    expectedCommand: '/aw:plan',
  },
  {
    id: 'communities-frontend-verify-intent',
    prompt: 'Review this Communities feed MFA PR and tell me if it is ready for staging.',
    expectedMode: 'verify',
    expectedCommand: '/aw:verify',
  },
  {
    id: 'communities-frontend-deploy-intent',
    prompt: 'Deploy this verified Communities feed MFA to staging.',
    expectedMode: 'deploy',
    expectedCommand: '/aw:deploy',
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
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-routing-eval-'));
  snapshot.materializePaths(workspaceDir, MATERIALIZED_PATHS);

  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    [
      '# AW SDLC Routing Eval Workspace',
      '',
      `This workspace is materialized from ${REF}.`,
      'Use only local files under commands/ and skills/ as the routing source of truth.',
    ].join('\n'),
    'utf8'
  );

  return workspaceDir;
}

function buildPrompt(userPrompt) {
  return [
    'You are evaluating the AW SDLC routing behavior for this repo snapshot.',
    'Use only the repo-local command and skill files as the source of truth.',
    'Before deciding, inspect commands/ and skills/using-aw-skills/SKILL.md as needed.',
    'This eval measures the selected public AW route only.',
    'Explicit public AW command prefixes always win over inferred intent.',
    'If the request starts with /aw:plan, /aw:execute, /aw:verify, /aw:deploy, or /aw:ship, return that same public route unless the command is malformed.',
    'AW_EVAL_MODE must be one of: plan, execute, verify, deploy, ship.',
    'If /aw:ship is selected, AW_EVAL_MODE must be ship.',
    'Do not return internal /aw:ship submodes such as build-ready, implement, release, or full.',
    'Return exactly these three lines and nothing else.',
    'Replace the placeholder choices with one actual selected value. Do not repeat the option list.',
    'AW_EVAL_MODE: <plan|execute|verify|deploy|ship|unknown>',
    'AW_EVAL_COMMAND: </aw:plan|/aw:execute|/aw:verify|/aw:deploy|/aw:ship|unknown>',
    'AW_EVAL_REASON: short reason here',
    '',
    `User request: ${userPrompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const outputFile = path.join(workspaceDir, '.aw-routing-last-message.txt');
  const result = spawnSync(CLI, ['exec', '--skip-git-repo-check', '--output-last-message', outputFile, prompt], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (fs.existsSync(outputFile)) {
    return fs.readFileSync(outputFile, 'utf8').trim();
  }

  return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
}

function parseOutput(output) {
  const mode = output.match(/^AW_EVAL_MODE:\s*(.+)$/m)?.[1]?.trim();
  const command = output.match(/^AW_EVAL_COMMAND:\s*(.+)$/m)?.[1]?.trim();
  const reason = output.match(/^AW_EVAL_REASON:\s*(.+)$/m)?.[1]?.trim();
  return { mode, command, reason, output };
}

function run() {
  console.log(`\n=== AW SDLC Codex Routing Eval (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;
  const targetCaseId = process.env.AW_SDLC_ROUTING_CASE;
  const selectedCases = targetCaseId
    ? CASES.filter(testCase => testCase.id === targetCaseId)
    : CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown routing case id: ${targetCaseId}`);
    process.exit(1);
  }

  try {
    for (const testCase of selectedCases) {
      const parsed = parseOutput(runPrompt(workspaceDir, buildPrompt(testCase.prompt)));

      try {
        assert.strictEqual(
          parsed.mode,
          testCase.expectedMode,
          `Expected mode ${testCase.expectedMode}, received ${parsed.mode || '(missing)'}`
        );
        assert.strictEqual(
          parsed.command,
          testCase.expectedCommand,
          `Expected command ${testCase.expectedCommand}, received ${parsed.command || '(missing)'}`
        );
        console.log(`  PASS ${testCase.id}`);
        passed++;
      } catch (error) {
        console.log(`  FAIL ${testCase.id}`);
        console.log(`    ${error.message}`);
        if (parsed.reason) {
          console.log(`    Reason: ${parsed.reason}`);
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
