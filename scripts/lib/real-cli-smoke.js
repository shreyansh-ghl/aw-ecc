const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_TIMEOUT_MS = 120000;
const REQUIRED_STAGES = ['plan', 'execute', 'review', 'verify'];
const APPROVED_SPEC_SUMMARY = [
  'Approved spec summary:',
  '- Build a contact sync worker triggered by new contact events.',
  '- Validate payload shape before processing.',
  '- Persist sync results and retry transient failures.',
  '- Add unit tests for validation and integration tests for worker orchestration.',
].join('\n');

const APPROVED_PLAN_SUMMARY = [
  'Approved plan summary:',
  '1. Add the worker entrypoint and validation helper.',
  '2. Add orchestration and retry handling.',
  '3. Add unit and integration tests.',
  '4. Hand off to /aw:verify after execution.',
].join('\n');
const SMOKE_WORKSPACE_FILES = [
  'AGENTS.md',
  'package.json',
  path.join('commands', 'brainstorm.md'),
  path.join('commands', 'execute.md'),
  path.join('commands', 'verify.md'),
  path.join('commands', 'plan.md'),
  path.join('commands', 'code-review.md'),
  path.join('commands', 'tdd.md'),
  path.join('commands', 'finish.md'),
  path.join('skills', 'using-aw-skills', 'SKILL.md'),
  path.join('skills', 'using-aw-skills', 'hooks', 'session-start.sh'),
];

const STAGE_PROMPTS = {
  plan: [
    'AW_SMOKE_ID: plan-feature',
    'You are running the aw-ecc SDLC smoke test.',
    'A user asks for a new feature: "Add a contact sync worker to the backend."',
    'Choose the correct AW SDLC entrypoint and begin only the planning stage.',
    'For this smoke test, do not write files, do not implement code, and do not run long commands.',
    'After the required markers, give at most two short sentences describing the first planning action.',
    'Do not inspect unrelated files or produce implementation steps outside the planning stage.',
    'If you need repo context, limit yourself to AGENTS.md, commands/, and skills/using-aw-skills/SKILL.md.',
    'Your response must include these exact lines before anything else:',
    'AW_SMOKE_STAGE: plan',
    'AW_SMOKE_COMMAND: /aw:brainstorm',
    'AW_SMOKE_SKILL: platform-core-aw-brainstorm',
  ].join('\n'),
  execute: [
    'AW_SMOKE_ID: execute-feature',
    'You are continuing the aw-ecc SDLC smoke test.',
    'The spec and plan are approved. Move to execution only.',
    APPROVED_SPEC_SUMMARY,
    APPROVED_PLAN_SUMMARY,
    'For this smoke test, do not edit files, do not run tests, and do not implement the worker.',
    'After the required markers, give at most two short sentences describing the first execution action.',
    'Do not inspect unrelated files or run a full repo audit.',
    'If you need repo context, limit yourself to AGENTS.md, commands/, and skills/using-aw-skills/SKILL.md.',
    'Your response must include these exact lines before anything else:',
    'AW_SMOKE_STAGE: execute',
    'AW_SMOKE_COMMAND: /aw:execute',
    'AW_SMOKE_SKILL: platform-core-aw-execute',
  ].join('\n'),
  review: [
    'AW_SMOKE_ID: review-feature',
    'You are continuing the aw-ecc SDLC smoke test.',
    'Implementation is done and the user asks for a code review.',
    'Route this to the AW verification stage rather than a legacy review path.',
    APPROVED_SPEC_SUMMARY,
    APPROVED_PLAN_SUMMARY,
    'Execution completed for the approved plan and the stage now needs verification-oriented review.',
    'For this smoke test, do not print diffs, do not run broad audits, and do not inspect unrelated files.',
    'After the required markers, give at most two short sentences describing the first review action.',
    'Do not inspect unrelated files or print repository diffs in the response.',
    'If you need repo context, limit yourself to AGENTS.md, commands/, and skills/using-aw-skills/SKILL.md.',
    'Your response must include these exact lines before anything else:',
    'AW_SMOKE_STAGE: review',
    'AW_SMOKE_COMMAND: /aw:verify',
    'AW_SMOKE_SKILL: platform-core-aw-verify',
  ].join('\n'),
  verify: [
    'AW_SMOKE_ID: verify-feature',
    'You are continuing the aw-ecc SDLC smoke test.',
    'The user asks to verify the completed work.',
    APPROVED_SPEC_SUMMARY,
    APPROVED_PLAN_SUMMARY,
    'Execution completed for the approved plan and verification should focus on evidence and readiness.',
    'For this smoke test, do not run commands or inspect unrelated files.',
    'After the required markers, give at most two short sentences describing the first verification action.',
    'Do not inspect unrelated files or produce review of the entire repository.',
    'If you need repo context, limit yourself to AGENTS.md, commands/, and skills/using-aw-skills/SKILL.md.',
    'Your response must include these exact lines before anything else:',
    'AW_SMOKE_STAGE: verify',
    'AW_SMOKE_COMMAND: /aw:verify',
    'AW_SMOKE_SKILL: platform-core-aw-verify',
  ].join('\n'),
  aliasPlan: [
    'AW_SMOKE_ID: alias-plan',
    'You are running the aw-ecc command alias smoke test.',
    'The user invokes the legacy command /aw:plan for a new feature request.',
    'Silently route to the new command target.',
    'For this smoke test, do not write files or run commands.',
    'After the required markers, give at most two short sentences describing the first planning action.',
    'If you need repo context, limit yourself to AGENTS.md, commands/, and skills/using-aw-skills/SKILL.md.',
    'Your response must include these exact lines before anything else:',
    'AW_SMOKE_STAGE: plan',
    'AW_SMOKE_COMMAND: /aw:brainstorm',
    'AW_SMOKE_SKILL: platform-core-aw-brainstorm',
    'AW_SMOKE_ALIAS_SOURCE: /aw:plan',
  ].join('\n'),
};

