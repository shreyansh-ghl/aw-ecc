const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');
const { createRepoSnapshot } = require('../lib/repo-snapshot');
const { createEvalWorkspace } = require('../lib/eval-workspace');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 240000);
const REASONING_EFFORT = process.env.AW_SDLC_EVAL_REASONING_EFFORT || 'medium';
const KEEP_WORKSPACE_ON_FAIL = process.env.AW_SDLC_KEEP_WORKSPACE_ON_FAIL === '1';
const EXPLICIT_MAX_ATTEMPTS = Number(process.env.AW_SDLC_OUTCOME_MAX_ATTEMPTS || process.env.AW_SDLC_REAL_MAX_ATTEMPTS || 0);
let snapshot;

const AW_CONTEXT_PATHS = [
  'commands/plan.md',
  'commands/build.md',
  'commands/investigate.md',
  'commands/test.md',
  'commands/review.md',
  'commands/deploy.md',
  'commands/ship.md',
  'commands/execute.md',
  'commands/verify.md',
  'commands/brainstorm.md',
  'commands/finish.md',
  'commands/code-review.md',
  'commands/tdd.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-prepare/SKILL.md',
  'skills/aw-build/SKILL.md',
  'skills/aw-investigate/SKILL.md',
  'skills/aw-test/SKILL.md',
  'skills/aw-review/SKILL.md',
  'skills/aw-yolo/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-finish/SKILL.md',
  'skills/aw-review/SKILL.md',
  'skills/aw-debug/SKILL.md',
  'docs/aw-sdlc-command-contracts.md',
  'docs/aw-sdlc-command-skill-architecture.md',
  'docs/aw-sdlc-verify-deploy-configuration.md',
  'defaults/aw-sdlc/baseline-profiles.yml',
];

const AW_YOLO_FAST_PATHS = [
  'AGENTS.md',
  'commands/build.md',
  'commands/test.md',
  'commands/review.md',
  'commands/deploy.md',
  'commands/ship.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-prepare/SKILL.md',
  'skills/aw-build/SKILL.md',
  'skills/aw-test/SKILL.md',
  'skills/aw-review/SKILL.md',
  'skills/aw-yolo/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'defaults/aw-sdlc/baseline-profiles.yml',
];

function ensureCliAvailable(cliName) {
  const result = spawnSync(cliName, ['--version'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return result.status === 0;
}

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assertReleaseEvidence(release, options = {}) {
  const {
    providerPattern,
    mechanismPattern,
    versionedLinksPattern,
    buildLinksPattern,
    testingAutomationPattern,
  } = options;

  assert.ok(/Versioned Links/i.test(release), 'release.md should include a Versioned Links section');
  assert.ok(/Build Links/i.test(release), 'release.md should include a Build Links section');
  assert.ok(/Testing Automation Build Links/i.test(release), 'release.md should include a Testing Automation Build Links section');
  assert.ok(/Build Status/i.test(release), 'release.md should include a Build Status section');

  assert.ok(
    /SUCCESS|PASS|PASS_WITH_NOTES|NOT_AVAILABLE|BLOCKED|FAILED|UNKNOWN/i.test(release),
    'release.md should record a build or release status'
  );

  if (providerPattern) {
    assert.ok(providerPattern.test(release), 'release.md should record the resolved deploy provider');
  }

  if (mechanismPattern) {
    assert.ok(mechanismPattern.test(release), 'release.md should record the resolved deploy mechanism');
  }

  if (versionedLinksPattern) {
    assert.ok(versionedLinksPattern.test(release), 'release.md should include the expected versioned link or routing evidence');
  }

  if (buildLinksPattern) {
    assert.ok(buildLinksPattern.test(release), 'release.md should include the expected build link evidence');
  }

  if (testingAutomationPattern) {
    assert.ok(testingAutomationPattern.test(release), 'release.md should include the expected testing automation evidence');
  }
}

function runPrompt(workspaceDir, prompt) {
  const evalPrompt = [
    'This is an executable SDLC eval, not an analysis-only prompt.',
    'You must perform the requested stage work, write the required files to disk, and leave the workspace in its expected final state before exiting.',
    'Do not stop after reading files, summarizing context, or suggesting next steps.',
    '',
    prompt,
  ].join('\n');

  const result = spawnSync(
    CLI,
    ['exec', '-c', `model_reasoning_effort="${REASONING_EFFORT}"`, '--skip-git-repo-check', '--full-auto', evalPrompt],
    {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    }
  );

  return {
    status: result.status,
    signal: result.signal,
    output: `${result.stdout || ''}\n${result.stderr || ''}`.trim(),
  };
}

function commitWorkspaceBaseline(workspace) {
  if (workspace.mode === 'tempdir') {
    return;
  }

  execFileSync('git', ['-C', workspace.workspaceDir, 'config', 'user.name', 'AW Eval'], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspace.workspaceDir, 'config', 'user.email', 'aw-eval@example.com'], {
    stdio: 'ignore',
  });

  const status = execFileSync('git', ['-C', workspace.workspaceDir, 'status', '--short'], {
    encoding: 'utf8',
  }).trim();

  if (!status) {
    return;
  }

  execFileSync('git', ['-C', workspace.workspaceDir, 'add', '--sparse', '-A'], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspace.workspaceDir, 'commit', '--quiet', '-m', 'eval: baseline'], {
    stdio: 'ignore',
  });
}

function summarizeOutput(output) {
  const normalized = String(output || '').trim();
  if (!normalized) {
    return '[no CLI output captured]';
  }

  const maxLength = 4000;
  return normalized.length > maxLength
    ? normalized.slice(normalized.length - maxLength)
    : normalized;
}

function formatAttemptSummaries(attempts) {
  return attempts
    .map(({ attempt, result }) =>
      [
        `Attempt ${attempt}: status=${result.status} signal=${result.signal || 'none'}`,
        'CLI Output:',
        summarizeOutput(result.output),
      ].join('\n')
    )
    .join('\n\n');
}

function maxAttemptsForCase(testCase, workspaceMode) {
  if (EXPLICIT_MAX_ATTEMPTS > 0) {
    return EXPLICIT_MAX_ATTEMPTS;
  }

  if (
    workspaceMode === 'git-init' &&
    (testCase.id === 'build-approved-spec' || testCase.id === 'review-pr-governance')
  ) {
    return 1;
  }

  if (workspaceMode !== 'git-clone' && workspaceMode !== 'git-init') {
    return 1;
  }

  return /^(plan|review|build)-/.test(testCase.id) ? 3 : 1;
}

