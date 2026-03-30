const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { createRepoSnapshot } = require('./lib/repo-snapshot');
const { createEvalWorkspace } = require('./lib/eval-workspace');
const { REPO_ROOT } = require('./lib/aw-sdlc-paths');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_SDLC_EVAL_TIMEOUT_MS || 240000);
const REASONING_EFFORT = process.env.AW_SDLC_EVAL_REASONING_EFFORT || 'medium';
const snapshot = createRepoSnapshot(REPO_ROOT, REF);

const AW_CONTEXT_PATHS = [
  'AGENTS.md',
  'commands/plan.md',
  'commands/execute.md',
  'commands/verify.md',
  'commands/deploy.md',
  'commands/ship.md',
  'commands/brainstorm.md',
  'commands/finish.md',
  'commands/code-review.md',
  'commands/tdd.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-plan/SKILL.md',
  'skills/aw-prepare/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-finish/SKILL.md',
  'skills/aw-review-loop/SKILL.md',
  'skills/aw-systematic-debugging/SKILL.md',
  'docs/aw-sdlc-command-contracts.md',
  'docs/aw-sdlc-command-skill-architecture.md',
  'docs/aw-sdlc-verify-deploy-configuration.md',
  'defaults/aw-sdlc/profiles.yml',
];

const AW_SHIP_FAST_PATHS = [
  'AGENTS.md',
  'commands/execute.md',
  'commands/verify.md',
  'commands/deploy.md',
  'commands/ship.md',
  'skills/using-aw-skills/SKILL.md',
  'skills/aw-prepare/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'defaults/aw-sdlc/profiles.yml',
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
  const result = spawnSync(CLI, ['exec', '-c', `model_reasoning_effort="${REASONING_EFFORT}"`, '--skip-git-repo-check', prompt], {
    cwd: workspaceDir,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  return {
    status: result.status,
    signal: result.signal,
    output: `${result.stdout || ''}\n${result.stderr || ''}`.trim(),
  };
}

function summarizeCliOutput(output) {
  if (!output) {
    return 'CLI produced no output.';
  }

  const lines = output.trim().split('\n');
  return lines.slice(-40).join('\n');
}

const REAL_CASES = [
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
      assert.ok(/execute|implementation/i.test(tasks), 'tasks.md should prepare the next execution stage');
    },
  },
  {
    id: 'verify-pr-governance',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'Run real local validation commands where possible.',
      '',
      '/aw:verify Review this PR and tell me if it is ready for staging in a microservice repo.',
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
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during verify');
      const verification = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md');
      assert.ok(/PASS|PASS_WITH_NOTES/i.test(verification), 'verification.md should contain an overall pass state');
      assert.ok(/checklist|PR/i.test(verification), 'verification.md should mention PR governance or checklist review');
      assert.ok(/local validation|test|lint|type-check|build/i.test(verification), 'verification.md should capture validation evidence');
      assert.ok(/readiness|ready for staging|release readiness/i.test(verification), 'verification.md should state the readiness result');
    },
  },
  {
    id: 'verify-failing-change-requires-repair-loop',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'This is a post-execution verify handoff. Do not reopen planning.',
      'Run real local validation commands where possible.',
      'This implementation is expected to fail verification and should produce a repair handoff.',
      'A failing verify run is only complete if it still writes verification.md and state.json before stopping.',
      '',
      '/aw:verify Review this failing contact sync implementation and tell me exactly what must be fixed before staging.',
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
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during failing verify');
      const verification = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/verification.md');
      const state = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/state.json');
      assert.ok(/FAIL/i.test(verification), 'verification.md should contain a failing overall status');
      assert.ok(/repair|re-review|re review|\/aw:execute|fix/i.test(verification), 'verification.md should produce an explicit repair loop handoff');
      assert.ok(/reproduction|root cause|debug|failing test|test failure/i.test(verification), 'verification.md should capture debugging or failure evidence');
      assert.ok(/FAIL|repair|required|aw-execute/i.test(state), 'state.json should reflect that repair is required');
    },
  },
  {
    id: 'execute-approved-spec',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'The technical spec is already approved, so implement only the required execution changes and stop after execution.',
      'Record task-unit progress plus spec and quality review notes in execution.md.',
      '',
      '/aw:execute Implement the approved contact sync batch normalization helper and wire it into the queue path.',
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
        '.aw_docs/features/contact-sync-api/spec.md',
        [
          '# Contact Sync Spec',
          '',
          '## Approved Execution Change',
          '- Add `src/contact-sync/normalize-batch-id.js`.',
          '- Export a `normalizeBatchId(batchId)` helper that trims whitespace and lowercases the batch id.',
          '- Update `src/contact-sync.js` to use the helper before returning the queued job payload.',
          '- Stop after execution and do not create release artifacts.',
        ].join('\n')
      );
    },
    assert(workspaceDir) {
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md'), 'execution.md was not created');
      assert.ok(exists(workspaceDir, '.aw_docs/features/contact-sync-api/state.json'), 'state.json was not created');
      assert.ok(exists(workspaceDir, 'src/contact-sync/normalize-batch-id.js'), 'normalize-batch-id.js was not created');
      assert.ok(!exists(workspaceDir, '.aw_docs/features/contact-sync-api/release.md'), 'release.md should not be created during execute');
      const source = readFile(workspaceDir, 'src/contact-sync.js');
      const helper = readFile(workspaceDir, 'src/contact-sync/normalize-batch-id.js');
      const execution = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/execution.md');
      const state = readFile(workspaceDir, '.aw_docs/features/contact-sync-api/state.json');
      assert.ok(/normalizeBatchId/.test(source), 'src/contact-sync.js should call normalizeBatchId');
      assert.ok(/trim\(\)/.test(helper) && /toLowerCase\(\)/.test(helper), 'normalize-batch-id.js should normalize the batch id');
      assert.ok(/batch normalization|normalize/i.test(execution), 'execution.md should describe the normalization work');
      assert.ok(/task|unit|step/i.test(execution), 'execution.md should record task-unit progress');
      assert.ok(/spec review|spec_review|quality review|quality_review/i.test(execution), 'execution.md should record spec and quality review notes');
      assert.ok(/task|unit|review/i.test(state), 'state.json should reflect task-loop execution details');
    },
  },
  {
    id: 'execute-docs-only',
    prompt: [
      'Follow the repo-local AW commands, skills, and docs as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'This is a docs-only implementation request. Do not change application code.',
      '',
      '/aw:execute Update docs/runbooks/contact-sync.md with the approved rollout steps for contact sync. Do not change src/contact-sync.js.',
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
      assert.ok(!/normalizeBatchId/.test(source), 'src/contact-sync.js should remain unchanged for docs-only execution');
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
          '  modes:',
          '    staging:',
          '      pipeline: staging/job/team/job/contact-sync-api',
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
          '  modes:',
          '    staging:',
          '      pipeline: staging/job/team/job/contact-sync-mfa',
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
          '  modes:',
          '    staging:',
          '      pipeline: staging/job/team/job/contact-sync-worker',
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
    id: 'ship-unverified-to-staging',
    prompt: [
      'Follow the repo-local AW commands and skills as the source of truth.',
      'Execute the requested AW stage for real and write files to disk.',
      'Do not modify commands/, skills/, docs/, defaults/, or tests/.',
      'Use feature slug `contact-sync-api`.',
      'The technical spec and task plan are already approved, so do not reopen planning.',
      'This request starts from approved but unverified scope.',
      'Stay inside one /aw:ship run and use the minimum correct fast path to reach staging.',
      'If verify finds one bounded execution gap, repair it in the same /aw:ship run and continue.',
      'The run is only complete when execution.md, verification.md, release.md, and state.json are written under .aw_docs/features/contact-sync-api/.',
      'Write the stage artifacts in order: execution.md, then verification.md, then release.md.',
      'A code diff, shell transcript, or narrative summary is not a valid substitute for those artifact files.',
      'If the staging action cannot perform a real external side effect in this workspace, still write release.md with blocked or simulated evidence before stopping.',
      'After those files are written, stop immediately and return the final ship summary.',
      '',
      '/aw:ship Take this approved contact sync implementation plan through execution, verification, and staging in a microservice repo.',
    ].join('\n'),
    overlayPaths: AW_SHIP_FAST_PATHS,
    setup(workspaceDir) {
      writeFile(
        workspaceDir,
        '.aw_sdlc/profile.yml',
        [
          'version: 1',
          'extends: ghl-microservice-standard',
          '',
          'deploy:',
          '  modes:',
          '    staging:',
          '      pipeline: staging/job/team/job/contact-sync-api',
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
          '## Approved Execution Change',
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
            recommended_next_commands: ['/aw:execute', '/aw:ship'],
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
          '  modes:',
          '    staging:',
          '      pipeline: staging/job/team/job/contact-sync-api',
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
  for (const testCase of REAL_CASES) {
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

  const targetCaseId = process.env.AW_SDLC_REAL_CASE;
  const selectedCases = targetCaseId
    ? REAL_CASES.filter(testCase => testCase.id === targetCaseId)
    : REAL_CASES;

  if (targetCaseId && selectedCases.length === 0) {
    console.log(`FAIL unknown case id: ${targetCaseId}`);
    process.exit(1);
  }

  for (const testCase of selectedCases) {
    const workspace = createEvalWorkspace({
      repoRoot: REPO_ROOT,
      snapshot,
      caseId: testCase.id,
      overlayPaths: testCase.overlayPaths || AW_CONTEXT_PATHS,
      workspaceMode: testCase.workspaceMode,
    });

    try {
      testCase.setup(workspace.workspaceDir);
      const result = runPrompt(workspace.workspaceDir, testCase.prompt);

      if (test(testCase.id, () => {
        if (result.status !== 0) {
          throw new Error(`CLI exited with status ${result.status}\n${summarizeCliOutput(result.output)}`);
        }
        try {
          testCase.assert(workspace.workspaceDir);
        } catch (error) {
          throw new Error(`${error.message}\nCLI tail:\n${summarizeCliOutput(result.output)}`);
        }
      })) {
        passed++;
      } else {
        failed++;
      }
    } finally {
      workspace.cleanup();
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