function getCliInvocation(cliName, prompt, workspaceDir) {
  switch (cliName) {
    case 'claude':
      return {
        command: 'claude',
        args: ['-p', prompt, '--output-format', 'text', '--max-turns', '8'],
      };
    case 'codex':
      return {
        command: 'codex',
        args: ['exec', '--skip-git-repo-check', prompt],
      };
    case 'cursor':
      return {
        command: 'cursor',
        args: ['agent', prompt],
      };
    default:
      throw new Error(`Unsupported CLI: ${cliName}`);
  }
}

function detectAuthFailure(output) {
  const normalized = output.toLowerCase();
  return [
    /\bauth(?:entication)? (?:required|failed|error)\b/,
    /\blogin (?:first|required)\b/,
    /\blog(?:ged)? in\b/,
    /\bnot logged in\b/,
    /\bunauthorized\b/,
    /\bforbidden\b/,
    /\binvalid token\b/,
    /\btoken expired\b/,
    /\bapi key (?:required|invalid|missing)\b/,
    /\brate limit\b/,
    /\bhit your limit\b/,
  ].some(pattern => pattern.test(normalized));
}

function detectWorkspaceTrustFailure(output) {
  return /\bworkspace trust required\b/i.test(String(output || ''));
}

function detectTurnLimitFailure(output) {
  return /\breached max turns\b/i.test(String(output || ''));
}

function normalizeCliOutput(output) {
  return String(output || '')
    .replace(/\r/g, '')
    .replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, '')
    .trim();
}

function parseSmokeMarkers(output) {
  const normalized = normalizeCliOutput(output);
  const markers = {};

  for (const line of normalized.split('\n')) {
    const match = line.match(/^(AW_SMOKE_[A-Z_]+):\s*(.+)$/);
    if (!match) continue;
    if (!(match[1] in markers)) {
      markers[match[1]] = match[2].trim();
    }
  }

  return markers;
}

function validateSmokeMarkers(output, expected) {
  const markers = parseSmokeMarkers(output);
  const failures = [];

  for (const [key, value] of Object.entries(expected)) {
    if (markers[key] !== value) {
      failures.push(`Expected ${key}=${value}, received ${markers[key] || '(missing)'}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    markers,
  };
}

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });

  return {
    ok: result.status === 0,
    output: normalizeCliOutput((result.stdout || '') + (result.stderr || '')),
  };
}

function runCliPrompt(cliName, prompt, workspaceDir, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const invocation = getCliInvocation(cliName, prompt, workspaceDir);
  const startedAt = Date.now();
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  const durationMs = Date.now() - startedAt;
  const output = normalizeCliOutput((result.stdout || '') + (result.stderr || ''));

  return {
    cliName,
    prompt,
    durationMs,
    exitCode: typeof result.status === 'number' ? result.status : 1,
    output,
    authFailure: detectAuthFailure(output),
    timedOut: Boolean(result.error && result.error.code === 'ETIMEDOUT'),
  };
}

function createSmokeWorkspace(rootDir = os.tmpdir()) {
  const workspaceDir = fs.mkdtempSync(path.join(rootDir, 'aw-ecc-cli-smoke-'));
  const fixturePath = path.join(workspaceDir, 'AW_SMOKE_FIXTURE.md');

  fs.writeFileSync(
    fixturePath,
    [
      '# AW Smoke Fixture',
      '',
      'This disposable workspace exists only to verify that aw-ecc selects the correct SDLC workflow.',
      'No production code changes should be required.',
    ].join('\n'),
    'utf8'
  );

  return { workspaceDir, fixturePath };
}

function createRepoBackedSmokeWorkspace(sourceRepoRoot, rootDir = os.tmpdir()) {
  const { workspaceDir, fixturePath } = createSmokeWorkspace(rootDir);

  for (const relativePath of SMOKE_WORKSPACE_FILES) {
    const sourcePath = path.join(sourceRepoRoot, relativePath);
    const destinationPath = path.join(workspaceDir, relativePath);

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
  }

  fs.appendFileSync(
    fixturePath,
    '\nOnly the copied AW smoke files should be used for routing decisions in this workspace.\n',
    'utf8'
  );

  return { workspaceDir, fixturePath };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  REQUIRED_STAGES,
  SMOKE_WORKSPACE_FILES,
  STAGE_PROMPTS,
  createSmokeWorkspace,
  createRepoBackedSmokeWorkspace,
  detectAuthFailure,
  detectTurnLimitFailure,
  detectWorkspaceTrustFailure,
  ensureCliAvailable,
  getCliInvocation,
  normalizeCliOutput,
  parseSmokeMarkers,
  runCliPrompt,
  validateSmokeMarkers,
};
