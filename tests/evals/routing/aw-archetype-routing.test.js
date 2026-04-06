const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');
const {
  ROUTE_TO_SKILL,
  readJson,
  readPathFromSnapshotOrDisk,
  skillPathFor,
} = require('../lib/aw-scenario-helpers');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 120000);
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const CASES = readJson(snapshot, 'tests/evals/fixtures/aw-archetype-scenarios.json').cases;

const BASE_CONTEXT_PATHS = [
  'AGENTS.md',
  'skills/using-aw-skills/SKILL.md',
  'docs/aw-testing-strategy.md',
  'docs/aw-archetype-scenario-matrix.md',
];

const ROUTE_CONTEXT_PATHS = {
  '/aw:plan': ['commands/plan.md', 'skills/aw-plan/SKILL.md'],
  '/aw:build': ['commands/build.md', 'skills/aw-build/SKILL.md'],
  '/aw:investigate': ['commands/investigate.md', 'skills/aw-investigate/SKILL.md'],
  '/aw:test': ['commands/test.md', 'skills/aw-test/SKILL.md'],
  '/aw:review': ['commands/review.md', 'skills/aw-review/SKILL.md'],
  '/aw:deploy': ['commands/deploy.md', 'skills/aw-deploy/SKILL.md'],
  '/aw:ship': ['commands/ship.md', 'skills/aw-ship/SKILL.md'],
  'aw-yolo': [
    'commands/build.md',
    'commands/test.md',
    'commands/review.md',
    'commands/deploy.md',
    'commands/ship.md',
    'skills/aw-yolo/SKILL.md',
  ],
};

const ALLOWED_ROUTES = Object.keys(ROUTE_TO_SKILL);
const ALLOWED_PRIMARY_SKILLS = [...new Set(Object.values(ROUTE_TO_SKILL))];
const ALLOWED_SUPPORTING_SKILLS = [...new Set(CASES.flatMap(testCase => testCase.expectedSupportingSkills))];

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function createWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-archetype-routing-'));
  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    `Archetype routing eval workspace for ${REF}\n`,
    'utf8'
  );
  return workspaceDir;
}

function buildInlineContext(testCase) {
  const selectedPaths = [
    ...BASE_CONTEXT_PATHS,
    ...(ROUTE_CONTEXT_PATHS[testCase.expectedPublicRoute] || []),
  ];

  for (const skill of testCase.expectedSupportingSkills.slice(0, 2)) {
    try {
      selectedPaths.push(skillPathFor(skill));
    } catch (_error) {
      // The allowed skill list is broader than the local inline context requirement.
    }
  }

  const uniquePaths = [...new Set(selectedPaths)];

  return uniquePaths
    .map(filePath => {
      const label = path.isAbsolute(filePath) ? path.relative(REPO_ROOT, filePath) || filePath : filePath;
      const content = path.isAbsolute(filePath)
        ? readPathFromSnapshotOrDisk(snapshot, filePath)
        : snapshot.readFile(filePath);
      return [`--- BEGIN ${label} ---`, content, `--- END ${label} ---`].join('\n');
    })
    .join('\n\n');
}

function buildPrompt(testCase) {
  return [
    'You are evaluating live auto-intent routing for the AW SDLC archetype layer in this repo snapshot.',
    'Use only the provided repo excerpts as the source of truth.',
    'Pick the smallest correct public AW route, the primary AW stage skill, and up to 3 supporting skills in priority order.',
    `Allowed public routes: ${ALLOWED_ROUTES.join(', ')}.`,
    `Allowed primary AW stage skills: ${ALLOWED_PRIMARY_SKILLS.join(', ')}.`,
    `Allowed supporting skills: ${ALLOWED_SUPPORTING_SKILLS.join(', ')}.`,
    'Do not use tools. Answer directly from the provided repo excerpts.',
    'Return exactly one line and nothing else.',
    'Use five fields separated by || in this exact order: literal RESULT, selected public route, selected primary AW stage skill, comma-separated supporting skills, short reason.',
    '',
    `Repo archetype: ${testCase.repoArchetype}`,
    `Product area: ${testCase.productArea}`,
    `Starting state: ${testCase.startingState}`,
    '',
    'Repo excerpts:',
    buildInlineContext(testCase),
    '',
    `User request: ${testCase.userPrompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const outputFile = path.join(workspaceDir, '.aw-archetype-routing-last-message.txt');
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
    return {
      publicRoute: undefined,
      primarySkill: undefined,
      supportingSkills: [],
      reason: undefined,
    };
  }

  const parts = resultLine
    .split('||')
    .map(part => part.trim())
    .filter(Boolean);

  return {
    publicRoute: parts[1],
    primarySkill: parts[2],
    supportingSkills: String(parts[3] || '')
      .split(',')
      .map(skill => skill.trim())
      .filter(Boolean),
    reason: parts[4],
  };
}

function run() {
  console.log(`\n=== AW Archetype Routing (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const targetCaseId = process.env.AW_SDLC_ARCHETYPE_CASE;
  const selectedCases = targetCaseId
    ? CASES.filter(testCase => testCase.id === targetCaseId)
    : CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown archetype case id: ${targetCaseId}`);
    process.exit(1);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of selectedCases) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase));
      const { publicRoute, primarySkill, supportingSkills, reason } = parseOutput(output);

      try {
        assert.strictEqual(publicRoute, testCase.expectedPublicRoute);
        assert.strictEqual(primarySkill, testCase.expectedPrimarySkill);
        assert.ok(
          supportingSkills.includes(testCase.expectedSupportingSkills[0]),
          `expected supporting skill ${testCase.expectedSupportingSkills[0]} in ${supportingSkills.join(', ')}`
        );
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
