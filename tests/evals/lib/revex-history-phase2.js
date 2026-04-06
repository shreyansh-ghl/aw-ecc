const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { createRepoSnapshot } = require('./repo-snapshot');
const { REPO_ROOT } = require('./aw-sdlc-paths');
const {
  buildJudgePrompt,
  FIXTURE_PATH,
  JUDGE_RUBRIC_PATH,
  getSelectedBenchmarkPack,
  loadRevexHistoryBenchmark,
  resolveRepoPath,
} = require('./revex-history-benchmark');

const REF = process.env.AW_SDLC_EVAL_REF || 'WORKTREE';
const CLI = process.env.AW_SDLC_EVAL_CLI || 'codex';
const TIMEOUT_MS = Number(process.env.AW_REVEX_HISTORY_TIMEOUT_MS || process.env.AW_SDLC_EVAL_TIMEOUT_MS || 240000);
const CANDIDATE_REASONING_EFFORT =
  process.env.AW_REVEX_HISTORY_CANDIDATE_REASONING_EFFORT ||
  process.env.AW_SDLC_EVAL_REASONING_EFFORT ||
  'low';
const JUDGE_REASONING_EFFORT = process.env.AW_REVEX_HISTORY_JUDGE_REASONING_EFFORT || 'medium';
const CANDIDATE_MODEL = process.env.AW_REVEX_HISTORY_CANDIDATE_MODEL || '';
const JUDGE_MODEL = process.env.AW_REVEX_HISTORY_JUDGE_MODEL || '';
const KEEP_WORKSPACE = process.env.AW_REVEX_HISTORY_KEEP_WORKSPACE === '1';
const RESULTS_ROOT = path.join(REPO_ROOT, 'tests', 'results');
const RESULT_DIR = process.env.AW_REVEX_HISTORY_RESULT_DIR
  ? path.resolve(process.env.AW_REVEX_HISTORY_RESULT_DIR)
  : path.join(RESULTS_ROOT, 'benchmark-runs', `revex-history-${timestamp()}`);
const RUN_LEDGER_PATH = path.join(RESULTS_ROOT, 'history-benchmark-run-ledger.jsonl');
const SCOREBOARD_JSON_PATH = path.join(RESULTS_ROOT, 'history-benchmark-scoreboard.json');
const SCOREBOARD_MD_PATH = path.join(RESULTS_ROOT, 'history-benchmark-scoreboard.md');
const CANDIDATE_SCHEMA_PATH = path.join(REPO_ROOT, 'tests/evals/schemas/aw-revex-history-candidate-output.schema.json');
const JUDGE_SCHEMA_PATH = path.join(REPO_ROOT, 'tests/evals/schemas/aw-revex-history-judge-output.schema.json');
const SMOKE_PRESET_CASE_IDS = [...(getSelectedBenchmarkPack().smokeCaseIds || [])];

const CORE_OVERLAY_PATHS = [
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
  'skills/aw-deploy/SKILL.md',
  'skills/aw-ship/SKILL.md',
  'skills/aw-yolo/SKILL.md',
  'skills/aw-execute/SKILL.md',
  'skills/aw-verify/SKILL.md',
  'skills/aw-debug/SKILL.md',
  'skills/aw-brainstorm/SKILL.md',
  'skills/aw-finish/SKILL.md',
  'docs/aw-sdlc-command-contracts.md',
  'docs/aw-sdlc-command-skill-architecture.md',
  'docs/aw-sdlc-verify-deploy-configuration.md',
  'defaults/aw-sdlc/baseline-profiles.yml',
];

function timestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('');
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRepoRelative(filePath) {
  return path.relative(REPO_ROOT, filePath);
}

function roundMetric(value) {
  return Number(Number(value || 0).toFixed(3));
}

function listReferenceOverlayPaths() {
  const referencesDir = path.join(REPO_ROOT, 'references');
  if (!fs.existsSync(referencesDir)) {
    return [];
  }

  return fs.readdirSync(referencesDir)
    .filter(entry => entry.endsWith('.md'))
    .map(entry => `references/${entry}`);
}

function buildOverlayPaths(caseRecord) {
  const paths = new Set([...CORE_OVERLAY_PATHS, ...listReferenceOverlayPaths()]);
  for (const skillName of caseRecord.recommendedSupportingSkills || []) {
    const skillPath = `skills/${skillName}/SKILL.md`;
    if (fs.existsSync(path.join(REPO_ROOT, skillPath))) {
      paths.add(skillPath);
    }
  }
  return [...paths];
}

function protectOverlayFiles(workspaceDir, overlayPaths) {
  for (const relativePath of overlayPaths) {
    const absolutePath = path.join(workspaceDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    try {
      fs.chmodSync(absolutePath, 0o444);
    } catch {
      // Best-effort only. Some files may already be read-only or managed by the OS.
    }
    if (process.platform === 'darwin') {
      try {
        execFileSync('chflags', ['uchg', absolutePath], {
          stdio: 'ignore',
        });
      } catch {
        // Best-effort only. Some filesystems may not support immutable flags.
      }
    }
  }
}

function restoreOverlayFiles(workspaceDir, overlayPaths) {
  for (const relativePath of overlayPaths) {
    const absolutePath = path.join(workspaceDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    if (process.platform === 'darwin') {
      try {
        execFileSync('chflags', ['nouchg', absolutePath], {
          stdio: 'ignore',
        });
      } catch {
        // Best-effort only.
      }
    }
    try {
      fs.chmodSync(absolutePath, 0o644);
    } catch {
      // Best-effort only.
    }
  }
}

function cloneCaseWorkspace(caseRecord, snapshot, runDir) {
  const sourceRepoRoot = resolveRepoPath(caseRecord.repoRelativePath);
  const workspaceDir = path.join(runDir, 'workspaces', caseRecord.id);
  ensureDir(path.dirname(workspaceDir));
  execFileSync('git', ['clone', '--local', '--quiet', sourceRepoRoot, workspaceDir], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspaceDir, 'checkout', '--quiet', caseRecord.parentSha], {
    stdio: 'ignore',
  });
  snapshot.materializePaths(workspaceDir, buildOverlayPaths(caseRecord));
  return workspaceDir;
}

function commitWorkspaceBaseline(workspaceDir) {
  execFileSync('git', ['-C', workspaceDir, 'config', 'user.name', 'AW Eval'], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspaceDir, 'config', 'user.email', 'aw-eval@example.com'], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspaceDir, 'config', 'core.fileMode', 'false'], {
    stdio: 'ignore',
  });

  const status = runGit(workspaceDir, ['status', '--short']);
  if (!status.trim()) {
    return;
  }

  execFileSync('git', ['-C', workspaceDir, 'add', '-A'], {
    stdio: 'ignore',
  });
  execFileSync('git', ['-C', workspaceDir, 'commit', '--quiet', '-m', 'eval: revex history baseline'], {
    stdio: 'ignore',
  });
}

function relativeFeatureRoot(caseRecord) {
  return `.aw_docs/features/${caseRecord.id}`;
}

