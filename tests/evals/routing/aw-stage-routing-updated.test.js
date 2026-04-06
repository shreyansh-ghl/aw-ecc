const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 120000);
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const INLINE_CONTEXT_PATHS = [
  'AGENTS.md',
  'commands/build.md',
  'commands/investigate.md',
  'commands/test.md',
  'commands/review.md',
  'commands/deploy.md',
  'commands/ship.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-build/SKILL.md',
  'skills/aw-investigate/SKILL.md',
  'skills/aw-test/SKILL.md',
  'skills/aw-review/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'skills/aw-yolo/SKILL.md',
];

const CASES = [
  {
    id: 'build-route',
    prompt: 'Implement the approved contact sync worker spec.',
    expectedRoute: '/aw:build',
    expectedSkill: 'aw-build',
  },
  {
    id: 'investigate-route',
    prompt: 'Investigate this contact sync worker retry failure before changing code.',
    expectedRoute: '/aw:investigate',
    expectedSkill: 'aw-investigate',
  },
  {
    id: 'test-route',
    prompt: 'Test the repaired contact sync worker bugfix and prove the regression guard.',
    expectedRoute: '/aw:test',
    expectedSkill: 'aw-test',
  },
  {
    id: 'review-route',
    prompt: 'Review this contact sync worker PR and tell me if it is ready for staging.',
    expectedRoute: '/aw:review',
    expectedSkill: 'aw-review',
  },
  {
    id: 'deploy-route',
    prompt: 'Deploy the verified contact sync worker to staging.',
    expectedRoute: '/aw:deploy',
    expectedSkill: 'aw-deploy',
  },
  {
    id: 'ship-route',
    prompt: 'Confirm launch readiness, rollback posture, and release closeout for the verified contact sync release.',
    expectedRoute: '/aw:ship',
    expectedSkill: 'aw-ship',
  },
  {
    id: 'yolo-route',
    prompt: 'Handle the whole contact sync flow in one run, from approved plan through release closeout.',
    expectedRoute: 'internal-only',
    expectedSkill: 'aw-yolo',
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
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-stage-routing-updated-'));
  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    `Updated AW stage-routing eval workspace for ${REF}\n`,
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
    'You are evaluating the updated AW SDLC routing behavior for this repo snapshot.',
    'Use only the provided repo excerpts as the source of truth.',
    'For stage-specific requests, return the canonical public route and the matching primary internal skill.',
    'For explicit one-run end-to-end requests, return internal-only as the public route and aw-yolo as the internal skill.',
    'Do not return execute, verify, code-review, tdd, or yolo as public routes.',
    'Allowed public routes: /aw:build, /aw:investigate, /aw:test, /aw:review, /aw:deploy, /aw:ship, internal-only.',
    'Allowed internal skills: aw-build, aw-investigate, aw-test, aw-review, aw-deploy, aw-ship, aw-yolo.',
    'Do not use tools. Answer directly from the provided repo excerpts.',
    'Return exactly one line and nothing else.',
    'Use four fields separated by || in this exact order: literal RESULT, selected public route, selected internal skill, short reason.',
    '',
    'Repo excerpts:',
    buildInlineContext(),
    '',
    `User request: ${userPrompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const outputFile = path.join(workspaceDir, '.aw-stage-routing-updated-last-message.txt');
  const result = spawnSync(CLI, ['exec', '--skip-git-repo-check', '--output-last-message', outputFile, prompt], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (fs.existsSync(outputFile)) {
    const output = fs.readFileSync(outputFile, 'utf8').trim();
    if (output) {
      return output;
    }
  }

  const combined = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  const assistantTailIndex = combined.lastIndexOf('\ncodex\n');
  if (assistantTailIndex !== -1) {
    return combined.slice(assistantTailIndex + '\ncodex\n'.length).trim();
  }

  return combined;
}

function parseOutput(output) {
  const resultLine = output
    .split('\n')
    .map(line => line.trim())
    .find(line => line.startsWith('RESULT||') || line.startsWith('RESULT ||'));

  if (!resultLine) {
    return { publicRoute: undefined, internalSkill: undefined, reason: undefined };
  }

  const parts = resultLine
    .split('||')
    .map(part => part.trim())
    .filter(Boolean);

  return {
    publicRoute: parts[1],
    internalSkill: parts[2],
    reason: parts[3],
  };
}

function run() {
  console.log(`\n=== AW Stage Routing Updated (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const targetCaseId = process.env.AW_SDLC_UPDATED_ROUTING_CASE;
  const selectedCases = targetCaseId
    ? CASES.filter(testCase => testCase.id === targetCaseId)
    : CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown updated routing case id: ${targetCaseId}`);
    process.exit(1);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of selectedCases) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase.prompt));
      const { publicRoute, internalSkill, reason } = parseOutput(output);

      try {
        assert.strictEqual(publicRoute, testCase.expectedRoute);
        assert.strictEqual(internalSkill, testCase.expectedSkill);
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
