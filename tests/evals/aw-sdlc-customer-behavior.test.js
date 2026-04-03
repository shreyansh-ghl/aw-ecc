const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { CUSTOMER_CASES } = require('./fixtures/aw-sdlc-customer-cases');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 120000);
const SUITE = process.env.AW_SDLC_EVAL_SUITE || 'core';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const MATERIALIZED_PATHS = [
  'AGENTS.md',
  'commands/brainstorm.md',
  'commands/plan.md',
  'commands/execute.md',
  'commands/verify.md',
  'commands/finish.md',
  'commands/deploy.md',
  'commands/code-review.md',
  'commands/tdd.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-finish/SKILL.md',
  'docs/aw-sdlc-e2e-plan.md',
  'docs/aw-sdlc-command-contracts.md',
  'docs/aw-sdlc-acceptance-criteria.md',
  'docs/aw-sdlc-test-plan.md',
];

const CASES = CUSTOMER_CASES.filter(testCase => SUITE === 'full' || testCase.suite === 'core');

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function createWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-customer-eval-'));
  snapshot.materializePaths(workspaceDir, MATERIALIZED_PATHS);

  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    [
      '# AW SDLC Customer Behavior Eval',
      '',
      `This workspace is materialized from ${REF}.`,
      'Use repo-local commands, skills, and docs as the only source of truth.',
    ].join('\n'),
    'utf8'
  );

  return workspaceDir;
}

function buildPrompt(userPrompt) {
  return [
    'You are evaluating the customer-facing behavior of this AW SDLC repo snapshot.',
    'Use only the repo-local command, skill, and doc files as the source of truth.',
    'Decide what should happen for the user, not what an ideal future system might do unless the repo says so.',
    'Choose outputs from this token set only: prd.md, design.md, designs/, spec.md, tasks.md, execution.md, verification.md, release.md, state.json, code-changes, deploy-action, implementation-code.',
    'Choose must-not tokens from the same set.',
    'Return exactly these lines and nothing else:',
    'AW_BEHAVIOR_ROUTE: /aw:plan|/aw:execute|/aw:verify|/aw:deploy|unknown',
    'AW_BEHAVIOR_OUTPUTS: token,token',
    'AW_BEHAVIOR_MUST_NOT: token,token',
    'AW_BEHAVIOR_NEXT: /aw:plan|/aw:execute|/aw:verify|/aw:deploy|depends|none|unknown',
    'AW_BEHAVIOR_REASON: one short sentence',
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

function parseTokenList(value) {
  if (!value) return [];
  return value
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);
}

function run() {
  console.log(`\n=== AW SDLC Customer Behavior Eval (${REF}, suite=${SUITE}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of CASES) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase.prompt));
      const route = parseLine(output, 'AW_BEHAVIOR_ROUTE');
      const outputs = parseTokenList(parseLine(output, 'AW_BEHAVIOR_OUTPUTS'));
      const mustNot = parseTokenList(parseLine(output, 'AW_BEHAVIOR_MUST_NOT'));
      const next = parseLine(output, 'AW_BEHAVIOR_NEXT');
      const reason = parseLine(output, 'AW_BEHAVIOR_REASON');

      try {
        assert.strictEqual(route, testCase.expectedRoute);
        for (const token of testCase.expectedOutputs) {
          assert.ok(outputs.includes(token), `Expected output token ${token}, received [${outputs.join(', ')}]`);
        }
        for (const token of testCase.expectedMustNot) {
          assert.ok(mustNot.includes(token), `Expected must-not token ${token}, received [${mustNot.join(', ')}]`);
        }
        assert.strictEqual(next, testCase.expectedNext);
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
