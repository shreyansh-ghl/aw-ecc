const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { CUSTOMER_CASES } = require('../fixtures/aw-sdlc-customer-cases');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 120000);
const SUITE = process.env.AW_SDLC_EVAL_SUITE || 'core';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const INLINE_CONTEXT_PATHS = [
  'AGENTS.md',
  'commands/plan.md',
  'commands/build.md',
  'commands/investigate.md',
  'commands/test.md',
  'commands/review.md',
  'commands/deploy.md',
  'commands/ship.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-build/SKILL.md',
  'skills/aw-investigate/SKILL.md',
  'skills/aw-test/SKILL.md',
  'skills/aw-review/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
];

const CASES = CUSTOMER_CASES.filter(testCase => SUITE === 'full' || testCase.suite === 'core');
const ROUTE_TOKENS = ['/aw:plan', '/aw:build', '/aw:investigate', '/aw:test', '/aw:review', '/aw:deploy', '/aw:ship', 'unknown'];
const NEXT_TOKENS = ['/aw:plan', '/aw:build', '/aw:investigate', '/aw:test', '/aw:review', '/aw:deploy', '/aw:ship', 'depends', 'none', 'unknown'];
const OUTPUT_TOKENS = [
  'prd.md',
  'design.md',
  'designs/',
  'spec.md',
  'tasks.md',
  'investigation.md',
  'execution.md',
  'verification.md',
  'release.md',
  'state.json',
  'code-changes',
  'deploy-action',
  'implementation-code',
];

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function createWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-customer-eval-'));
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

function buildInlineContext() {
  return INLINE_CONTEXT_PATHS
    .map(filePath => {
      const content = snapshot.readFile(filePath);
      return [`--- BEGIN ${filePath} ---`, content, `--- END ${filePath} ---`].join('\n');
    })
    .join('\n\n');
}

function buildPrompt(userPrompt) {
  return [
    'You are evaluating the customer-facing behavior of this AW SDLC repo snapshot.',
    'Use only the provided repo excerpts as the source of truth.',
    'Decide what should happen for the user, not what an ideal future system might do unless the repo says so.',
    'Do not use tools. Answer directly from the provided repo excerpts.',
    `Choose outputs and must_not values only from this token set: ${OUTPUT_TOKENS.join(', ')}.`,
    `AW_BEHAVIOR_ROUTE must be one of: ${ROUTE_TOKENS.join(', ')}.`,
    `AW_BEHAVIOR_NEXT must be one of: ${NEXT_TOKENS.join(', ')}.`,
    'AW_BEHAVIOR_OUTPUTS must include every expected artifact token for the selected route.',
    'AW_BEHAVIOR_MUST_NOT must include every clearly forbidden token for the request.',
    'If the request is not a release action, include deploy-action in AW_BEHAVIOR_MUST_NOT.',
    'When the request is stage-specific, do not broaden it to another route.',
    'If the request is planning only, include implementation-code, code-changes, and deploy-action in AW_BEHAVIOR_MUST_NOT.',
    'Return exactly these lines and nothing else.',
    'Every field must be populated with concrete values.',
    'AW_BEHAVIOR_ROUTE:',
    'AW_BEHAVIOR_OUTPUTS:',
    'AW_BEHAVIOR_MUST_NOT:',
    'AW_BEHAVIOR_NEXT:',
    'AW_BEHAVIOR_REASON:',
    '',
    'Repo excerpts:',
    buildInlineContext(),
    '',
    `User request: ${userPrompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const outputFile = path.join(workspaceDir, '.aw-customer-behavior-last-message.txt');
  const result = spawnSync(CLI, ['exec', '--skip-git-repo-check', '--output-last-message', outputFile, prompt], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (fs.existsSync(outputFile)) {
    return fs.readFileSync(outputFile, 'utf8').trim();
  }

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const assistantTailIndex = combined.lastIndexOf('\ncodex\n');
  if (assistantTailIndex !== -1) {
    return combined.slice(assistantTailIndex + '\ncodex\n'.length).trim();
  }

  return combined;
}

function parseOutput(output) {
  try {
    return JSON.parse(output);
  } catch {
    return {
      route: output.match(/^AW_BEHAVIOR_ROUTE:\s*(.+)$/m)?.[1]?.trim(),
      outputs: (output.match(/^AW_BEHAVIOR_OUTPUTS:\s*(.+)$/m)?.[1] || '')
        .split(',')
        .map(token => token.trim())
        .filter(Boolean),
      must_not: (output.match(/^AW_BEHAVIOR_MUST_NOT:\s*(.+)$/m)?.[1] || '')
        .split(',')
        .map(token => token.trim())
        .filter(Boolean),
      next: output.match(/^AW_BEHAVIOR_NEXT:\s*(.+)$/m)?.[1]?.trim(),
      reason: output.match(/^AW_BEHAVIOR_REASON:\s*(.+)$/m)?.[1]?.trim(),
    };
  }
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
  const targetCaseId = process.env.AW_SDLC_CUSTOMER_CASE;
  const selectedCases = targetCaseId
    ? CASES.filter(testCase => testCase.id === targetCaseId)
    : CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown customer case id: ${targetCaseId}`);
    process.exit(1);
  }

  try {
    for (const testCase of selectedCases) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase.prompt));
      const parsed = parseOutput(output);
      const route = parsed.route;
      const outputs = parsed.outputs || [];
      const mustNot = parsed.must_not || [];
      const next = parsed.next;
      const reason = parsed.reason;

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
        console.log('    Raw Output:');
        for (const line of output.split('\n')) {
          console.log(`      ${line}`);
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