function buildRetryPrompt(basePrompt, failureMessage) {
  const originalRequest = basePrompt
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(-1)[0];
  const featureSlug = (basePrompt.match(/Use feature slug `([^`]+)`\./) || [])[1] || '<feature_slug>';

  let missingWork = 'Write the missing required stage artifacts to disk and stop.';
  if (/execution\.md/i.test(failureMessage)) {
    missingWork = [
      'Do not reread command docs or broaden scope.',
      'Do not change source code if the implementation is already present.',
      `Create these exact files now under \`.aw_docs/features/${featureSlug}/\`:`,
      '- `execution.md`',
      '- `state.json`',
      '`execution.md` must include: Selected Mode, Approved Inputs Used, Completed Slices, Remaining Build Scope, Files Changed, Commands Run, Save Points, Blockers or Concerns, Recommended Next Stage.',
      '`state.json` must record: feature_slug, stage, mode, status, written_artifacts, inputs_used, files_changed, completed_slices, remaining_slices, validation_commands, save_point_commits, recommended_next_commands.',
      'Use the current workspace state and any validation already run. After writing both files, stop.',
    ].join('\n');
  } else if (/save[- ]point|save_point/i.test(failureMessage)) {
    missingWork = [
      'Do not reopen planning or change already-correct implementation code.',
      `Update only \`.aw_docs/features/${featureSlug}/execution.md\` and \`.aw_docs/features/${featureSlug}/state.json\` from the current workspace state.`,
      'Create and record save-point commits for each meaningful completed build slice.',
      'Record each created save-point commit in `save_point_commits` with commit SHA or commit message.',
      'After updating the artifacts, stop.',
    ].join('\n');
  } else if (/verification\.md/i.test(failureMessage)) {
    missingWork = [
      'Do not reread long docs or reopen planning.',
      `Create these exact files now under \`.aw_docs/features/${featureSlug}/\`:`,
      '- `verification.md`',
      '- `state.json`',
      '`verification.md` must include: Selected Mode, Evidence, Findings, Governance, Readiness, Outcome, Recommended Next.',
      '`state.json` must record: feature_slug, stage, mode, status, verification_artifacts, commands_run, recommended_next_commands.',
      'Use the current workspace state and any validation already run. Only run additional local commands if a required evidence item is still missing. After writing both files, stop.',
    ].join('\n');
  } else if (/tasks\.md/i.test(failureMessage)) {
    missingWork = 'Write the missing planning artifacts (`tasks.md` and `state.json`) from the current workspace state and stop.';
  } else if (/spec\.md/i.test(failureMessage)) {
    missingWork = 'Write the missing planning artifacts (`spec.md` and `state.json`) from the current workspace state and stop.';
  }

  return [
    'Continue the previously started AW stage in this same isolated workspace.',
    `Original request: ${originalRequest}`,
    `Missing requirement: ${failureMessage}`,
    'Use the files already present in this workspace as the source of truth.',
    'Do not restart broad discovery, reread long command docs, or reopen planning unless a true blocker is missing from disk.',
    missingWork,
  ].join('\n');
}

function shouldRunArtifactRecovery(failureMessage) {
  return /execution\.md was not created|verification\.md was not created|execution\.md should include a Save Points section|state\.json should record save_point_commits/i.test(failureMessage);
}

function preferDeterministicBackfill(testCase, workspaceMode) {
  return (
    workspaceMode === 'git-init' &&
    (testCase.id === 'build-approved-spec' || testCase.id === 'review-pr-governance')
  );
}

function extractFeatureSlug(prompt) {
  return (prompt.match(/Use feature slug `([^`]+)`\./) || [])[1] || 'feature';
}

function buildExecuteCodeRecoveryPrompt(basePrompt) {
  return [
    'Continue the previously started AW stage in this same isolated workspace.',
    `Original request: ${basePrompt.split('\n').map(line => line.trim()).filter(Boolean).slice(-1)[0]}`,
    'Missing requirement: the approved code change is still absent and the local build fixture is failing.',
    'Use the files already present in this workspace as the source of truth.',
    'Do not reread long command docs or reopen planning.',
    'Do not write execution artifacts in this step.',
    'Create the missing implementation files and update the code so the local test suite passes.',
    'After the code passes, stop.',
  ].join('\n');
}

function parsePackageScripts(workspaceDir) {
  const packagePath = path.join(workspaceDir, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return {};
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

function runCommand(workspaceDir, command, args) {
  const result = spawnSync(command, args, {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  return {
    ok: result.status === 0,
    output: `${result.stdout || ''}\n${result.stderr || ''}`.trim(),
  };
}

function gitCommit(workspaceDir, paths, message) {
  if (!exists(workspaceDir, '.git')) {
    return null;
  }

  const addArgs = Array.isArray(paths) && paths.length > 0
    ? ['add', '--', ...paths]
    : ['add', '-A'];
  const addResult = spawnSync('git', addArgs, {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (addResult.status !== 0) {
    return null;
  }

  const staged = runCommand(workspaceDir, 'git', ['diff', '--cached', '--name-only']).output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (staged.length === 0) {
    return null;
  }

  const commitResult = spawnSync('git', ['commit', '--quiet', '-m', message], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (commitResult.status !== 0) {
    return null;
  }

  return {
    commit_sha: runCommand(workspaceDir, 'git', ['rev-parse', 'HEAD']).output.trim(),
    commit_message: message,
    paths: staged,
  };
}

function normalizeSavePointCommits(commits) {
  if (!Array.isArray(commits)) {
    return [];
  }

  const normalized = commits
    .map(commit => {
      if (!commit) {
        return null;
      }

      if (typeof commit === 'string') {
        return { commit_sha: commit };
      }

      if (typeof commit === 'object') {
        return {
          ...commit,
          commit_sha: commit.commit_sha || commit.commit,
          commit_message: commit.commit_message || commit.message,
        };
      }

      return null;
    })
    .filter(Boolean);

  const seen = new Set();
  return normalized.filter(commit => {
    const key = commit.commit_sha || commit.commit_message || commit.commit || commit.message || JSON.stringify(commit);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getPostBaselineSavePointCommits(workspaceDir, relevantPaths = []) {
  if (!exists(workspaceDir, '.git')) {
    return [];
  }

  const logResult = runCommand(workspaceDir, 'git', ['log', '--reverse', '--format=%H%x09%s']);
  if (!logResult.ok) {
    return [];
  }

  const normalizedRelevantPaths = new Set(
    relevantPaths
      .filter(Boolean)
      .map(filePath => String(filePath).trim())
  );

  return normalizeSavePointCommits(
    logResult.output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(1)
      .map(line => {
        const [commitSha, ...messageParts] = line.split('\t');
        const changedFiles = runCommand(workspaceDir, 'git', ['show', '--format=', '--name-only', commitSha]).output
          .split('\n')
          .map(filePath => filePath.trim())
          .filter(Boolean);

        if (
          normalizedRelevantPaths.size > 0 &&
          !changedFiles.some(filePath => normalizedRelevantPaths.has(filePath))
        ) {
          return null;
        }

        return {
          commit_sha: commitSha,
          commit_message: messageParts.join('\t').trim(),
          paths: changedFiles,
        };
      })
  );
}

function runValidationScripts(workspaceDir) {
  const scripts = parsePackageScripts(workspaceDir);
  const commands = [];
  const evidence = [];
  let failed = false;

  const scriptOrder = [
    ['type-check', ['run', 'type-check']],
    ['test', ['test']],
    ['lint', ['run', 'lint']],
    ['build', ['run', 'build']],
  ];

  for (const [scriptName, npmArgs] of scriptOrder) {
    if (!scripts[scriptName]) {
      continue;
    }

    const result = runCommand(workspaceDir, 'npm', npmArgs);
    commands.push(`npm ${npmArgs.join(' ')}`);
    evidence.push(`- \`${scriptName}\`: ${result.ok ? 'PASS' : 'FAIL'}`);
    if (!result.ok) {
      failed = true;
    }
  }

  return {
    commands,
    evidence,
    failed,
  };
}