function expectedStageArtifacts(caseRecord) {
  const featureRoot = relativeFeatureRoot(caseRecord);
  if (caseRecord.inferredRoute === '/aw:investigate') {
    return [`${featureRoot}/investigation.md`, `${featureRoot}/state.json`];
  }
  if (caseRecord.inferredRoute === '/aw:test') {
    return [`${featureRoot}/verification.md`, `${featureRoot}/state.json`];
  }
  return [`${featureRoot}/execution.md`, `${featureRoot}/state.json`];
}

function candidateArtifactPaths(caseRecord) {
  const featureRoot = relativeFeatureRoot(caseRecord);
  return {
    featureRoot,
    stageArtifacts: expectedStageArtifacts(caseRecord),
    candidatePr: `${featureRoot}/candidate-pr.md`,
    candidateSummary: `${featureRoot}/candidate-summary.json`,
    inputBrief: `${featureRoot}/revex-input.md`,
  };
}

function buildFocusedFileContext(workspaceDir, caseRecord) {
  const likelyScopeHints = (caseRecord.changedFiles || []).slice(0, 2);
  const sections = [];
  const relatedI18nKeys = new Set();

  for (const relativePath of likelyScopeHints) {
    const absolutePath = path.join(workspaceDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    if (isLocaleFilePath(relativePath)) {
      continue;
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    for (const i18nKey of extractI18nKeys(fileContent)) {
      relatedI18nKeys.add(i18nKey);
    }
  }

  for (const relativePath of likelyScopeHints) {
    const absolutePath = path.join(workspaceDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    const lineCount = fileContent.split('\n').length;
    if (lineCount > 260 || fileContent.length > 14000) {
      const largeFileExcerpt = buildLargeFileExcerpt(relativePath, fileContent, [...relatedI18nKeys]);
      if (largeFileExcerpt) {
        sections.push(largeFileExcerpt);
        continue;
      }
      sections.push(`- \`${relativePath}\` exists in the workspace. Open this file first before searching elsewhere.`);
      continue;
    }

    const extension = path.extname(relativePath).slice(1) || 'text';
    sections.push(
      [
        `File to inspect first: \`${relativePath}\``,
        `Current content at commit^ (${lineCount} lines):`,
        `\`\`\`${extension}`,
        fileContent.trimEnd(),
        '```',
      ].join('\n')
    );
  }

  return sections.join('\n\n');
}

function isLocaleFilePath(relativePath) {
  return /(^|\/)(locales?|i18n)\//i.test(relativePath) || /\/locales?\//i.test(relativePath);
}

function extractI18nKeys(fileContent) {
  const matches = fileContent.matchAll(/\b(?:t|\$t)\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
  return [...new Set(Array.from(matches, match => match[1]).filter(Boolean))];
}

function buildLargeFileExcerpt(relativePath, fileContent, relatedI18nKeys) {
  if (!isLocaleFilePath(relativePath) || !relatedI18nKeys.length) {
    return '';
  }

  const lines = fileContent.split('\n');
  const matchingLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (relatedI18nKeys.some(i18nKey => line.includes(`"${i18nKey.split('.').pop()}"`) || line.includes(`"${i18nKey}"`))) {
      matchingLines.push(`${index + 1}: ${line}`);
    }
    if (matchingLines.length >= 8) {
      break;
    }
  }

  if (!matchingLines.length) {
    return '';
  }

  return [
    `File to inspect early: \`${relativePath}\``,
    'Relevant locale excerpt derived from translation keys already used in the focused component:',
    '```json',
    matchingLines.join('\n'),
    '```',
  ].join('\n');
}

function buildCaseProfile(caseRecord, workspaceDir) {
  const likelyScopeHints = (caseRecord.changedFiles || []).slice(0, 5);
  const localeFiles = likelyScopeHints.filter(isLocaleFilePath);
  const focusedSourceFiles = likelyScopeHints.filter(relativePath => !isLocaleFilePath(relativePath));
  const i18nKeys = new Set();

  for (const relativePath of focusedSourceFiles) {
    const absolutePath = path.join(workspaceDir, relativePath);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }
    const fileContent = fs.readFileSync(absolutePath, 'utf8');
    for (const key of extractI18nKeys(fileContent)) {
      i18nKeys.add(key);
    }
  }

  const commitSubject = String(caseRecord.commitSubject || '');
  const isTextOrCopyCase =
    caseRecord.domain === 'frontend' &&
    (
      localeFiles.length > 0 ||
      /\b(text|copy|wording|label|labels|message|messages|tooltip|title|titles|translation|translations|locale|locales|typo|placeholder)\b/i.test(commitSubject) ||
      Array.from(i18nKeys).some(key => /\b(label|title|description|message|copy|text)\b/i.test(key))
    );

  return {
    caseId: caseRecord.id,
    domain: caseRecord.domain,
    route: caseRecord.inferredRoute,
    changeKind: caseRecord.changeKind,
    likelyScopeHints,
    localeFiles,
    focusedSourceFiles,
    i18nKeys: [...i18nKeys],
    isTextOrCopyCase,
    validationExpectation: 'pr_output_parity_evidence',
  };
}

function buildCommitBodyClues(caseRecord) {
  try {
    const repoPath = resolveRepoPath(caseRecord.repoRelativePath);
    const body = runGit(repoPath, ['show', '--quiet', '--format=%b', caseRecord.commitSha]);
    const lines = body
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .filter(line => !/^made-with:/i.test(line))
      .slice(0, 8);

    if (!lines.length) {
      return '';
    }

    return [
      'Historical task clues derived from the shipped commit message:',
      ...lines.map(line => `- ${line.replace(/^-+\s*/, '')}`),
    ].join('\n');
  } catch {
    return '';
  }
}

function sanitizeCommitTheme(subject) {
  return String(subject || '')
    .replace(/\s*\(#\d+\)\s*$/i, '')
    .trim();
}

function buildCondensedTaskSummary(caseRecord) {
  const supportingSkills = (caseRecord.recommendedSupportingSkills || []).map(item => `\`${item}\``);
  return [
    'Benchmark task summary:',
    `- repo: \`${caseRecord.repoKey}\``,
    `- product area: \`${caseRecord.productArea}\``,
    `- change kind: \`${caseRecord.changeKind}\``,
    `- target route: \`${caseRecord.inferredRoute}\``,
    `- primary skill: \`${caseRecord.expectedPrimarySkill}\``,
    supportingSkills.length ? `- supporting skills to apply inline: ${supportingSkills.join(', ')}` : '',
    `- theme: ${sanitizeCommitTheme(caseRecord.commitSubject)}`,
    ...(caseRecord.successCriteria || []).map(item => `- success: ${item}`),
    ...(caseRecord.verificationExpectations || []).map(item => `- verify: ${item}`),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildImplementationBiasHints(caseRecord) {
  const subject = String(caseRecord.commitSubject || '');
  const changedFiles = caseRecord.changedFiles || [];
  const hasLocaleFile = changedFiles.some(filePath => /(^|\/)(locales?|i18n)\//i.test(filePath) || /\/locales?\//i.test(filePath));
  const isCopyOrTextTask =
    /\b(text|copy|wording|label|labels|message|messages|tooltip|title|titles|translation|translations|locale|locales|typo|placeholder)\b/i.test(subject) ||
    hasLocaleFile;

  if (!isCopyOrTextTask) {
    return '';
  }

  return [
    'Interpretation hints for this benchmark case:',
    '- The benchmark clues suggest a user-visible copy or text change, not a framework cleanup.',
    '- Prioritize visible wording, localized strings, and rendered text over unrelated component refactors.',
    hasLocaleFile
      ? '- A locale or translation file is inside the likely scope. Inspect that file before deciding the task is component-only.'
      : '- If a nearby locale or translation file exists, inspect it before deciding the task is component-only.',
    '- Do not spend the main patch budget on Vue cleanup, event declarations, or internal refactors unless the ticket evidence clearly requires them.',
  ].join('\n');
}

function buildCandidatePrompt(caseRecord, sparsePrompt, workspaceDir) {
  const artifacts = candidateArtifactPaths(caseRecord);
  const likelyScopeHints = (caseRecord.changedFiles || []).slice(0, 5);
  const focusedFileContext = buildFocusedFileContext(workspaceDir, caseRecord);
  const commitBodyClues = buildCommitBodyClues(caseRecord);
  const condensedTaskSummary = buildCondensedTaskSummary(caseRecord);
  const implementationBiasHints = buildImplementationBiasHints(caseRecord);
  return [
    'Use the compact AW stage contract below for this benchmark run. Do not spend time rereading commands/skills unless you are genuinely blocked.',
    'This is a RevEx history benchmark candidate-generation run inside an isolated workspace.',
    'The current workspace is a clone of the target product repo checked out to commit^ for a real shipped change.',
    `Use feature slug \`${caseRecord.id}\`.`,
    'Do real work in the product repo.',
    'Allowed write scope: product source files, product tests, and `.aw_docs/features/<feature_slug>/` for this case only.',
    'Treat the AW overlay and benchmark harness as read-only context.',
    'Do not modify `AGENTS.md`, `agents.md`, `commands/`, `skills/`, `docs/`, `defaults/`, `references/`, `tests/`, or any benchmark fixture or schema file.',
    'Do not inspect git history or the shipped commit as an oracle. Work only from the current commit^ workspace state and the benchmark clues in this prompt.',
    'Do not run `git show`, `git log`, `git blame`, or similar history lookups for this benchmark case.',
    'Do not rewrite AW instructions to make the task easier. Adapt within the product repo instead.',
    likelyScopeHints.length
      ? `Start with these likely historical scope paths before doing any broader search: ${likelyScopeHints.map(item => `\`${item}\``).join(', ')}. Only expand to nearby siblings if the first inspection is insufficient.`
      : 'Stay tightly focused on the most likely affected surface instead of searching the whole repo.',
    `Start with the AW route \`${caseRecord.inferredRoute}\` and only deviate if the first inspection proves that route cannot satisfy the task.`,
    'Do not spend multiple cycles on broad discovery. Inspect, implement, validate, and write artifacts.',
    'Compact AW build-stage contract for this run:',
    '- inspect the provided target file and only nearby imports/siblings if needed',
    '- implement the smallest safe local change that satisfies the benchmark task',
    '- run at most one narrow validation command for the touched surface',
    '- if no fast local validation is obvious after one or two quick checks, stop searching and record the validation limitation in the artifacts',
    '- do not create brand-new test scaffolding for this benchmark unless a nearby worker spec already exists and is trivial to adapt',
    `- write \`${artifacts.featureRoot}/execution.md\` with problem, changes, validation, and risks`,
    `- write \`${artifacts.featureRoot}/state.json\` with route, primary skill, supporting skills, status, and artifact paths`,
    `- write \`${artifacts.candidatePr}\` and \`${artifacts.candidateSummary}\` before stopping`,
    condensedTaskSummary,
    implementationBiasHints,
    commitBodyClues,
    focusedFileContext ? `Focused workspace context:\n\n${focusedFileContext}` : '',
    'You must:',
    `1. implement the candidate solution in source files when needed for the task`,
    '2. run one fast targeted validation command, or explicitly record why no fast validation was available',
    `3. write the required AW stage artifacts under \`${artifacts.featureRoot}/\``,
    `4. write \`${artifacts.candidatePr}\` with sections: Title, Problem Summary, Route Used, Changed Files, Validation, Risks, Notes`,
    `5. write \`${artifacts.candidateSummary}\` as JSON with: status, routeUsed, primarySkill, supportingSkills, candidatePrPath, stageArtifacts, validationSummary, notes`,
    'Stop after the stage artifacts and candidate PR artifacts are written.',
    `Original sparse ticket is already saved at \`${artifacts.inputBrief}\` if you need to confirm wording, but do not reread it unless blocked.`,
  ].join('\n');
}

function listWorkspaceDiffFiles(workspaceDir) {
  try {
    return runGit(workspaceDir, ['diff', '--name-only'])
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function splitChangedFiles(caseRecord, changedFiles) {
  const featurePrefix = `${relativeFeatureRoot(caseRecord)}/`;
  const artifactFiles = changedFiles.filter(relativePath => relativePath.startsWith(featurePrefix));
  const candidateChangedFiles = changedFiles.filter(relativePath => !relativePath.startsWith(featurePrefix));

  return {
    artifactFiles,
    candidateChangedFiles,
  };
}

function buildResultCard({
  runId,
  caseRecord,
  changedFiles,
  candidateSummary,
  judgeSummary,
  qualityRepairStatus,
  qualityReport,
  caseResultDir,
}) {
  const { artifactFiles, candidateChangedFiles } = splitChangedFiles(caseRecord, changedFiles);
  const baselineChangedFiles = caseRecord.changedFiles || [];
  const baselineSet = new Set(baselineChangedFiles);
  const candidateSet = new Set(candidateChangedFiles);
  const overlappingFiles = candidateChangedFiles.filter(relativePath => baselineSet.has(relativePath));
  const missedBaselineFiles = baselineChangedFiles.filter(relativePath => !candidateSet.has(relativePath));
  const extraFilesTouched = candidateChangedFiles.filter(relativePath => !baselineSet.has(relativePath));
  const surfaceRecallRate = baselineChangedFiles.length
    ? roundMetric(overlappingFiles.length / baselineChangedFiles.length)
    : 0;
  const surfacePrecisionRate = candidateChangedFiles.length
    ? roundMetric(overlappingFiles.length / candidateChangedFiles.length)
    : 0;

  return {
    schemaVersion: 'aw.eval.history-benchmark-result-card.v1',
    runId,
    generatedAt: new Date().toISOString(),
    packKey: caseRecord.packKey,
    packLabel: caseRecord.packLabel,
    comparisonMode: caseRecord.comparisonMode,
    caseId: caseRecord.id,
    repoKey: caseRecord.repoKey,
    domain: caseRecord.domain,
    productArea: caseRecord.productArea,
    baselineCommitSha: caseRecord.commitSha,
    baselineParentSha: caseRecord.parentSha,
    taskSummary: caseRecord.taskCard?.taskSummary || caseRecord.commitSubject,
    taskType: caseRecord.taskCard?.taskType || caseRecord.changeKind,
    expectedSurface: caseRecord.taskCard?.expectedSurface || caseRecord.affectedSurface,
    expectedPublicRoute: caseRecord.inferredRoute,
    expectedPrimarySkill: caseRecord.expectedPrimarySkill,
    expectedSupportingSkills: caseRecord.recommendedSupportingSkills || [],
    routeUsed: candidateSummary.routeUsed || caseRecord.inferredRoute,
    primarySkillUsed: candidateSummary.primarySkill || caseRecord.expectedPrimarySkill,
    supportingSkillsUsed: candidateSummary.supportingSkills || [],
    baselineChangedFiles,
    candidateChangedFiles,
    artifactFilesWritten: artifactFiles,
    surfaceOverlapCount: overlappingFiles.length,
    surfaceRecallRate,
    surfacePrecisionRate,
    missedBaselineFiles,
    extraFilesTouched,
    qualityRepairStatus,
    openQualityGapCount: qualityReport.gaps.length,
    openQualityGaps: qualityReport.gaps.map(gap => gap.message),
    overallScore: judgeSummary.overall_score,
    verdict: judgeSummary.verdict,
    strengths: judgeSummary.strengths || [],
    topGaps: judgeSummary.gaps || [],
    candidatePrPath: toRepoRelative(path.join(caseResultDir, 'candidate-pr.md')),
    baselinePrPath: caseRecord.storedArtifacts.baselinePr,
    candidateSummaryPath: toRepoRelative(path.join(caseResultDir, 'candidate-summary.json')),
    judgeOutputPath: toRepoRelative(path.join(caseResultDir, 'judge-output.json')),
    resultDir: toRepoRelative(caseResultDir),
  };
}

function readLedgerEntries() {
  if (!fs.existsSync(RUN_LEDGER_PATH)) {
    return [];
  }

  return fs.readFileSync(RUN_LEDGER_PATH, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function aggregateEntries(entries) {
  if (!entries.length) {
    return {
      runCount: 0,
      averageScore: 0,
      latestScore: 0,
      latestVerdict: null,
      latestRunId: null,
      roughlyEqualOrBetterRate: 0,
      averageSurfaceRecallRate: 0,
      averageSurfacePrecisionRate: 0,
      verdictCounts: {},
    };
  }

  const latest = [...entries].sort((left, right) => String(right.generatedAt).localeCompare(String(left.generatedAt)))[0];
  const verdictCounts = {};
  let totalScore = 0;
  let totalRecall = 0;
  let totalPrecision = 0;
  let roughlyEqualOrBetterCount = 0;

  for (const entry of entries) {
    totalScore += Number(entry.overallScore || 0);
    totalRecall += Number(entry.surfaceRecallRate || 0);
    totalPrecision += Number(entry.surfacePrecisionRate || 0);
    verdictCounts[entry.verdict] = (verdictCounts[entry.verdict] || 0) + 1;
    if (entry.verdict === 'roughly_equal_to_baseline' || entry.verdict === 'better_than_baseline') {
      roughlyEqualOrBetterCount += 1;
    }
  }

  return {
    runCount: entries.length,
    averageScore: roundMetric(totalScore / entries.length),
    latestScore: Number(latest.overallScore || 0),
    latestVerdict: latest.verdict || null,
    latestRunId: latest.runId || null,
    roughlyEqualOrBetterRate: roundMetric(roughlyEqualOrBetterCount / entries.length),
    averageSurfaceRecallRate: roundMetric(totalRecall / entries.length),
    averageSurfacePrecisionRate: roundMetric(totalPrecision / entries.length),
    verdictCounts,
  };
}

function buildScoreboard(entries) {
  const packs = {};
  const repos = {};
  const cases = {};

  for (const entry of entries) {
    packs[entry.packKey] = packs[entry.packKey] || [];
    repos[entry.repoKey] = repos[entry.repoKey] || [];
    cases[entry.caseId] = cases[entry.caseId] || [];
    packs[entry.packKey].push(entry);
    repos[entry.repoKey].push(entry);
    cases[entry.caseId].push(entry);
  }

  const serializeGroups = groups =>
    Object.fromEntries(
      Object.entries(groups).map(([key, groupEntries]) => [key, aggregateEntries(groupEntries)])
    );

  const caseRows = Object.values(cases)
    .map(groupEntries => {
      const latest = [...groupEntries].sort((left, right) => String(right.generatedAt).localeCompare(String(left.generatedAt)))[0];
      const aggregate = aggregateEntries(groupEntries);

      return {
        caseId: latest.caseId,
        packKey: latest.packKey,
        repoKey: latest.repoKey,
        taskSummary: latest.taskSummary,
        runCount: aggregate.runCount,
        latestScore: aggregate.latestScore,
        bestScore: Math.max(...groupEntries.map(entry => Number(entry.overallScore || 0))),
        averageScore: aggregate.averageScore,
        latestVerdict: aggregate.latestVerdict,
        roughlyEqualOrBetterRate: aggregate.roughlyEqualOrBetterRate,
        averageSurfaceRecallRate: aggregate.averageSurfaceRecallRate,
        averageSurfacePrecisionRate: aggregate.averageSurfacePrecisionRate,
        lastCandidatePrPath: latest.candidatePrPath,
        lastBaselinePrPath: latest.baselinePrPath,
        topGaps: latest.topGaps,
      };
    })
    .sort((left, right) => left.caseId.localeCompare(right.caseId));

  return {
    schemaVersion: 'aw.eval.history-benchmark-scoreboard.v1',
    generatedAt: new Date().toISOString(),
    ledgerPath: toRepoRelative(RUN_LEDGER_PATH),
    totalCaseRuns: entries.length,
    packs: serializeGroups(packs),
    repos: serializeGroups(repos),
    cases: caseRows,
  };
}

function renderScoreboardMarkdown(scoreboard) {
  const packRows = Object.entries(scoreboard.packs)
    .map(([packKey, value]) => `| ${packKey} | ${value.runCount} | ${value.averageScore} | ${value.latestScore} | ${value.roughlyEqualOrBetterRate} | ${value.averageSurfaceRecallRate} | ${value.averageSurfacePrecisionRate} |`)
    .join('\n');
  const repoRows = Object.entries(scoreboard.repos)
    .map(([repoKey, value]) => `| ${repoKey} | ${value.runCount} | ${value.averageScore} | ${value.latestScore} | ${value.roughlyEqualOrBetterRate} | ${value.averageSurfaceRecallRate} | ${value.averageSurfacePrecisionRate} |`)
    .join('\n');
  const caseRows = scoreboard.cases
    .map(caseRow => `| ${caseRow.caseId} | ${caseRow.repoKey} | ${caseRow.runCount} | ${caseRow.latestScore} | ${caseRow.bestScore} | ${caseRow.latestVerdict} | ${caseRow.averageSurfaceRecallRate} | ${caseRow.averageSurfacePrecisionRate} |`)
    .join('\n');

  return [
    '# History Benchmark Scoreboard',
    '',
    `Generated at: ${scoreboard.generatedAt}`,
    `Ledger: \`${scoreboard.ledgerPath}\``,
    `Total case runs: ${scoreboard.totalCaseRuns}`,
    '',
    '## Packs',
    '',
    '| Pack | Runs | Avg score | Latest score | >= roughly equal | Avg recall | Avg precision |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    packRows || '| none | 0 | 0 | 0 | 0 | 0 | 0 |',
    '',
    '## Repos',
    '',
    '| Repo | Runs | Avg score | Latest score | >= roughly equal | Avg recall | Avg precision |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    repoRows || '| none | 0 | 0 | 0 | 0 | 0 | 0 |',
    '',
    '## Cases',
    '',
    '| Case | Repo | Runs | Latest score | Best score | Latest verdict | Avg recall | Avg precision |',
    '| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |',
    caseRows || '| none | none | 0 | 0 | 0 | none | 0 | 0 |',
    '',
  ].join('\n');
}

function persistHistoryLedger(resultCards) {
  ensureDir(path.dirname(RUN_LEDGER_PATH));
  for (const resultCard of resultCards) {
    fs.appendFileSync(RUN_LEDGER_PATH, `${JSON.stringify(resultCard)}\n`, 'utf8');
  }

  const entries = readLedgerEntries();
  const scoreboard = buildScoreboard(entries);
  writeFile(SCOREBOARD_JSON_PATH, `${JSON.stringify(scoreboard, null, 2)}\n`);
  writeFile(SCOREBOARD_MD_PATH, `${renderScoreboardMarkdown(scoreboard)}\n`);
  return scoreboard;
}

function hasSuccessfulValidation(candidateSummary) {
  const validations = candidateSummary && Array.isArray(candidateSummary.validationSummary)
    ? candidateSummary.validationSummary
    : [];
  if (!validations.length) {
    return false;
  }

  return validations.some(item => {
    const value = String(item || '').toLowerCase();
    if (!value.trim()) {
      return false;
    }
    return !/(fail|failed|could not|unable|unavailable|not available|did not|no .*evidence|was not available)/i.test(value);
  });
}

function runCommandCapture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
  });

  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

function runSystemValidationFallback(workspaceDir, caseRecord, profile, caseResultDir) {
  const outputs = [];
  const diffCheck = runCommandCapture('git', ['-C', workspaceDir, 'diff', '--check'], workspaceDir);
  outputs.push([
    `Command: ${diffCheck.command}`,
    `Exit: ${diffCheck.status ?? diffCheck.signal ?? 'unknown'}`,
    diffCheck.stdout.trim(),
    diffCheck.stderr.trim(),
  ].filter(Boolean).join('\n'));

  if (profile.isTextOrCopyCase && profile.localeFiles.length && profile.i18nKeys.length) {
    for (const relativePath of profile.localeFiles) {
      const absolutePath = path.join(workspaceDir, relativePath);
      if (!fs.existsSync(absolutePath)) {
        continue;
      }
      const excerpt = buildLargeFileExcerpt(relativePath, fs.readFileSync(absolutePath, 'utf8'), profile.i18nKeys);
      if (excerpt) {
        outputs.push(excerpt);
      }
    }
  }

  const systemValidationPath = path.join(caseResultDir, 'system-validation.txt');
  writeFile(systemValidationPath, `${outputs.join('\n\n')}\n`);
  return {
    systemValidationPath,
    diffCheckClean: diffCheck.status === 0,
  };
}

function analyzeQualityGaps({ caseRecord, profile, workspaceDir, candidateSummary, candidatePr, executionArtifact }) {
  const changedFiles = listWorkspaceDiffFiles(workspaceDir);
  const gaps = [];

  if (profile.isTextOrCopyCase && profile.localeFiles.length) {
    const touchedLocaleFiles = profile.localeFiles.filter(relativePath => changedFiles.includes(relativePath));
    if (touchedLocaleFiles.length === 0) {
      gaps.push({
        id: 'missing_locale_touch',
        message: `Likely copy/text case has scoped locale files (${profile.localeFiles.join(', ')}) but the candidate did not touch them.`,
      });
    }
  }

  if (!hasSuccessfulValidation(candidateSummary)) {
    gaps.push({
      id: 'missing_successful_validation',
      message: 'Candidate artifacts do not show a successful validation command or equivalent proof.',
    });
  }

  return {
    changedFiles,
    gaps,
  };
}

function buildQualityRepairPrompt(caseRecord, profile, qualityReport, systemValidation) {
  const candidatePaths = candidateArtifactPaths(caseRecord);
  const gapLines = qualityReport.gaps.map(gap => `- ${gap.id}: ${gap.message}`);
  const likelyFiles = [...profile.focusedSourceFiles, ...profile.localeFiles]
    .map(relativePath => `\`${relativePath}\``)
    .join(', ');

  const instructions = [
    'Continue the same RevEx benchmark case from the current workspace state.',
    'This is a system-triggered quality repair pass, not a fresh implementation.',
    `Quality gaps detected:\n${gapLines.join('\n')}`,
    likelyFiles ? `Focus only on these files unless one nearby import is absolutely necessary: ${likelyFiles}.` : '',
    systemValidation.inlineSummary ? `System validation clues:\n${systemValidation.inlineSummary}` : '',
    'Do not reopen broad repo discovery.',
    'Do not change the route or rewrite the whole solution.',
  ];

  if (qualityReport.gaps.some(gap => gap.id === 'missing_locale_touch')) {
    instructions.push(
      'This looks like a text/copy task. Inspect the likely locale file(s) and fix user-visible wording there if the current candidate only changed layout or spacing.',
      'Prefer wording, translation, or locale-backed fixes over framework cleanup.'
    );
  }

  if (qualityReport.gaps.some(gap => gap.id === 'missing_successful_validation')) {
    instructions.push(
      'Run one narrow validation command that can realistically succeed in this workspace. Prefer simple PR-parity evidence such as `git diff --check`, a focused grep, or another small successful check over a failing unavailable tool.'
    );
  }

  instructions.push(
    `Rewrite \`${candidatePaths.stageArtifacts[0]}\`, \`${candidatePaths.candidatePr}\`, and \`${candidatePaths.candidateSummary}\` so they reflect the repaired state.`,
    'Stop after the repaired artifacts are written.'
  );

  return instructions.filter(Boolean).join('\n');
}

function runCodexExec({ cwd, prompt, schemaPath, outputPath, sandboxMode, fullAuto = true, jsonEventsPath = null }) {
  ensureDir(path.dirname(outputPath));
  const selectedModel = fullAuto ? CANDIDATE_MODEL : JUDGE_MODEL;
  const args = [
    'exec',
    '--disable',
    'plugins',
    '--ephemeral',
    '--color',
    'never',
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    '-c',
    `model_reasoning_effort="${fullAuto ? CANDIDATE_REASONING_EFFORT : JUDGE_REASONING_EFFORT}"`,
    '-s',
    sandboxMode,
    '-C',
    cwd,
  ];

  if (selectedModel) {
    args.push('-m', selectedModel);
  }

  if (jsonEventsPath) {
    ensureDir(path.dirname(jsonEventsPath));
    args.push('--json');
  }

  if (fullAuto) {
    args.push('--full-auto');
  }

  args.push(prompt);

  const result = spawnSync(CLI, args, {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
  });

  if (jsonEventsPath) {
    writeFile(jsonEventsPath, result.stdout || '');
  }

  return {
    status: result.status,
    signal: result.signal,
    output: `${result.stdout || ''}\n${result.stderr || ''}`.trim(),
  };
}

function summarizeCliOutput(output) {
  const normalized = String(output || '').trim();
  if (!normalized) {
    return '[no CLI output captured]';
  }
  const maxLength = 4000;
  return normalized.length > maxLength ? normalized.slice(normalized.length - maxLength) : normalized;
}

function findIllegalHistoryLookups(eventsText) {
  const illegalPatterns = [
    /\bgit\s+show\b/i,
    /\bgit\s+log\b/i,
    /\bgit\s+blame\b/i,
    /\bgit\s+rev-list\b/i,
  ];

  return String(eventsText || '')
    .split('\n')
    .filter(line => illegalPatterns.some(pattern => pattern.test(line)));
}

function missingArtifacts(workspaceDir, relativePaths) {
  return relativePaths.filter(relativePath => !fs.existsSync(path.join(workspaceDir, relativePath)));
}

function workspaceHasChanges(workspaceDir) {
  return Boolean(runGit(workspaceDir, ['status', '--short']));
}

function assertFilesExist(workspaceDir, relativePaths) {
  const missing = missingArtifacts(workspaceDir, relativePaths);
  if (missing.length) {
    throw new Error(`required artifact was not created: ${missing[0]}`);
  }
}

function copyIfExists(sourcePath, destinationPath) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
  return true;
}

function runGit(workspaceDir, args) {
  return execFileSync('git', ['-C', workspaceDir, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function isProtectedOverlayPath(relativePath) {
  return (
    relativePath === 'AGENTS.md' ||
    relativePath === 'agents.md' ||
    relativePath.startsWith('commands/') ||
    relativePath.startsWith('skills/') ||
    relativePath.startsWith('docs/') ||
    relativePath.startsWith('defaults/') ||
    relativePath.startsWith('references/') ||
    relativePath.startsWith('tests/')
  );
}

function findIllegalWrites(workspaceDir, caseRecord) {
  const allowedFeaturePrefix = `${relativeFeatureRoot(caseRecord)}/`;
  const changedFiles = runGit(workspaceDir, ['diff', '--name-only'])
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  return changedFiles.filter(relativePath => {
    if (relativePath.startsWith(allowedFeaturePrefix)) {
      return false;
    }
    return isProtectedOverlayPath(relativePath);
  });
}

function writeWorkspaceDiagnostics(caseRecord, workspaceDir, caseResultDir) {
  const diffStat = runGit(workspaceDir, ['diff', '--stat']);
  const changedFiles = runGit(workspaceDir, ['diff', '--name-only']);
  const shortStatus = runGit(workspaceDir, ['status', '--short']);
  writeFile(path.join(caseResultDir, 'workspace-diff-stat.txt'), `${diffStat}\n`);
  writeFile(path.join(caseResultDir, 'workspace-changed-files.txt'), `${changedFiles}\n`);
  writeFile(path.join(caseResultDir, 'workspace-status.txt'), `${shortStatus}\n`);
  writeFile(
    path.join(caseResultDir, 'case-manifest.json'),
    `${JSON.stringify(
      {
        caseId: caseRecord.id,
        repoKey: caseRecord.repoKey,
        parentSha: caseRecord.parentSha,
        expectedRoute: caseRecord.inferredRoute,
        expectedPrimarySkill: caseRecord.expectedPrimarySkill,
        workspaceDir,
      },
      null,
      2
    )}\n`
  );
}

function loadSparsePrompt(caseRecord) {
  return fs.readFileSync(path.join(REPO_ROOT, caseRecord.storedArtifacts.problem), 'utf8');
}

function loadBaselinePr(caseRecord) {
  return fs.readFileSync(path.join(REPO_ROOT, caseRecord.storedArtifacts.baselinePr), 'utf8');
}

function loadJudgeRubric() {
  return fs.readFileSync(JUDGE_RUBRIC_PATH, 'utf8');
}

function buildJudgeInstructions(caseRecord, sparsePrompt, baselinePr, candidatePr) {
  return [
    loadJudgeRubric().trim(),
    '',
    buildJudgePrompt({
      caseRecord,
      problemStatement: sparsePrompt,
      baselinePr,
      candidatePr,
    }),
  ].join('\n');
}

function buildArtifactRecoveryPrompt(caseRecord, missingPaths) {
  return [
    'Continue the previously started RevEx benchmark run in this same isolated workspace.',
    `Original route expectation: ${caseRecord.inferredRoute}`,
    `Missing artifacts: ${missingPaths.map(item => `\`${item}\``).join(', ')}`,
    'Do not reopen broad discovery or reread long docs.',
    'Do not rewrite the implementation unless a missing artifact absolutely requires one more narrow validation command.',
    'Use the current workspace diff and current `.aw_docs` directory as the source of truth.',
    'Allowed write scope remains: product source files, product tests, and `.aw_docs/features/<feature_slug>/` only.',
    'Do not modify `AGENTS.md`, `agents.md`, `commands/`, `skills/`, `docs/`, `defaults/`, `references/`, `tests/`, or benchmark fixtures.',
    'Write only the missing benchmark artifacts now, including candidate-pr.md and candidate-summary.json if they are absent.',
    'If the AW stage artifact is missing, write it now with evidence from the current workspace state.',
    'Stop once the missing files exist.',
  ].join('\n');
}

function selectCases(fixture) {
  const targetCaseId = process.env.AW_REVEX_HISTORY_CASE_ID || '';
  if (targetCaseId) {
    return fixture.cases.filter(caseRecord => caseRecord.id === targetCaseId);
  }

  const preset = process.env.AW_REVEX_HISTORY_PRESET || '';
  if (preset === 'smoke') {
    return SMOKE_PRESET_CASE_IDS
      .map(caseId => fixture.cases.find(caseRecord => caseRecord.id === caseId))
      .filter(Boolean);
  }

  const maxCases = Number(process.env.AW_REVEX_HISTORY_MAX_CASES || 1);
  return fixture.cases.slice(0, Math.max(maxCases, 1));
}

function runCase(caseRecord, snapshot, runDir) {
  const caseResultDir = path.join(runDir, caseRecord.id);
  ensureDir(caseResultDir);
  const workspaceDir = cloneCaseWorkspace(caseRecord, snapshot, runDir);
  const runId = path.basename(runDir);
  const overlayPaths = buildOverlayPaths(caseRecord);
  const sparsePrompt = loadSparsePrompt(caseRecord);
  const candidatePaths = candidateArtifactPaths(caseRecord);
  const candidateOutputPath = path.join(caseResultDir, 'candidate-output.json');
  const judgeOutputPath = path.join(caseResultDir, 'judge-output.json');
  const candidateLastMessagePath = path.join(caseResultDir, 'candidate-last-message.json');
  const judgeLastMessagePath = path.join(caseResultDir, 'judge-last-message.json');
  const artifactsToCopy = {
    problem: path.join(REPO_ROOT, caseRecord.storedArtifacts.problem),
    baselinePr: path.join(REPO_ROOT, caseRecord.storedArtifacts.baselinePr),
    baselineMetadata: path.join(REPO_ROOT, caseRecord.storedArtifacts.baselineMetadata),
  };

  try {
    writeFile(path.join(workspaceDir, candidatePaths.inputBrief), `${sparsePrompt}\n`);
    commitWorkspaceBaseline(workspaceDir);
    protectOverlayFiles(workspaceDir, overlayPaths);
    copyIfExists(artifactsToCopy.problem, path.join(caseResultDir, 'problem.md'));
    copyIfExists(artifactsToCopy.baselinePr, path.join(caseResultDir, 'baseline-pr.md'));
    copyIfExists(artifactsToCopy.baselineMetadata, path.join(caseResultDir, 'baseline-metadata.json'));

    const candidatePrompt = buildCandidatePrompt(caseRecord, sparsePrompt, workspaceDir);
    const candidateRun = runCodexExec({
      cwd: workspaceDir,
      prompt: candidatePrompt,
      schemaPath: CANDIDATE_SCHEMA_PATH,
      outputPath: candidateLastMessagePath,
      sandboxMode: 'workspace-write',
      fullAuto: true,
      jsonEventsPath: path.join(caseResultDir, 'candidate-events.jsonl'),
    });
    const candidateEventsText = fs.readFileSync(path.join(caseResultDir, 'candidate-events.jsonl'), 'utf8');

    writeFile(path.join(caseResultDir, 'candidate-cli-output.txt'), `${summarizeCliOutput(candidateRun.output)}\n`);

    const illegalHistoryLookups = findIllegalHistoryLookups(candidateEventsText);
    if (illegalHistoryLookups.length) {
      writeFile(path.join(caseResultDir, 'illegal-history-lookups.txt'), `${illegalHistoryLookups.join('\n')}\n`);
      throw new Error('candidate used git history or shipped commit lookups, which is disallowed for RevEx reconstruction');
    }

    let missingAfterCandidate = missingArtifacts(workspaceDir, [
      ...candidatePaths.stageArtifacts,
      candidatePaths.candidatePr,
      candidatePaths.candidateSummary,
    ]);

    const candidateProducedChanges = workspaceHasChanges(workspaceDir);
    if (candidateRun.status !== 0 && !candidateProducedChanges) {
      throw new Error(`candidate generation failed with status ${candidateRun.status || candidateRun.signal || 'unknown'}`);
    }

    const illegalWrites = findIllegalWrites(workspaceDir, caseRecord);
    if (illegalWrites.length) {
      writeFile(path.join(caseResultDir, 'illegal-write-paths.txt'), `${illegalWrites.join('\n')}\n`);
      throw new Error(`candidate modified protected AW overlay files: ${illegalWrites.join(', ')}`);
    }

    if (candidateRun.status !== 0 || missingAfterCandidate.length) {
      const recoveryOutputPath = path.join(caseResultDir, 'candidate-recovery-last-message.json');
      const recoveryRun = runCodexExec({
        cwd: workspaceDir,
        prompt: buildArtifactRecoveryPrompt(caseRecord, missingAfterCandidate),
        schemaPath: CANDIDATE_SCHEMA_PATH,
        outputPath: recoveryOutputPath,
        sandboxMode: 'workspace-write',
        fullAuto: true,
        jsonEventsPath: path.join(caseResultDir, 'candidate-recovery-events.jsonl'),
      });
      writeFile(path.join(caseResultDir, 'candidate-recovery-cli-output.txt'), `${summarizeCliOutput(recoveryRun.output)}\n`);
      if (recoveryRun.status !== 0) {
        throw new Error(`artifact recovery failed with status ${recoveryRun.status || 'unknown'}`);
      }
      const illegalWritesAfterRecovery = findIllegalWrites(workspaceDir, caseRecord);
      if (illegalWritesAfterRecovery.length) {
        writeFile(path.join(caseResultDir, 'illegal-write-paths.txt'), `${illegalWritesAfterRecovery.join('\n')}\n`);
        throw new Error(`artifact recovery modified protected AW overlay files: ${illegalWritesAfterRecovery.join(', ')}`);
      }
      if (recoveryRun.status !== 0) {
        throw new Error(`artifact recovery failed with status ${recoveryRun.status || recoveryRun.signal || 'unknown'}`);
      }
      missingAfterCandidate = missingArtifacts(workspaceDir, [
        ...candidatePaths.stageArtifacts,
        candidatePaths.candidatePr,
        candidatePaths.candidateSummary,
      ]);
    }

    assertFilesExist(workspaceDir, [...candidatePaths.stageArtifacts, candidatePaths.candidatePr, candidatePaths.candidateSummary]);

    const profile = buildCaseProfile(caseRecord, workspaceDir);
    writeFile(path.join(caseResultDir, 'case-profile.json'), `${JSON.stringify(profile, null, 2)}\n`);

    let candidateSummary = readJson(path.join(workspaceDir, candidatePaths.candidateSummary));
    let candidatePr = fs.readFileSync(path.join(workspaceDir, candidatePaths.candidatePr), 'utf8');
    let executionArtifact = fs.existsSync(path.join(workspaceDir, candidatePaths.stageArtifacts[0]))
      ? fs.readFileSync(path.join(workspaceDir, candidatePaths.stageArtifacts[0]), 'utf8')
      : '';

    const systemValidation = runSystemValidationFallback(workspaceDir, caseRecord, profile, caseResultDir);
    const systemValidationText = fs.readFileSync(systemValidation.systemValidationPath, 'utf8');
    systemValidation.inlineSummary = systemValidationText
      .split('\n')
      .slice(0, 20)
      .join('\n')
      .trim();

    let qualityReport = analyzeQualityGaps({
      caseRecord,
      profile,
      workspaceDir,
      candidateSummary,
      candidatePr,
      executionArtifact,
    });

    let qualityRepairStatus = 'not_needed';
    if (qualityReport.gaps.length) {
      const qualityRepairOutputPath = path.join(caseResultDir, 'candidate-quality-repair-last-message.json');
      const qualityRepairRun = runCodexExec({
        cwd: workspaceDir,
        prompt: buildQualityRepairPrompt(caseRecord, profile, qualityReport, systemValidation),
        schemaPath: CANDIDATE_SCHEMA_PATH,
        outputPath: qualityRepairOutputPath,
        sandboxMode: 'workspace-write',
        fullAuto: true,
        jsonEventsPath: path.join(caseResultDir, 'candidate-quality-repair-events.jsonl'),
      });
      writeFile(path.join(caseResultDir, 'candidate-quality-repair-cli-output.txt'), `${summarizeCliOutput(qualityRepairRun.output)}\n`);
      const illegalWritesAfterQualityRepair = findIllegalWrites(workspaceDir, caseRecord);
      if (illegalWritesAfterQualityRepair.length) {
        writeFile(path.join(caseResultDir, 'illegal-write-paths.txt'), `${illegalWritesAfterQualityRepair.join('\n')}\n`);
        throw new Error(`quality repair modified protected AW overlay files: ${illegalWritesAfterQualityRepair.join(', ')}`);
      }
      qualityRepairStatus = qualityRepairRun.status === 0 ? 'applied' : `failed:${qualityRepairRun.status || qualityRepairRun.signal || 'unknown'}`;

      candidateSummary = readJson(path.join(workspaceDir, candidatePaths.candidateSummary));
      candidatePr = fs.readFileSync(path.join(workspaceDir, candidatePaths.candidatePr), 'utf8');
      executionArtifact = fs.existsSync(path.join(workspaceDir, candidatePaths.stageArtifacts[0]))
        ? fs.readFileSync(path.join(workspaceDir, candidatePaths.stageArtifacts[0]), 'utf8')
        : '';

      qualityReport = analyzeQualityGaps({
        caseRecord,
        profile,
        workspaceDir,
        candidateSummary,
        candidatePr,
        executionArtifact,
      });
    }

    writeFile(
      path.join(caseResultDir, 'quality-gates.json'),
      `${JSON.stringify(
        {
          qualityRepairStatus,
          profile,
          changedFiles: qualityReport.changedFiles,
          gaps: qualityReport.gaps,
        },
        null,
        2
      )}\n`
    );

    writeFile(candidateOutputPath, `${JSON.stringify(candidateSummary, null, 2)}\n`);
    copyIfExists(path.join(workspaceDir, candidatePaths.candidatePr), path.join(caseResultDir, 'candidate-pr.md'));
    copyIfExists(path.join(workspaceDir, candidatePaths.candidateSummary), path.join(caseResultDir, 'candidate-summary.json'));
    for (const stageArtifact of candidatePaths.stageArtifacts) {
      copyIfExists(path.join(workspaceDir, stageArtifact), path.join(caseResultDir, path.basename(stageArtifact)));
    }

    const judgeRun = runCodexExec({
      cwd: REPO_ROOT,
      prompt: buildJudgeInstructions(caseRecord, sparsePrompt, loadBaselinePr(caseRecord), candidatePr),
      schemaPath: JUDGE_SCHEMA_PATH,
      outputPath: judgeLastMessagePath,
      sandboxMode: 'read-only',
      fullAuto: false,
      jsonEventsPath: path.join(caseResultDir, 'judge-events.jsonl'),
    });

    writeFile(path.join(caseResultDir, 'judge-cli-output.txt'), `${summarizeCliOutput(judgeRun.output)}\n`);

    if (judgeRun.status !== 0) {
      throw new Error(`judge run failed with status ${judgeRun.status || 'unknown'}`);
    }

    const judgeSummary = readJson(judgeLastMessagePath);
    writeFile(judgeOutputPath, `${JSON.stringify(judgeSummary, null, 2)}\n`);
    writeWorkspaceDiagnostics(caseRecord, workspaceDir, caseResultDir);
    const changedFiles = qualityReport.changedFiles || listWorkspaceDiffFiles(workspaceDir);
    const resultCard = buildResultCard({
      runId,
      caseRecord,
      changedFiles,
      candidateSummary,
      judgeSummary,
      qualityRepairStatus,
      qualityReport,
      caseResultDir,
    });
    writeFile(path.join(caseResultDir, 'result-card.json'), `${JSON.stringify(resultCard, null, 2)}\n`);

    return {
      caseId: caseRecord.id,
      repoKey: caseRecord.repoKey,
      packKey: caseRecord.packKey,
      verdict: judgeSummary.verdict,
      overallScore: judgeSummary.overall_score,
      resultDir: caseResultDir,
      workspaceDir,
      candidateSummary,
      judgeSummary,
      resultCard,
    };
  } finally {
    restoreOverlayFiles(workspaceDir, overlayPaths);
    if (!KEEP_WORKSPACE) {
      fs.rmSync(workspaceDir, { recursive: true, force: true });
    }
  }
}

function runRevexHistoryPhase2() {
  const snapshot = createRepoSnapshot(REPO_ROOT, REF);
  const fixture = loadRevexHistoryBenchmark();
  const selectedCases = selectCases(fixture);

  if (selectedCases.length === 0) {
    throw new Error('no RevEx history cases selected');
  }

  ensureDir(RESULT_DIR);
  writeFile(
    path.join(RESULT_DIR, 'run-manifest.json'),
    `${JSON.stringify(
      {
        benchmarkFixture: path.relative(REPO_ROOT, FIXTURE_PATH),
        packKey: fixture.packKey,
        packLabel: fixture.packLabel,
        comparisonMode: fixture.comparisonMode,
        resultsDir: RESULT_DIR,
        selectedCaseIds: selectedCases.map(caseRecord => caseRecord.id),
        keepWorkspace: KEEP_WORKSPACE,
        cli: CLI,
        candidateModel: CANDIDATE_MODEL || null,
        judgeModel: JUDGE_MODEL || null,
        candidateReasoningEffort: CANDIDATE_REASONING_EFFORT,
        judgeReasoningEffort: JUDGE_REASONING_EFFORT,
        timeoutMs: TIMEOUT_MS,
      },
      null,
      2
    )}\n`
  );

  const results = selectedCases.map(caseRecord => runCase(caseRecord, snapshot, RESULT_DIR));
  const scoreboard = persistHistoryLedger(results.map(result => result.resultCard));
  writeFile(
    path.join(RESULT_DIR, 'summary.json'),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        packKey: fixture.packKey,
        packLabel: fixture.packLabel,
        comparisonMode: fixture.comparisonMode,
        caseCount: results.length,
        ledgerPath: toRepoRelative(RUN_LEDGER_PATH),
        scoreboardJsonPath: toRepoRelative(SCOREBOARD_JSON_PATH),
        scoreboardMarkdownPath: toRepoRelative(SCOREBOARD_MD_PATH),
        cases: results.map(result => ({
          caseId: result.caseId,
          packKey: result.packKey,
          repoKey: result.repoKey,
          verdict: result.verdict,
          overallScore: result.overallScore,
          resultDir: result.resultDir,
          resultCardPath: toRepoRelative(path.join(result.resultDir, 'result-card.json')),
        })),
        scoreboardSnapshot: {
          totalCaseRuns: scoreboard.totalCaseRuns,
          pack: scoreboard.packs[fixture.packKey] || null,
        },
      },
      null,
      2
    )}\n`
  );

  return {
    resultDir: RESULT_DIR,
    results,
    scoreboard,
  };
}

module.exports = {
  RESULT_DIR,
  SMOKE_PRESET_CASE_IDS,
  buildOverlayPaths,
  candidateArtifactPaths,
  expectedStageArtifacts,
  runRevexHistoryPhase2,
  selectCases,
};
