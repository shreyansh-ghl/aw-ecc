#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  STAGE_PROMPTS,
  createRepoBackedSmokeWorkspace,
  detectTurnLimitFailure,
  detectWorkspaceTrustFailure,
  ensureCliAvailable,
  runCliPrompt,
  validateSmokeMarkers,
} = require('../lib/real-cli-smoke');

const REPO_ROOT = path.join(__dirname, '../..');
const SESSION_START_SCRIPT = path.join(REPO_ROOT, 'skills', 'using-aw-skills', 'hooks', 'session-start.sh');

function parseArgs(argv) {
  const parsed = {
    clis: ['claude', 'codex', 'cursor'],
    workspace: REPO_ROOT,
    artifactsDir: path.join(REPO_ROOT, 'artifacts', 'real-cli-smoke'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cli') {
      parsed.clis = (argv[index + 1] || '').split(',').filter(Boolean);
      index += 1;
    } else if (arg === '--workspace') {
      parsed.workspace = path.resolve(argv[index + 1] || parsed.workspace);
      index += 1;
    } else if (arg === '--artifacts-dir') {
      parsed.artifactsDir = path.resolve(argv[index + 1] || parsed.artifactsDir);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp(exitCode = 0) {
  console.log(`
Usage: node scripts/ci/real-cli-smoke.js [--cli claude,codex,cursor] [--workspace <path>] [--artifacts-dir <path>]

Runs the aw-ecc P0 real-CLI smoke suite against Claude, Codex, and Cursor.
`);
  process.exit(exitCode);
}

function writeArtifact(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function captureSessionStartArtifact(artifactsDir) {
  const result = spawnSync('bash', [SESSION_START_SCRIPT], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30000,
  });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  writeArtifact(path.join(artifactsDir, 'session-start.json'), output);

  if (result.status !== 0) {
    throw new Error(`session-start hook failed with status ${result.status}`);
  }

  for (const expected of ['platform-core-aw-brainstorm', 'platform-core-aw-execute', 'platform-core-aw-verify']) {
    if (!output.includes(expected)) {
      throw new Error(`session-start hook output did not include ${expected}`);
    }
  }
}

function resolveWorkspace(options) {
  if (options.workspace !== REPO_ROOT) {
    return options.workspace;
  }

  const smokeWorkspace = createRepoBackedSmokeWorkspace(REPO_ROOT);
  return smokeWorkspace.workspaceDir;
}

function runHealthCheck(cliName, workspace, artifactsDir) {
  const availability = ensureCliAvailable(cliName);
  writeArtifact(path.join(artifactsDir, cliName, '00-version.txt'), availability.output || '(no output)');
  if (!availability.ok) {
    throw new Error(`${cliName} is not available on PATH`);
  }

  const prompt = [
    'AW_SMOKE_ID: health-check',
    'You are running the aw-ecc CLI smoke test health check.',
    'Reply with exactly:',
    'AW_SMOKE_HEALTH: ok',
  ].join('\n');

  const result = runCliPrompt(cliName, prompt, workspace);
  writeArtifact(path.join(artifactsDir, cliName, '01-health.txt'), result.output);

  const healthConfirmed = result.output.includes('AW_SMOKE_HEALTH: ok');
  if (result.exitCode !== 0) {
    throw new Error(`${cliName} health check exited ${result.exitCode}`);
  }
  if (detectWorkspaceTrustFailure(result.output)) {
    throw new Error(`${cliName} health check requires trusted workspace access`);
  }
  if (result.authFailure && !healthConfirmed) {
    throw new Error(`${cliName} health check appears unauthenticated`);
  }
  if (!healthConfirmed) {
    throw new Error(`${cliName} health check did not confirm readiness`);
  }
}

function runStage(cliName, stageName, prompt, expectedMarkers, workspace, artifactsDir) {
  const result = runCliPrompt(cliName, prompt, workspace);
  writeArtifact(path.join(artifactsDir, cliName, `${stageName}.txt`), result.output);
  const validation = validateSmokeMarkers(result.output, expectedMarkers);

  if (result.exitCode !== 0) {
    throw new Error(`${cliName} ${stageName} exited ${result.exitCode}`);
  }
  if (detectWorkspaceTrustFailure(result.output)) {
    throw new Error(`${cliName} ${stageName} requires trusted workspace access`);
  }
  if (detectTurnLimitFailure(result.output)) {
    throw new Error(`${cliName} ${stageName} exhausted its turn budget before emitting smoke markers`);
  }
  if (result.authFailure && !validation.ok) {
    throw new Error(`${cliName} ${stageName} appears unauthenticated`);
  }
  if (!validation.ok) {
    throw new Error(`${cliName} ${stageName} failed marker validation: ${validation.failures.join('; ')}`);
  }

  return result;
}

function main() {
  const options = parseArgs(process.argv);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactsDir = path.join(options.artifactsDir, timestamp);
  fs.mkdirSync(artifactsDir, { recursive: true });
  const workspace = resolveWorkspace(options);
  writeArtifact(path.join(artifactsDir, 'workspace.txt'), workspace);

  captureSessionStartArtifact(artifactsDir);

  const stages = [
    {
      name: '02-plan',
      prompt: STAGE_PROMPTS.plan,
      expected: {
        AW_SMOKE_STAGE: 'plan',
        AW_SMOKE_COMMAND: '/aw:brainstorm',
        AW_SMOKE_SKILL: 'platform-core-aw-brainstorm',
      },
    },
    {
      name: '03-execute',
      prompt: STAGE_PROMPTS.execute,
      expected: {
        AW_SMOKE_STAGE: 'execute',
        AW_SMOKE_COMMAND: '/aw:execute',
        AW_SMOKE_SKILL: 'platform-core-aw-execute',
      },
    },
    {
      name: '04-review',
      prompt: STAGE_PROMPTS.review,
      expected: {
        AW_SMOKE_STAGE: 'review',
        AW_SMOKE_COMMAND: '/aw:verify',
        AW_SMOKE_SKILL: 'platform-core-aw-verify',
      },
    },
    {
      name: '05-verify',
      prompt: STAGE_PROMPTS.verify,
      expected: {
        AW_SMOKE_STAGE: 'verify',
        AW_SMOKE_COMMAND: '/aw:verify',
        AW_SMOKE_SKILL: 'platform-core-aw-verify',
      },
    },
    {
      name: '06-alias-plan',
      prompt: STAGE_PROMPTS.aliasPlan,
      expected: {
        AW_SMOKE_STAGE: 'plan',
        AW_SMOKE_COMMAND: '/aw:brainstorm',
        AW_SMOKE_SKILL: 'platform-core-aw-brainstorm',
        AW_SMOKE_ALIAS_SOURCE: '/aw:plan',
      },
    },
  ];

  for (const cliName of options.clis) {
    runHealthCheck(cliName, workspace, artifactsDir);
    for (const stage of stages) {
      runStage(cliName, stage.name, stage.prompt, stage.expected, workspace, artifactsDir);
    }
  }

  console.log(`real-cli-smoke: PASS (${options.clis.join(', ')})`);
  console.log(`artifacts: ${artifactsDir}`);
}

main();