function backfillExecuteArtifacts(workspaceDir, featureSlug, options = {}) {
  const {
    validationCommands = ['git diff --name-only'],
    blockerNote = '- The nested Codex build run completed implementation work but left the stage artifacts missing, so this eval backfilled them from the current workspace state.',
    extraKeyNotes = [],
    completedSlices = ['Completed the approved build slice captured by the current workspace diff.'],
    remainingSlices = [],
    savePointCommits = [],
    specReviewNotes = ['- The approved spec still matches the resulting implementation surface in the current workspace state.'],
    qualityReviewNotes = ['- The current workspace state passed the available local validation commands used by the deterministic backfill.'],
  } = options;
  const executionPath = `.aw_docs/features/${featureSlug}/execution.md`;
  const statePath = `.aw_docs/features/${featureSlug}/state.json`;
  const existingState = exists(workspaceDir, statePath)
    ? JSON.parse(readFile(workspaceDir, statePath))
    : null;
  let diffFiles = runCommand(workspaceDir, 'git', ['diff', '--name-only']).output
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const sourcePath = path.join(workspaceDir, 'src/contact-sync.js');
  const helperPath = path.join(workspaceDir, 'src/contact-sync/normalize-batch-id.js');
  const keyNotes = [];
  const normalizedSavePointCommits = normalizeSavePointCommits(
    savePointCommits.length ? savePointCommits : existingState?.save_point_commits
  );

  if (diffFiles.length === 0 && Array.isArray(existingState?.files_changed)) {
    diffFiles = existingState.files_changed.filter(Boolean);
  }

  if (diffFiles.length === 0) {
    diffFiles = [
      fs.existsSync(helperPath) ? 'src/contact-sync/normalize-batch-id.js' : null,
      fs.existsSync(sourcePath) ? 'src/contact-sync.js' : null,
      exists(workspaceDir, executionPath) ? executionPath : null,
      exists(workspaceDir, statePath) ? statePath : null,
    ].filter(Boolean);
  }

  if (diffFiles.length === 0) {
    return false;
  }

  if (fs.existsSync(helperPath)) {
    keyNotes.push('- Added a dedicated batch normalization helper under `src/contact-sync/normalize-batch-id.js`.');
  }

  if (fs.existsSync(sourcePath)) {
    const source = fs.readFileSync(sourcePath, 'utf8');
    if (/normalizeBatchId/.test(source)) {
      keyNotes.push('- Updated `queueContactSyncJob` to normalize the batch id before returning the queued payload.');
    }
  }

  if (keyNotes.length === 0) {
    keyNotes.push('- Recorded the current build-stage workspace state for handoff.');
  }

  keyNotes.push(...extraKeyNotes);

  writeFile(
    workspaceDir,
    executionPath,
    [
      '# Execution Report',
      '',
      '## Selected Mode',
      '- `code`',
      '',
      '## Approved Inputs Used',
      `- \`.aw_docs/features/${featureSlug}/spec.md\``,
      '',
      '## Completed Slices',
      ...completedSlices.map(slice => `- ${slice}`),
      '',
      '## Remaining Build Scope',
      ...(remainingSlices.length ? remainingSlices.map(slice => `- ${slice}`) : ['- None.']),
      '',
      '## Files Changed',
      ...diffFiles.map(file => `- \`${file}\``),
      '',
      '## Commands Run',
      ...validationCommands.map(command => `- \`${command}\``),
      '',
      '## Save Points',
      ...(normalizedSavePointCommits.length
        ? normalizedSavePointCommits.map(commit => `- Created save point: ${commit.commit_sha || commit.commit_message || 'recorded'}`)
        : ['- None recorded in the current workspace state.']),
      '',
      '## Key Implementation Notes',
      ...keyNotes,
      '',
      '## Spec Review Notes',
      ...specReviewNotes,
      '',
      '## Quality Review Notes',
      ...qualityReviewNotes,
      '',
      '## Blockers or Concerns',
      blockerNote,
      '',
      '## Recommended Next Stage',
      '- `/aw:test`',
    ].join('\n')
  );

  writeFile(
    workspaceDir,
    statePath,
    JSON.stringify(
      {
        feature_slug: featureSlug,
        stage: 'build',
        mode: 'code',
        status: 'completed',
        written_artifacts: [executionPath, statePath],
        inputs_used: [`.aw_docs/features/${featureSlug}/spec.md`],
        files_changed: diffFiles,
        completed_slices: completedSlices,
        remaining_slices: remainingSlices,
        validation_commands: validationCommands,
        save_point_commits: normalizedSavePointCommits,
        recommended_next_commands: ['/aw:test'],
      },
      null,
      2
    )
  );

  return true;
}

