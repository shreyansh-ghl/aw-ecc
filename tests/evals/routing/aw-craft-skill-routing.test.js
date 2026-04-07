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

const CASES = JSON.parse(snapshot.readFile('tests/evals/fixtures/aw-live-craft-skill-cases.json')).cases;

const BASE_CONTEXT_PATHS = [
  'AGENTS.md',
  'skills/using-aw-skills/SKILL.md',
];

const ROUTE_CONTEXT_PATHS = {
  '/aw:plan': ['commands/plan.md', 'skills/aw-plan/SKILL.md'],
  '/aw:build': ['commands/build.md', 'skills/aw-build/SKILL.md'],
  '/aw:test': ['commands/test.md', 'skills/aw-test/SKILL.md'],
  '/aw:review': ['commands/review.md', 'skills/aw-review/SKILL.md'],
  '/aw:deploy': ['commands/deploy.md', 'skills/aw-deploy/SKILL.md'],
};

const SUPPORTING_SKILL_PATHS = {
  'idea-refine': 'skills/idea-refine/SKILL.md',
  'api-and-interface-design': 'skills/api-and-interface-design/SKILL.md',
  'browser-testing-with-devtools': 'skills/browser-testing-with-devtools/SKILL.md',
  'code-simplification': 'skills/code-simplification/SKILL.md',
  'security-and-hardening': 'skills/security-and-hardening/SKILL.md',
  'performance-optimization': 'skills/performance-optimization/SKILL.md',
  'git-workflow-and-versioning': 'skills/git-workflow-and-versioning/SKILL.md',
  'ci-cd-and-automation': 'skills/ci-cd-and-automation/SKILL.md',
  'deprecation-and-migration': 'skills/deprecation-and-migration/SKILL.md',
  'documentation-and-adrs': 'skills/documentation-and-adrs/SKILL.md',
};

const ALLOWED_ROUTES = ['/aw:plan', '/aw:build', '/aw:test', '/aw:review', '/aw:deploy'];
const ALLOWED_PRIMARY_SKILLS = ['aw-plan', 'aw-build', 'aw-test', 'aw-review', 'aw-deploy'];
const ALLOWED_SUPPORTING_SKILLS = [
  'idea-refine',
  'api-and-interface-design',
  'browser-testing-with-devtools',
  'code-simplification',
  'security-and-hardening',
  'performance-optimization',
  'git-workflow-and-versioning',
  'ci-cd-and-automation',
  'deprecation-and-migration',
  'documentation-and-adrs'
];

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function createWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-craft-skill-routing-'));
  fs.writeFileSync(
    path.join(workspaceDir, 'README.md'),
    `Craft-skill live routing eval workspace for ${REF}\n`,
    'utf8'
  );
  return workspaceDir;
}

function buildInlineContext(testCase) {
  const selectedPaths = [
    ...BASE_CONTEXT_PATHS,
    ...(ROUTE_CONTEXT_PATHS[testCase.expectedPublicRoute] || []),
  ];

  const supportingPath = SUPPORTING_SKILL_PATHS[testCase.expectedSupportingSkill];
  if (supportingPath) {
    selectedPaths.push(supportingPath);
  }

  const uniquePaths = [...new Set(selectedPaths)];

  return uniquePaths
    .map(filePath => {
      const content = snapshot.readFile(filePath);
      return [`--- BEGIN ${filePath} ---`, content, `--- END ${filePath} ---`].join('\n');
    })
    .join('\n\n');
}

function buildPrompt(testCase) {
  return [
    'You are evaluating live auto-intent routing for the AW SDLC craft-skill layer in this repo snapshot.',
    'Use only the provided repo excerpts as the source of truth.',
    'Pick the smallest correct public AW route, the primary AW stage skill, and the first supporting craft skill to load.',
    `Allowed public routes: ${ALLOWED_ROUTES.join(', ')}.`,
    `Allowed primary AW stage skills: ${ALLOWED_PRIMARY_SKILLS.join(', ')}.`,
    `Allowed supporting craft skills: ${ALLOWED_SUPPORTING_SKILLS.join(', ')}.`,
    'Do not use tools. Answer directly from the provided repo excerpts.',
    'Return exactly one line and nothing else.',
    'Use five fields separated by || in this exact order: literal RESULT, selected public route, selected primary AW stage skill, selected first supporting craft skill, short reason.',
    '',
    'Repo excerpts:',
    buildInlineContext(testCase),
    '',
    `User request: ${testCase.prompt}`,
  ].join('\n');
}

function runPrompt(workspaceDir, prompt) {
  const outputFile = path.join(workspaceDir, '.aw-craft-skill-routing-last-message.txt');
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
      supportingSkill: undefined,
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
    supportingSkill: parts[3],
    reason: parts[4],
  };
}

function run() {
  console.log(`\n=== AW Craft Skill Routing (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  const targetCaseId = process.env.AW_SDLC_CRAFT_SKILL_CASE;
  const selectedCases = targetCaseId
    ? CASES.filter(testCase => testCase.id === targetCaseId)
    : CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown craft-skill case id: ${targetCaseId}`);
    process.exit(1);
  }

  const workspaceDir = createWorkspace();
  let passed = 0;
  let failed = 0;

  try {
    for (const testCase of selectedCases) {
      const output = runPrompt(workspaceDir, buildPrompt(testCase));
      const { publicRoute, primarySkill, supportingSkill, reason } = parseOutput(output);

      try {
        assert.strictEqual(publicRoute, testCase.expectedPublicRoute);
        assert.strictEqual(primarySkill, testCase.expectedPrimarySkill);
        assert.strictEqual(supportingSkill, testCase.expectedSupportingSkill);
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