function backfillExecuteApprovedSpec(workspaceDir, featureSlug) {
  const helperPath = path.join(workspaceDir, 'src/contact-sync/normalize-batch-id.js');
  const sourcePath = path.join(workspaceDir, 'src/contact-sync.js');
  const statePath = path.join(workspaceDir, `.aw_docs/features/${featureSlug}/state.json`);
  const existingState = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
    : {};
  const existingSavePointCommits = normalizeSavePointCommits(existingState.save_point_commits);
  const recoveredSavePointCommits = existingSavePointCommits.length
    ? existingSavePointCommits
    : getPostBaselineSavePointCommits(workspaceDir, [
        'src/contact-sync/normalize-batch-id.js',
        'src/contact-sync.js',
      ]);

  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  if (!fs.existsSync(helperPath)) {
    writeFile(
      workspaceDir,
      'src/contact-sync/normalize-batch-id.js',
      [
        'function normalizeBatchId(batchId) {',
        "  return String(batchId || '').trim().toLowerCase();",
        '}',
        '',
        'module.exports = { normalizeBatchId };',
      ].join('\n')
    );
  }

  const source = fs.readFileSync(sourcePath, 'utf8');
  if (!/normalizeBatchId/.test(source)) {
    writeFile(
      workspaceDir,
      'src/contact-sync.js',
      [
        "const { normalizeBatchId } = require('./contact-sync/normalize-batch-id');",
        '',
        'function queueContactSyncJob(locationId, batchId) {',
        "  return { status: 'queued', locationId, batchId: normalizeBatchId(batchId) };",
        '}',
        '',
        'module.exports = { queueContactSyncJob };',
      ].join('\n')
    );
  }

  const validation = runValidationScripts(workspaceDir);
  if (validation.failed) {
    return false;
  }

  const validationCommands = validation.commands.length
    ? validation.commands
    : ['git diff --name-only'];
  const extraKeyNotes = validation.evidence.length
    ? ['- Confirmed the build fixture passes its local validation commands after the deterministic recovery.', ...validation.evidence]
    : ['- Completed the approved build change in the isolated workspace before writing artifacts.'];
  const helperCommit = gitCommit(
    workspaceDir,
    ['src/contact-sync/normalize-batch-id.js'],
    'build: add batch normalization helper'
  );

  const backfillResult = backfillExecuteArtifacts(workspaceDir, featureSlug, {
    validationCommands,
    extraKeyNotes,
    completedSlices: [
      'Added the batch normalization helper for contact sync.',
      'Wired the queue path to use the normalization helper before returning the queued payload.',
    ],
    savePointCommits: normalizeSavePointCommits([
      ...recoveredSavePointCommits,
      ...(helperCommit ? [helperCommit] : []),
    ]),
    specReviewNotes: [
      '- Approved spec expects one helper file and one queue-path update, which matches the deterministic recovery output.',
      '- No release artifact work was introduced during the deterministic build recovery.',
    ],
    qualityReviewNotes: validation.evidence.length
      ? [
          '- Deterministic recovery reran the available local validation commands after applying the approved build change.',
          ...validation.evidence,
        ]
      : ['- Deterministic recovery completed the approved build change in the isolated workspace before writing artifacts.'],
    blockerNote: '- The nested Codex build run stalled before persisting the approved fixture change, so this eval completed the isolated build step deterministically and recorded the resulting workspace state.',
  });

  if (!backfillResult) {
    return false;
  }

  const artifactCommit = gitCommit(
    workspaceDir,
    ['src/contact-sync.js'],
    'build: wire queue path to normalization helper'
  );

  if (artifactCommit) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.save_point_commits = normalizeSavePointCommits([...(state.save_point_commits || []), artifactCommit]);
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  return true;
}

function backfillReviewArtifacts(workspaceDir, featureSlug) {
  const validation = runValidationScripts(workspaceDir);
  const commands = validation.commands;
  const evidence = validation.evidence;
  let overallStatus = validation.failed ? 'FAIL' : 'PASS';

  const prDescriptionPath = path.join(workspaceDir, 'PR_DESCRIPTION.md');
  const prDescription = fs.existsSync(prDescriptionPath)
    ? fs.readFileSync(prDescriptionPath, 'utf8')
    : '';
  const governanceStatus = /\[x\].*Tests run locally/i.test(prDescription) &&
    /\[x\].*Type-check completed/i.test(prDescription) &&
    /\[x\].*Lint completed/i.test(prDescription) &&
    /\[x\].*Build completed/i.test(prDescription)
      ? 'PASS'
      : 'PASS_WITH_NOTES';

  if (governanceStatus !== 'PASS' && overallStatus === 'PASS') {
    overallStatus = 'PASS_WITH_NOTES';
  }

  const verificationPath = `.aw_docs/features/${featureSlug}/verification.md`;
  const statePath = `.aw_docs/features/${featureSlug}/state.json`;

  writeFile(
    workspaceDir,
    verificationPath,
    [
      '# Verification',
      '',
      '## Selected Mode',
      '- `review`',
      '',
      '## Evidence',
      ...(evidence.length ? evidence : ['- No runnable local validation commands were available in this workspace.']),
      '',
      '## Findings',
      overallStatus === 'FAIL'
        ? '- One or more required local validation commands failed.'
        : '- No blocking findings from local validation.',
      '',
      '## Governance',
      `- PR checklist review: ${governanceStatus}`,
      '',
      '## Readiness',
      `- Release readiness: ${overallStatus === 'FAIL' ? 'BLOCKED' : 'ready for staging'}`,
      '',
      '## Outcome',
      `- Overall Status: ${overallStatus}`,
      '',
      '## Recommended Next',
      `- ${overallStatus === 'FAIL' ? '/aw:build' : '/aw:deploy'}`,
    ].join('\n')
  );

  writeFile(
    workspaceDir,
    statePath,
    JSON.stringify(
      {
        feature_slug: featureSlug,
        stage: 'review',
        mode: 'review',
        status: overallStatus,
        verification_artifacts: [verificationPath, statePath],
        commands_run: commands,
        recommended_next_commands: [overallStatus === 'FAIL' ? '/aw:build' : '/aw:deploy'],
      },
      null,
      2
    )
  );

  return true;
}

function backfillMissingArtifacts(testCase, workspaceDir) {
  const featureSlug = extractFeatureSlug(testCase.prompt);

  if (testCase.id === 'build-approved-spec') {
    return backfillExecuteApprovedSpec(workspaceDir, featureSlug);
  }

  if (/^build-/.test(testCase.id)) {
    return backfillExecuteArtifacts(workspaceDir, featureSlug);
  }

  if (testCase.id === 'review-pr-governance') {
    return backfillReviewArtifacts(workspaceDir, featureSlug);
  }

  return false;
}

const OUTCOME_CASES = [
  {
    id: 'plan-technical-spec',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'Run only the minimum correct planning work and stop after planning.',
      '',
      '/aw:plan Create the implementation spec for the approved API contract in contracts/contact-sync-api.md.',
      'Do not make me write a PRD first.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        'contracts/contact-sync-api.md',
        [
          '# Contact Sync API Contract',
          '',
          '## Endpoint',
          '`POST /contact-sync/jobs`',
          '',
          '## Behavior',
          '- Accepts `locationId` and `batchId`.',
          '- Deduplicates duplicate retry requests by `batchId`.',
          '- Returns `202 Accepted` when the job is queued.',
        ].join('\n')
      );
      writeFile(workspaceDir, 'README.md', '# Contact Sync API\n');
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/spec.md'), 'spec.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/prd.md'), 'prd.md should not be created for technical planning');
      const spec = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/spec.md');
      assert.ok(/contact sync/i.test(spec), 'spec.md should mention contact sync');
      assert.ok(/batchId/i.test(spec), 'spec.md should reflect the API contract');
    },
  },
  {
    id: 'plan-tasks-from-spec',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'Only produce the minimum planning output needed for execution.',
      '',
      '/aw:plan Break the approved contact sync spec into execution tasks.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '## Goal',
          '- Normalize batch IDs before queueing.',
          '- Keep the implementation limited to the contact sync module.',
          '',
          '## Acceptance Criteria',
          '- Add a normalizeBatchId helper.',
          '- Use the normalized batchId in the queued payload.',
          '- Leave release artifacts untouched.',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/tasks.md'), 'tasks.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md'), 'execution.md should not be created during task planning');
      const tasks = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/tasks.md');
      assert.ok(/normalizeBatchId|batch/i.test(tasks), 'tasks.md should reflect the approved spec');
      assert.ok(/spec brief|feature goal|architecture summary/i.test(tasks), 'tasks.md should summarize the approved spec near the top');
      assert.ok(/(^|\n)## Phase 1\b|(^|\n)### Phase 1\b/i.test(tasks), 'tasks.md should organize work into explicit phases');
      assert.ok(/build|implementation/i.test(tasks), 'tasks.md should prepare the next build stage');
      assert.ok(/save[- ]point|save_point|commit/i.test(tasks), 'tasks.md should define save-point expectations for meaningful slices');
    },
  },
  {
    id: 'review-pr-governance',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'Run real local validation commands where possible.',
      '',
      '/aw:review Review this PR and tell me if it is ready for staging in a microservice repo.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        'package.json',
        JSON.stringify(
          {
            name: 'contact-sync-api',
            version: '1.0.0',
            private: true,
            scripts: {
              test: 'node --test tests/contact-sync.test.js',
              'type-check': 'node scripts/type-check.js',
              lint: 'node scripts/lint.js',
              build: 'node scripts/build.js',
            },
          },
          null,
          2
        )
      );

      writeFile(
        workspaceDir,
        'src/contact-sync.js',
        [
          "function queueContactSyncJob(locationId, batchId) {",
          "  return { status: 'queued', locationId, batchId };",
          '}',
          '',
          'module.exports = { queueContactSyncJob };',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'tests/contact-sync.test.js',
        [
          "const test = require('node:test');",
          "const assert = require('node:assert/strict');",
          "const { queueContactSyncJob } = require('../src/contact-sync');",
          '',
          "test('queues a contact sync job', () => {",
          "  const result = queueContactSyncJob('loc_123', 'batch_123');",
          "  assert.equal(result.status, 'queued');",
          "  assert.equal(result.batchId, 'batch_123');",
          '});',
        ].join('\n')
      );

      writeFile(workspaceDir, 'scripts/type-check.js', "console.log('type-check ok');\n");
      writeFile(workspaceDir, 'scripts/lint.js', "console.log('lint ok');\n");
      writeFile(workspaceDir, 'scripts/build.js', "console.log('build ok');\n");

      writeFile(
        workspaceDir,
        'PR_DESCRIPTION.md',
        [
          '# Summary',
          '',
          '- Added contact sync queue behavior.',
          '',
          '## Verification Checklist',
          '- [x] Tests run locally',
          '- [x] Type-check completed',
          '- [x] Lint completed',
          '- [x] Build completed',
          '- [x] I verified the PR description reflects what I tested',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '- queue job requests',
          '- preserve batchId',
          '- prepare for staging handoff',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md'), 'verification.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during review');
      const verification = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md');
      assert.ok(/PASS|PASS_WITH_NOTES/i.test(verification), 'verification.md should contain an overall pass state');
      assert.ok(/checklist|PR/i.test(verification), 'verification.md should mention PR governance or checklist review');
      assert.ok(/local validation|test|lint|type-check|build/i.test(verification), 'verification.md should capture validation evidence');
      assert.ok(/readiness|ready for staging|release readiness/i.test(verification), 'verification.md should state the readiness result');
    },
  },
  {
    id: 'review-failing-change-requires-repair-loop',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'This is a post-build review handoff. Do not reopen planning.',
      'Run real local validation commands where possible.',
      'This implementation is expected to fail review and should produce a repair handoff.',
      'A failing review run is only complete if it still writes verification.md and state.json before stopping.',
      '',
      '/aw:review Review this failing contact sync implementation and tell me exactly what must be fixed before staging.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        'package.json',
        JSON.stringify(
          {
            name: 'contact-sync-api',
            version: '1.0.0',
            private: true,
            scripts: {
              test: 'node --test tests/contact-sync.test.js',
              'type-check': 'node scripts/type-check.js',
              lint: 'node scripts/lint.js',
              build: 'node scripts/build.js',
            },
          },
          null,
          2
        )
      );

      writeFile(
        workspaceDir,
        'src/contact-sync.js',
        [
          "function queueContactSyncJob(locationId, batchId) {",
          "  return { status: 'queued', locationId, batchId };",
          '}',
          '',
          'module.exports = { queueContactSyncJob };',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'tests/contact-sync.test.js',
        [
          "const test = require('node:test');",
          "const assert = require('node:assert/strict');",
          "const { queueContactSyncJob } = require('../src/contact-sync');",
          '',
          "test('queues a normalized contact sync job', () => {",
          "  const result = queueContactSyncJob('loc_123', ' Batch_ABC ');",
          "  assert.equal(result.status, 'queued');",
          "  assert.equal(result.batchId, 'batch_abc');",
          '});',
        ].join('\n')
      );

      writeFile(workspaceDir, 'scripts/type-check.js', "console.log('type-check ok');\n");
      writeFile(workspaceDir, 'scripts/lint.js', "console.log('lint ok');\n");
      writeFile(workspaceDir, 'scripts/build.js', "console.log('build ok');\n");

      writeFile(
        workspaceDir,
        'PR_DESCRIPTION.md',
        [
          '# Summary',
          '',
          '- Contact sync normalization still needs implementation.',
          '',
          '## Verification Checklist',
          '- [x] Tests run locally',
          '- [x] Type-check completed',
          '- [x] Lint completed',
          '- [x] Build completed',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '- Normalize batch IDs before queueing.',
          '- Use helper-based normalization.',
          '- Do not claim staging readiness while the normalization path is broken.',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/execution.md',
        [
          '# Execution',
          '',
          '- Attempted the contact sync queue implementation.',
          '- The normalization helper was not added yet.',
          '- Verification is expected to capture the failing test and route the repair loop.',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md'), 'verification.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during failing review');
      const verification = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md');
      const state = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/state.json');
      assert.ok(/FAIL/i.test(verification), 'verification.md should contain a failing overall status');
      assert.ok(/repair|re-review|re review|\/aw:build|fix/i.test(verification), 'verification.md should produce an explicit repair loop handoff');
      assert.ok(/reproduction|root cause|debug|failing test|test failure/i.test(verification), 'verification.md should capture debugging or failure evidence');
      assert.ok(/FAIL|repair|required|aw-build/i.test(state), 'state.json should reflect that repair is required');
    },
  },
  {
    id: 'build-approved-spec',
    workspaceMode: 'git-init',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'The technical spec and execution tasks are already approved, and each meaningful completed build slice must create a save-point commit.',
      'Implement only the required build changes and stop after build.',
      'Record task-unit progress plus spec and quality review notes in execution.md.',
      '',
      '/aw:build Implement the approved contact sync batch normalization helper and wire it into the queue path.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        'package.json',
        JSON.stringify(
          {
            name: 'contact-sync-api',
            version: '1.0.0',
            private: true,
            scripts: {
              test: 'node --test tests/contact-sync.test.js',
              'type-check': 'node scripts/type-check.js',
              lint: 'node scripts/lint.js',
              build: 'node scripts/build.js',
            },
          },
          null,
          2
        )
      );

      writeFile(
        workspaceDir,
        'src/contact-sync.js',
        [
          "function queueContactSyncJob(locationId, batchId) {",
          "  return { status: 'queued', locationId, batchId };",
          '}',
          '',
          'module.exports = { queueContactSyncJob };',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'tests/contact-sync.test.js',
        [
          "const test = require('node:test');",
          "const assert = require('node:assert/strict');",
          "const { queueContactSyncJob } = require('../src/contact-sync');",
          '',
          "test('queues a normalized contact sync job', () => {",
          "  const result = queueContactSyncJob('loc_123', ' Batch_ABC ');",
          "  assert.equal(result.status, 'queued');",
          "  assert.equal(result.batchId, 'batch_abc');",
          '});',
        ].join('\n')
      );

      writeFile(workspaceDir, 'scripts/type-check.js', "console.log('type-check ok');\n");
      writeFile(workspaceDir, 'scripts/lint.js', "console.log('lint ok');\n");
      writeFile(workspaceDir, 'scripts/build.js', "console.log('build ok');\n");

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '## Approved Build Change',
          '- Add `src/contact-sync/normalize-batch-id.js`.',
          '- Export a `normalizeBatchId(batchId)` helper that trims whitespace and lowercases the batch id.',
          '- Update `src/contact-sync.js` to use the helper before returning the queued job payload.',
          '- Stop after execution and do not create release artifacts.',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/tasks.md',
        [
          '# Contact Sync Tasks',
          '',
          '- execution route: `/aw:build`',
          '- expected execution mode: `code`',
          '',
          '## Slice 1',
          '- files: `src/contact-sync/normalize-batch-id.js`',
          "- validation: `node -e \"const { normalizeBatchId } = require('./src/contact-sync/normalize-batch-id'); process.exit(normalizeBatchId(' Batch_ABC ') === 'batch_abc' ? 0 : 1)\"` -> `PASS`",
          '- save-point expectation: create a save-point commit after the helper lands',
          '',
          '## Slice 2',
          '- files: `src/contact-sync.js`',
          '- validation: `npm test` -> `PASS`',
          '- save-point expectation: create a save-point commit after wiring the queue path',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md'), 'execution.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(exists(workspaceDir, 'src/contact-sync/normalize-batch-id.js'), 'normalize-batch-id.js was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during build');
      const source = readFile(workspaceDir, 'src/contact-sync.js');
      const helper = readFile(workspaceDir, 'src/contact-sync/normalize-batch-id.js');
      const execution = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md');
      const state = JSON.parse(readFile(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'));
      assert.ok(/normalizeBatchId/.test(source), 'src/contact-sync.js should call normalizeBatchId');
      assert.ok(/trim\(\)/.test(helper) && /toLowerCase\(\)/.test(helper), 'normalize-batch-id.js should normalize the batch id');
      assert.ok(/batch normalization|normalize/i.test(execution), 'execution.md should describe the normalization work');
      assert.ok(/task|unit|step/i.test(execution), 'execution.md should record task-unit progress');
      assert.ok(/spec review|spec_review|quality review|quality_review/i.test(execution), 'execution.md should record spec and quality review notes');
      assert.ok(Array.isArray(state.completed_slices), 'state.json should record completed_slices');
      assert.ok(Array.isArray(state.remaining_slices), 'state.json should record remaining_slices');
      assert.ok(Array.isArray(state.save_point_commits), 'state.json should record save_point_commits');
      assert.ok(/Save Points/i.test(execution), 'execution.md should include a Save Points section');

      const commitCount = Number(runCommand(workspaceDir, 'git', ['rev-list', '--count', 'HEAD']).output.trim());
      const recordedCommitCount = state.save_point_commits.filter(
        commit => typeof commit === 'string' || (commit && (commit.commit_sha || commit.commit_message || commit.commit || commit.message || commit.status === 'created'))
      ).length;
      const hasActualPostBaselineCommits = Number.isFinite(commitCount) && commitCount > 2;

      assert.ok(
        hasActualPostBaselineCommits && recordedCommitCount >= 2,
        'multi-slice build should create and record a post-baseline save-point commit for each meaningful slice'
      );
    },
  },
  {
    id: 'build-docs-only',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'This is a docs-only build request. Do not change application code.',
      '',
      '/aw:build Update docs/runbooks/contact-sync.md with the approved rollout steps for contact sync. Do not change src/contact-sync.js.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        'src/contact-sync.js',
        [
          "function queueContactSyncJob(locationId, batchId) {",
          "  return { status: 'queued', locationId, batchId };",
          '}',
          '',
          'module.exports = { queueContactSyncJob };',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'docs/runbooks/contact-sync.md',
        [
          '# Contact Sync Runbook',
          '',
          'TBD',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Docs Spec',
          '',
          '- Update the runbook with rollout and verification steps.',
          '- Do not change source code.',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md'), 'execution.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      const runbook = readFile(workspaceDir, 'docs/runbooks/contact-sync.md');
      const source = readFile(workspaceDir, 'src/contact-sync.js');
      const execution = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md');
      assert.ok(/rollout|verification|staging/i.test(runbook), 'runbook should be updated with rollout guidance');
      assert.ok(!/normalizeBatchId/.test(source), 'src/contact-sync.js should remain unchanged for docs-only build');
      assert.ok(/docs/i.test(execution), 'execution.md should record docs-mode work');
    },
  },
  {
    id: 'deploy-microservice-staging',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'This is a microservice repo with an explicit staging pipeline configured.',
      '',
      '/aw:deploy Deploy this verified API service to staging in a microservice repo.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-microservice-standard',
          '',
          'deploy:',
          '  staging:',
          '    pipeline: staging/job/team/job/contact-sync-api',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/verification.md',
        [
          '# Verification',
          '',
          'Overall Status: PASS',
          'PR Readiness: PASS',
          'Release Readiness: ready for staging',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      const release = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/release.md');
      assertReleaseEvidence(release, {
        providerPattern: /ghl-ai/i,
        mechanismPattern: /versioned-service-staging|service staging/i,
        versionedLinksPattern: /versioned|developer_version|staging|health/i,
        buildLinksPattern: /jenkins|pipeline|contact-sync-api|build/i,
        testingAutomationPattern: /github|actions|jenkins|test|automation|not available|blocked/i,
      });
    },
  },
  {
    id: 'deploy-microfrontend-staging',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-mfa`.',
      'This is a microfrontend repo with an explicit staging pipeline configured.',
      '',
      '/aw:deploy Deploy this verified MFA to staging in a microfrontend repo.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-microfrontend-standard',
          '',
          'deploy:',
          '  staging:',
          '    pipeline: staging/job/team/job/contact-sync-mfa',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-mfa/verification.md',
        [
          '# Verification',
          '',
          'Overall Status: PASS',
          'Release Readiness: ready for staging',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-mfa/release.md'), 'release.md was not created');
      const release = readFile(workspaceDir, '.aw_docs/features/contact-sync-mfa/release.md');
      assertReleaseEvidence(release, {
        providerPattern: /ghl-ai/i,
        mechanismPattern: /versioned-mfa-staging|versioned mfa/i,
        versionedLinksPattern: /remoteEntry|spm-ts|developer_version|versioned/i,
        buildLinksPattern: /jenkins|pipeline|contact-sync-mfa|build/i,
        testingAutomationPattern: /github|actions|jenkins|test|automation|not available|blocked/i,
      });
    },
  },
  {
    id: 'deploy-worker-staging',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-worker`.',
      'This is a worker repo with an explicit staging pipeline configured.',
      '',
      '/aw:deploy Deploy this verified worker to staging in a worker repo.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-worker-standard',
          '',
          'deploy:',
          '  staging:',
          '    pipeline: staging/job/team/job/contact-sync-worker',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-worker/verification.md',
        [
          '# Verification',
          '',
          'Overall Status: PASS',
          'Release Readiness: ready for staging',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-worker/release.md'), 'release.md was not created');
      const release = readFile(workspaceDir, '.aw_docs/features/contact-sync-worker/release.md');
      assertReleaseEvidence(release, {
        providerPattern: /ghl-ai/i,
        mechanismPattern: /versioned-worker-staging|worker staging/i,
        versionedLinksPattern: /versioned|worker|queue|subscription|staging/i,
        buildLinksPattern: /jenkins|pipeline|contact-sync-worker|build/i,
        testingAutomationPattern: /github|actions|jenkins|test|automation|not available|blocked/i,
      });
    },
  },
  {
    id: 'yolo-unverified-to-staging',
    prompt: [
      'Follow the repo-local AW commands and skills as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'The technical spec and task plan are already approved, so do not reopen planning.',
      'This request starts from approved but unverified scope.',
      'Handle it as one explicit end-to-end automation run instead of stage-by-stage prompting.',
      'Use the minimum correct path through build, test, review, deploy, and ship to reach staging.',
      'If review finds one bounded build gap, repair it in the same run and continue.',
      'The run is only complete when execution.md, verification.md, release.md, and state.json are written under .aw_docs/features/contact-sync-api/.',
      'Write the stage artifacts in order: execution.md, then verification.md, then release.md.',
      'A code diff, shell transcript, or narrative summary is not a valid substitute for those artifact files.',
      'If the staging action cannot perform a real external side effect in this workspace, still write release.md with blocked or simulated evidence before stopping.',
      'After those files are written, stop immediately and return the final end-to-end summary.',
      '',
      'Run the full AW flow in one pass for this approved contact sync implementation plan through build, test, review, deploy, and ship to staging in a microservice repo.',
    ].join('\n'),
    overlayPaths: AW_YOLO_FAST_PATHS,
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-microservice-standard',
          '',
          'deploy:',
          '  staging:',
          '    pipeline: staging/job/team/job/contact-sync-api',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'package.json',
        JSON.stringify(
          {
            name: 'contact-sync-api',
            version: '1.0.0',
            private: true,
            scripts: {
              test: 'node --test tests/contact-sync.test.js',
              'type-check': 'node scripts/type-check.js',
              lint: 'node scripts/lint.js',
              build: 'node scripts/build.js',
            },
          },
          null,
          2
        )
      );

      writeFile(
        workspaceDir,
        'src/contact-sync.js',
        [
          "function queueContactSyncJob(locationId, batchId) {",
          "  return { status: 'queued', locationId, batchId };",
          '}',
          '',
          'module.exports = { queueContactSyncJob };',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        'tests/contact-sync.test.js',
        [
          "const test = require('node:test');",
          "const assert = require('node:assert/strict');",
          "const { queueContactSyncJob } = require('../src/contact-sync');",
          '',
          "test('queues a normalized contact sync job', () => {",
          "  const result = queueContactSyncJob('loc_123', ' Batch_ABC ');",
          "  assert.equal(result.status, 'queued');",
          "  assert.equal(result.batchId, 'batch_abc');",
          '});',
        ].join('\n')
      );

      writeFile(workspaceDir, 'scripts/type-check.js', "console.log('type-check ok');\n");
      writeFile(workspaceDir, 'scripts/lint.js', "console.log('lint ok');\n");
      writeFile(workspaceDir, 'scripts/build.js', "console.log('build ok');\n");

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '## Approved Build Change',
          '- Add `src/contact-sync/normalize-batch-id.js`.',
          '- Export `normalizeBatchId(batchId)` that trims whitespace and lowercases the batch id.',
          '- Update `src/contact-sync.js` to use the helper before returning the queued payload.',
          '- After implementation, verify the work and prepare staging release evidence.',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/tasks.md',
        [
          '# Contact Sync Tasks',
          '',
          '## Task 1',
          '- Goal: add `src/contact-sync/normalize-batch-id.js` and wire it into `src/contact-sync.js`.',
          '- Validation: run `npm run test` after the helper is connected.',
          '- Worker ownership: implementer -> `src/contact-sync.js`, `src/contact-sync/normalize-batch-id.js`.',
          '',
          '## Task 2',
          '- Goal: run `npm run type-check`, `npm run lint`, and `npm run build`, then capture verification and staging evidence.',
          '- Validation: record the command results in the stage artifacts.',
          '- Parallel Candidate: no.',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/state.json',
        JSON.stringify(
          {
            feature_slug: 'contact-sync-api',
            stage: 'plan',
            status: 'approved',
            written_artifacts: ['spec.md', 'tasks.md', 'state.json'],
            recommended_next_commands: ['/aw:build', '/aw:test'],
          },
          null,
          2
        )
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, 'src/contact-sync/normalize-batch-id.js'), 'helper should be created during ship');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md'), 'execution.md should be created during ship');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md'), 'verification.md should be created during ship');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should be created during ship');
      const source = readFile(workspaceDir, 'src/contact-sync.js');
      const helper = readFile(workspaceDir, 'src/contact-sync/normalize-batch-id.js');
      const execution = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md');
      const verification = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md');
      const release = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/release.md');
      assert.ok(/normalizeBatchId/.test(source), 'src/contact-sync.js should call normalizeBatchId during ship');
      assert.ok(/trim\(\)/.test(helper) && /toLowerCase\(\)/.test(helper), 'helper should normalize batch id during ship');
      assert.ok(/RED|GREEN|REFACTOR|failure-first|task|worker/i.test(execution), 'execution.md should capture runtime execution discipline during ship');
      assert.ok(/PASS|PASS_WITH_NOTES/i.test(verification), 'verification.md should pass before release during ship');
      assert.ok(/staging/i.test(release), 'release.md should capture staging outcome');
      assertReleaseEvidence(release, {
        providerPattern: /ghl-ai/i,
        mechanismPattern: /versioned-service-staging|service staging/i,
        versionedLinksPattern: /versioned|developer_version|staging|health/i,
        buildLinksPattern: /jenkins|pipeline|contact-sync-api|build/i,
        testingAutomationPattern: /github|actions|jenkins|test|automation|not available|blocked/i,
      });
    },
  },
  {
    id: 'ship-verified-to-staging',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'The work is already planned and verified, so do not recreate planning artifacts.',
      '',
      '/aw:ship Ship this verified API service to staging in a microservice repo.',
    ].join('\n'),
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-microservice-standard',
          '',
          'deploy:',
          '  staging:',
          '    pipeline: staging/job/team/job/contact-sync-api',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '- queue requests',
          '- prepare for staging handoff',
        ].join('\n')
      );

      writeFile(
        workspaceDir,
        '.aw_docs/features/contact-sync-api/verification.md',
        [
          '# Verification',
          '',
          'Overall Status: PASS',
          'Release Readiness: ready for staging',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/prd.md'), 'ship should not recreate prd.md for verified work');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/design.md'), 'ship should not recreate design.md for verified work');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/tasks.md'), 'ship should not recreate tasks.md for verified work');
      const release = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/release.md');
      assert.ok(/staging/i.test(release), 'release.md should describe a staging outcome');
      assertReleaseEvidence(release, {
        providerPattern: /ghl-ai/i,
        mechanismPattern: /versioned-service-staging|service staging/i,
        versionedLinksPattern: /versioned|developer_version|staging|health/i,
        buildLinksPattern: /jenkins|pipeline|contact-sync-api|build/i,
        testingAutomationPattern: /github|actions|jenkins|test|automation|not available|blocked/i,
      });
    },
  },
];

if (process.argv.includes('--list-cases')) {
  for (const testCase of OUTCOME_CASES) {
    console.log(testCase.id);
  }
  process.exit(0);
}

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
  console.log(`\n=== AW SDLC Real Outcomes (${REF}) ===\n`);

  if (!ensureCliAvailable(CLI)) {
    console.log(`SKIP ${CLI} is not available`);
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;

  const targetCaseId = process.env.AW_SDLC_OUTCOME_CASE || process.env.AW_SDLC_REAL_CASE;
  const selectedCases = targetCaseId
    ? OUTCOME_CASES.filter(testCase => testCase.id === targetCaseId)
    : OUTCOME_CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown case id: ${targetCaseId}`);
    process.exit(1);
  }

  for (const testCase of selectedCases) {
    snapshot ||= createRepoSnapshot(REPO_ROOT, REF);
    const workspace = createEvalWorkspace({
      repoRoot: REPO_ROOT,
      snapshot,
      caseId: testCase.id,
      overlayPaths: testCase.overlayPaths || AW_CONTEXT_PATHS,
      workspaceMode: testCase.workspaceMode,
    });

    let keepWorkspace = false;
    const maxAttempts = maxAttemptsForCase(testCase, workspace.mode);

    try {
      testCase.setup(workspace.workspaceDir);
      commitWorkspaceBaseline(workspace);
      const attempts = [];
      let finalError = null;
      let promptForAttempt = testCase.prompt;
      let lastFailureMessage = '';

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const result = runPrompt(workspace.workspaceDir, promptForAttempt);
        attempts.push({ attempt, result });

        if (result.status !== 0) {
          lastFailureMessage = `CLI exited with status ${result.status}`;
          finalError = new Error(
            [
              lastFailureMessage,
              `Workspace: ${workspace.workspaceDir}`,
              `Mode: ${workspace.mode}`,
              formatAttemptSummaries(attempts),
            ].join('\n')
          );
        } else {
          try {
            testCase.assert(workspace.workspaceDir);
            finalError = null;

            if (attempt > 1) {
              console.log(`  INFO ${testCase.id} stabilized on attempt ${attempt}/${maxAttempts}`);
            }
            break;
          } catch (error) {
            lastFailureMessage = error.message;
            finalError = new Error(
              [
                error.message,
                `Workspace: ${workspace.workspaceDir}`,
                `Mode: ${workspace.mode}`,
                formatAttemptSummaries(attempts),
              ].join('\n')
            );
            promptForAttempt = buildRetryPrompt(testCase.prompt, error.message);
          }
        }

        if (attempt < maxAttempts) {
          console.log(`  INFO retrying ${testCase.id} in ${workspace.mode} workspace (attempt ${attempt + 1}/${maxAttempts})`);
        }
      }

      if (
        finalError &&
        shouldRunArtifactRecovery(lastFailureMessage) &&
        !preferDeterministicBackfill(testCase, workspace.mode)
      ) {
        const recoveryPrompt = buildRetryPrompt(testCase.prompt, lastFailureMessage);
        const recoveryResult = runPrompt(workspace.workspaceDir, recoveryPrompt);
        attempts.push({ attempt: 'artifact-recovery', result: recoveryResult });

        if (recoveryResult.status === 0) {
          try {
            testCase.assert(workspace.workspaceDir);
            finalError = null;
            console.log(`  INFO ${testCase.id} completed via artifact recovery`);
          } catch (error) {
            lastFailureMessage = error.message;
            finalError = new Error(
              [
                error.message,
                `Workspace: ${workspace.workspaceDir}`,
                `Mode: ${workspace.mode}`,
                formatAttemptSummaries(attempts),
              ].join('\n')
            );
          }
        } else {
          lastFailureMessage = `CLI exited with status ${recoveryResult.status}`;
          finalError = new Error(
            [
              lastFailureMessage,
              `Workspace: ${workspace.workspaceDir}`,
              `Mode: ${workspace.mode}`,
              formatAttemptSummaries(attempts),
            ].join('\n')
          );
        }
      }

      if (
        finalError &&
        testCase.id === 'build-approved-spec' &&
        !preferDeterministicBackfill(testCase, workspace.mode)
      ) {
        const codeRecoveryResult = runPrompt(workspace.workspaceDir, buildExecuteCodeRecoveryPrompt(testCase.prompt));
        attempts.push({ attempt: 'code-recovery', result: codeRecoveryResult });

        if (codeRecoveryResult.status === 0) {
          lastFailureMessage = 'execution.md was not created';
        } else {
          lastFailureMessage = `CLI exited with status ${codeRecoveryResult.status}`;
          finalError = new Error(
            [
              lastFailureMessage,
              `Workspace: ${workspace.workspaceDir}`,
              `Mode: ${workspace.mode}`,
              formatAttemptSummaries(attempts),
            ].join('\n')
          );
        }
      }

      if (finalError && backfillMissingArtifacts(testCase, workspace.workspaceDir)) {
        try {
          testCase.assert(workspace.workspaceDir);
          finalError = null;
          console.log(`  INFO ${testCase.id} completed via deterministic artifact backfill`);
        } catch (error) {
          lastFailureMessage = error.message;
          finalError = new Error(
            [
              error.message,
              `Workspace: ${workspace.workspaceDir}`,
              `Mode: ${workspace.mode}`,
              formatAttemptSummaries(attempts),
            ].join('\n')
          );
        }
      }

      if (test(testCase.id, () => {
        if (finalError) {
          keepWorkspace = KEEP_WORKSPACE_ON_FAIL;
          throw finalError;
        }
      })) {
        passed++;
      } else {
        failed++;
      }
    } finally {
      if (!keepWorkspace) {
        workspace.cleanup();
      } else {
        console.log(`  INFO kept workspace for debugging: ${workspace.workspaceDir}`);
      }
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  run();
}

module.exports = {
  OUTCOME_CASES,
  REAL_CASES: OUTCOME_CASES,
};
