const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { REPO_ROOT } = require('./aw-sdlc-paths');

const WORKSPACE_ROOT = path.dirname(REPO_ROOT);
const FIXTURE_PATH = path.join(REPO_ROOT, 'tests/evals/fixtures/aw-revex-history-benchmark.json');
const ARTIFACTS_ROOT = path.join(REPO_ROOT, 'tests/evals/fixtures/revex-history');
const JUDGE_RUBRIC_PATH = path.join(REPO_ROOT, 'tests/evals/fixtures/aw-revex-history-judge-rubric.md');
const PACKS_PATH = path.join(REPO_ROOT, 'tests/evals/fixtures/aw-history-benchmark-packs.json');
const DEFAULT_PACK_KEY = 'revex';

const DEFAULT_LIMIT = Number(process.env.AW_REVEX_HISTORY_LIMIT || 20);
const MAX_SCAN_MULTIPLIER = 6;
const MAX_FILES_CHANGED = Number(process.env.AW_REVEX_HISTORY_MAX_FILES || 25);
const MAX_LINES_CHANGED = Number(process.env.AW_REVEX_HISTORY_MAX_LINES || 800);
const IGNORED_TYPES = new Set(['docs', 'chore', 'revert', 'merge', 'release']);

function resolveRepoPath(repoRelativePath) {
  return path.resolve(REPO_ROOT, repoRelativePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readFileIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function loadBenchmarkPacks() {
  return JSON.parse(fs.readFileSync(PACKS_PATH, 'utf8'));
}

function getSelectedBenchmarkPack() {
  const packsConfig = loadBenchmarkPacks();
  const requestedPackKey =
    process.env.AW_HISTORY_BENCHMARK_PACK ||
    process.env.AW_REVEX_HISTORY_PACK ||
    packsConfig.defaultPackKey ||
    DEFAULT_PACK_KEY;
  const selectedPack = (packsConfig.packs || []).find(pack => pack.packKey === requestedPackKey);

  if (!selectedPack) {
    throw new Error(`unknown history benchmark pack: ${requestedPackKey}`);
  }

  return selectedPack;
}

function runGit(repoPath, args) {
  return execFileSync('git', ['-C', repoPath, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trimEnd();
}

function fileExists(repoPath, gitObjectRef) {
  try {
    execFileSync('git', ['-C', repoPath, 'cat-file', '-e', gitObjectRef], {
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function parseSubject(subject) {
  const trimmed = String(subject || '').trim();
  const match = trimmed.match(/^([a-z]+)(?:\(([^)]+)\))?:\s*(.+)$/i);
  if (!match) {
    if (/^revert\b/i.test(trimmed)) {
      return { commitType: 'revert', commitScope: null, shortSubject: trimmed };
    }
    return { commitType: 'unknown', commitScope: null, shortSubject: trimmed };
  }

  return {
    commitType: match[1].toLowerCase(),
    commitScope: match[2] || null,
    shortSubject: match[3].trim(),
  };
}

function listRecentCommitShas(repoPath, limit) {
  const maxCount = Math.max(limit * MAX_SCAN_MULTIPLIER, limit);
  return runGit(repoPath, ['rev-list', '--max-count', String(maxCount), 'HEAD'])
    .split('\n')
    .map(value => value.trim())
    .filter(Boolean);
}

function readCommitSummary(repoPath, sha) {
  const pretty = runGit(repoPath, ['show', '--quiet', '--format=%H%n%P%n%cI%n%s', sha]).split('\n');
  const commitSha = pretty[0] || sha;
  const parentLine = pretty[1] || '';
  const commitDate = pretty[2] || '';
  const subject = pretty[3] || '';
  const parents = parentLine.trim() ? parentLine.trim().split(/\s+/) : [];
  const parentSha = parents[0] || null;

  const numstatLines = runGit(repoPath, ['show', '--numstat', '--format=', '--no-renames', sha])
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const changedFiles = [];
  let insertions = 0;
  let deletions = 0;

  for (const line of numstatLines) {
    const parts = line.split('\t');
    if (parts.length < 3) {
      continue;
    }

    const added = Number(parts[0]) || 0;
    const removed = Number(parts[1]) || 0;
    const filePath = parts[2];
    changedFiles.push({
      path: filePath,
      insertions: added,
      deletions: removed,
    });
    insertions += added;
    deletions += removed;
  }

  const parsed = parseSubject(subject);
  const parentAvailable = Boolean(parentSha) && fileExists(repoPath, `${parentSha}^{commit}`);
  const totalLinesChanged = insertions + deletions;

  return {
    sha: commitSha,
    parentSha,
    parentAvailable,
    commitDate,
    subject,
    commitType: parsed.commitType,
    commitScope: parsed.commitScope,
    shortSubject: parsed.shortSubject,
    changedFiles,
    fileCount: changedFiles.length,
    insertions,
    deletions,
    totalLinesChanged,
  };
}

function inferProductArea(summary) {
  for (const file of summary.changedFiles) {
    const appMatch = file.path.match(/^apps\/([^/]+)/);
    if (appMatch) {
      return appMatch[1];
    }
  }

  if (summary.commitScope) {
    return summary.commitScope;
  }

  return summary.commitType === 'unknown' ? 'revex' : summary.commitType;
}

function inferChangeKind(summary) {
  if (summary.commitType === 'fix') {
    return 'bugfix';
  }
  if (summary.commitType === 'feat') {
    return 'feature';
  }
  if (summary.commitType === 'refactor') {
    return 'refactor';
  }
  if (summary.commitType === 'test') {
    return 'test-hardening';
  }
  return 'implementation';
}

function inferRoute(summary) {
  if (summary.commitType === 'test') {
    return '/aw:test';
  }
  if (summary.commitType === 'fix') {
    return '/aw:investigate';
  }
  return '/aw:build';
}

function inferAffectedSurface(summary) {
  if (summary.commitScope) {
    return summary.commitScope;
  }

  const appPath = summary.changedFiles
    .map(file => file.path.match(/^apps\/([^/]+)\/(.+)$/))
    .find(Boolean);

  if (appPath) {
    return `${appPath[1]}:${appPath[2].split('/').slice(0, 2).join('/')}`;
  }

  return firstChangedPath(summary);
}

function inferPrimarySkill(route) {
  if (route === '/aw:test') {
    return 'aw-test';
  }
  if (route === '/aw:investigate') {
    return 'aw-investigate';
  }
  return 'aw-build';
}

function inferSupportingSkills(repo, summary) {
  const skills = new Set();

  if (repo.domain === 'frontend') {
    skills.add('frontend-ui-engineering');
    if (summary.changedFiles.some(file => /\.(vue|tsx|ts|js)$/.test(file.path))) {
      skills.add('browser-testing-with-devtools');
    }
  } else {
    skills.add('api-and-interface-design');
    skills.add('incremental-implementation');
  }

  if (summary.commitType === 'refactor') {
    skills.add('code-simplification');
  }
  if (summary.commitType === 'fix') {
    skills.add('documentation-and-adrs');
  }
  if (summary.commitType === 'test') {
    skills.add('documentation-and-adrs');
  }

  return [...skills];
}

function sanitizeCaseId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function makeCaseId(repo, summary) {
  return sanitizeCaseId(`${repo.repoKey}-${summary.sha.slice(0, 8)}-${summary.shortSubject || summary.subject}`);
}

function shouldIncludeCommit(summary) {
  if (!summary.parentSha || !summary.parentAvailable) {
    return { include: false, reason: 'missing_parent_commit' };
  }
  if (IGNORED_TYPES.has(summary.commitType)) {
    return { include: false, reason: `ignored_type:${summary.commitType}` };
  }
  if (summary.fileCount === 0) {
    return { include: false, reason: 'empty_diff' };
  }
  if (summary.fileCount > MAX_FILES_CHANGED) {
    return { include: false, reason: 'too_many_files' };
  }
  if (summary.totalLinesChanged > MAX_LINES_CHANGED) {
    return { include: false, reason: 'too_many_lines' };
  }
  return { include: true, reason: null };
}

function firstChangedPath(summary) {
  return summary.changedFiles[0]?.path || 'the affected flow';
}

function buildSuccessCriteria(repo, summary, route) {
  const criteria = [];

  if (summary.commitType === 'fix') {
    criteria.push(`resolve the user-visible or runtime issue in \`${inferAffectedSurface(summary)}\` without widening scope`);
    criteria.push('preserve adjacent behavior and existing contracts unless a narrow compatibility adjustment is required');
  } else if (summary.commitType === 'test') {
    criteria.push(`add automated proof around \`${inferAffectedSurface(summary)}\` that would fail before the change and pass after it`);
    criteria.push('keep the production behavior unchanged unless a small testability aid is necessary');
  } else if (summary.commitType === 'refactor') {
    criteria.push(`simplify or restructure \`${inferAffectedSurface(summary)}\` while preserving current behavior`);
    criteria.push('leave a reviewable change boundary with no unrelated cleanup');
  } else {
    criteria.push(`deliver the requested ${inferChangeKind(summary)} in \`${inferAffectedSurface(summary)}\` using the smallest reviewable slice`);
    criteria.push('stay within the touched product area and avoid unnecessary interface churn');
  }

  if (route === '/aw:investigate') {
    criteria.push('capture the failure mode or behavior gap clearly before proposing the patch');
  } else if (route === '/aw:test') {
    criteria.push('show targeted regression coverage or runtime proof for the affected surface');
  } else {
    criteria.push('include implementation evidence that ties directly to the touched files or flow');
  }

  return criteria;
}

function buildVerificationExpectations(repo, summary, route) {
  const expectations = [];

  expectations.push('record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow');

  if (summary.commitType === 'fix') {
    expectations.push('show a focused regression check or narrow supporting note that addresses the original failure mode');
  } else if (summary.commitType === 'test') {
    expectations.push('show the new or improved automated test coverage and why it closes the confidence gap');
  } else {
    expectations.push('show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces');
  }

  if (summary.changedFiles.some(file => /deploy|Jenkinsfile|helm|workflow/i.test(file.path))) {
    expectations.push('include delivery or rollout evidence for any release-path changes');
  }

  return expectations;
}

function buildTaskSummary(summary) {
  const affectedSurface = inferAffectedSurface(summary);
  const changeKind = inferChangeKind(summary);
  const shortSubject = summary.shortSubject || summary.subject;
  return `${changeKind} in ${affectedSurface}: ${shortSubject}`;
}

function buildForbiddenScope(summary) {
  return [
    `Avoid widening beyond \`${inferProductArea(summary)}\` unless the touched flow clearly requires it.`,
    `Prefer the historical changed surface: ${summary.changedFiles.map(file => `\`${file.path}\``).join(', ')}.`,
    'Do not rewrite unrelated shared interfaces or infrastructure without evidence from the sparse ticket.',
  ];
}

function buildObservedNeed(repo, summary, affectedSurface) {
  const productArea = inferProductArea(summary);

  if (summary.commitType === 'fix') {
    return `A user-facing or runtime bug has been reported around \`${affectedSurface}\` in RevEx ${repo.domain}, and the current behavior is not reliable enough to leave as-is.`;
  }

  if (summary.commitType === 'test') {
    return `The current coverage around \`${affectedSurface}\` in RevEx ${repo.domain} is not strong enough, so we need tighter automated proof before future changes land safely.`;
  }

  if (summary.commitType === 'refactor') {
    return `The implementation around \`${affectedSurface}\` in RevEx ${repo.domain} is carrying avoidable complexity that now needs cleanup without breaking stable behavior.`;
  }

  return `A product or engineering improvement is needed around \`${affectedSurface}\` in RevEx ${repo.domain}, inside the broader \`${productArea}\` area.`;
}

function buildUserPrompt(repo, summary, route, affectedSurface, successCriteria, verificationExpectations) {
  const changeKind = inferChangeKind(summary);
  const observedNeed = buildObservedNeed(repo, summary, affectedSurface);

  return [
    `You are working in RevEx ${repo.domain}.`,
    observedNeed,
    `Deliver the smallest safe ${changeKind} in \`${affectedSurface}\` using the expected AW route \`${route}\`.`,
    `Success criteria: ${successCriteria.join('; ')}.`,
    `Verification expectations: ${verificationExpectations.join('; ')}.`,
  ].join(' ');
}

function buildProblemStatement(pack, repo, summary, route) {
  const productArea = inferProductArea(summary);
  const shortSubject = summary.shortSubject || summary.subject;
  const affectedSurface = inferAffectedSurface(summary);
  const changeKind = inferChangeKind(summary);
  const observedNeed = buildObservedNeed(repo, summary, affectedSurface);
  const successCriteria = buildSuccessCriteria(repo, summary, route);
  const verificationExpectations = buildVerificationExpectations(repo, summary, route);
  const userPrompt = buildUserPrompt(repo, summary, route, affectedSurface, successCriteria, verificationExpectations);

  return [
    '# Sparse Ticket Prompt',
    '',
    '## Context',
    `Benchmark pack: ${pack.packLabel}`,
    `Repo: RevEx ${repo.domain}`,
    `Product area: \`${productArea}\``,
    `Affected surface: \`${affectedSurface}\``,
    `Change kind: \`${changeKind}\``,
    `Baseline theme: ${shortSubject}.`,
    '',
    '## Observed Need',
    observedNeed,
    '',
    '## Task',
    userPrompt,
    '',
    '## Success Criteria',
    ...successCriteria.map(item => `- ${item}`),
    '',
    '## Constraints',
    '- keep the scope narrow and reversible',
    '- preserve stable contracts where possible',
    '- do not assume a large rewrite is acceptable without evidence',
    '- keep the result reviewable against the stored baseline PR',
    `- prefer the smallest correct AW route; expected starting route: \`${route}\``,
    '',
    '## Verification Expectations',
    ...verificationExpectations.map(item => `- ${item}`),
  ].join('\n');
}

function buildBaselinePrMarkdown(pack, repo, summary, route, primarySkill, supportingSkills) {
  const title = summary.subject;
  const fileBullets = summary.changedFiles
    .slice(0, 10)
    .map(file => `- \`${file.path}\` (+${file.insertions} / -${file.deletions})`)
    .join('\n');

  const validationClues = [];
  if (summary.changedFiles.some(file => /test|spec/i.test(file.path))) {
    validationClues.push('- tests changed in the shipped baseline');
  } else {
    validationClues.push('- no explicit test-file changes were visible in the shipped baseline');
  }

  if (summary.changedFiles.some(file => /deploy|Jenkinsfile|helm|workflow/i.test(file.path))) {
    validationClues.push('- release or delivery-related files were part of the baseline change');
  }

  const riskNotes = [];
  if (summary.deletions > summary.insertions) {
    riskNotes.push('- baseline removed or simplified existing code paths');
  }
  if (summary.changedFiles.some(file => /controller|service|module|store|route/i.test(file.path))) {
    riskNotes.push('- baseline touched integration or orchestration boundaries');
  }
  if (riskNotes.length === 0) {
    riskNotes.push('- baseline remained within a narrow local change surface');
  }

  return [
    '# Baseline PR',
    '',
    '## Title',
    title,
    '',
    '## Problem Summary',
    `This shipped change addressed work around \`${inferProductArea(summary)}\` in RevEx ${repo.domain}.`,
    '',
    '## Baseline Route Expectation',
    `- route: \`${route}\``,
    `- primary skill: \`${primarySkill}\``,
    `- recommended supporting skills: ${supportingSkills.map(skill => `\`${skill}\``).join(', ')}`,
    `- comparison mode: \`${pack.comparisonMode}\``,
    '',
    '## Changed Files',
    fileBullets,
    '',
    '## Diff Summary',
    `- files changed: ${summary.fileCount}`,
    `- insertions: ${summary.insertions}`,
    `- deletions: ${summary.deletions}`,
    '',
    '## Validation Clues',
    ...validationClues,
    '',
    '## Risk Notes',
    ...riskNotes,
    '',
    '## Baseline Commit',
    `- repo: \`${repo.repoKey}\``,
    `- sha: \`${summary.sha}\``,
    `- parent: \`${summary.parentSha}\``,
    `- date: \`${summary.commitDate}\``,
  ].join('\n');
}

function buildBaselineMetadata(repo, summary, route, primarySkill, supportingSkills, warnings) {
  const affectedSurface = inferAffectedSurface(summary);
  const successCriteria = buildSuccessCriteria(repo, summary, route);
  const verificationExpectations = buildVerificationExpectations(repo, summary, route);
  const userPrompt = buildUserPrompt(repo, summary, route, affectedSurface, successCriteria, verificationExpectations);

  return {
    repoKey: repo.repoKey,
    repoRelativePath: repo.repoRelativePath,
    domain: repo.domain,
    productArea: inferProductArea(summary),
    promptLevel: 'sparse_ticket',
    changeKind: inferChangeKind(summary),
    affectedSurface,
    userPrompt,
    successCriteria,
    verificationExpectations,
    commit: {
      sha: summary.sha,
      parentSha: summary.parentSha,
      date: summary.commitDate,
      subject: summary.subject,
      type: summary.commitType,
      scope: summary.commitScope,
    },
    diffSummary: {
      fileCount: summary.fileCount,
      insertions: summary.insertions,
      deletions: summary.deletions,
      totalLinesChanged: summary.totalLinesChanged,
    },
    routeExpectation: {
      route,
      primarySkill,
      supportingSkills,
    },
    changedFiles: summary.changedFiles,
    reconstructionCommands: {
      showStat: `git -C ${repo.repoRelativePath} show --stat --summary ${summary.sha}`,
      showPatch: `git -C ${repo.repoRelativePath} show ${summary.sha}`,
      checkoutParent: `git -C ${repo.repoRelativePath} checkout ${summary.parentSha}`,
    },
    warnings,
  };
}

function buildTaskCard(pack, repo, summary, route, successCriteria, verificationExpectations) {
  return {
    taskSummary: buildTaskSummary(summary),
    taskType: inferChangeKind(summary),
    expectedSurface: inferAffectedSurface(summary),
    baselineChangedFiles: summary.changedFiles.map(file => file.path),
    successSignals: successCriteria,
    forbiddenScope: buildForbiddenScope(summary),
    comparisonMode: pack.comparisonMode,
    routeExpectation: route,
  };
}

function buildBaselineCard(summary) {
  return {
    title: summary.subject,
    commitSha: summary.sha,
    parentSha: summary.parentSha,
    changedFileCount: summary.fileCount,
    totalLinesChanged: summary.totalLinesChanged,
    changedFiles: summary.changedFiles.map(file => file.path),
  };
}

function writeCaseArtifacts(pack, repo, summary, route, primarySkill, supportingSkills, warnings) {
  const caseId = makeCaseId(repo, summary);
  const caseDir = path.join(ARTIFACTS_ROOT, caseId);
  const problemPath = path.join(caseDir, 'problem.md');
  const baselinePrPath = path.join(caseDir, 'baseline-pr.md');
  const baselineMetadataPath = path.join(caseDir, 'baseline-metadata.json');
  const affectedSurface = inferAffectedSurface(summary);
  const successCriteria = buildSuccessCriteria(repo, summary, route);
  const verificationExpectations = buildVerificationExpectations(repo, summary, route);
  const userPrompt = buildUserPrompt(repo, summary, route, affectedSurface, successCriteria, verificationExpectations);

  writeFile(problemPath, buildProblemStatement(pack, repo, summary, route));
  writeFile(baselinePrPath, buildBaselinePrMarkdown(pack, repo, summary, route, primarySkill, supportingSkills));
  writeFile(
    baselineMetadataPath,
    `${JSON.stringify(buildBaselineMetadata(repo, summary, route, primarySkill, supportingSkills, warnings), null, 2)}\n`
  );

  return {
    caseId,
    promptFields: {
      promptLevel: 'sparse_ticket',
      changeKind: inferChangeKind(summary),
      affectedSurface,
      userPrompt,
      successCriteria,
      verificationExpectations,
      taskCard: buildTaskCard(pack, repo, summary, route, successCriteria, verificationExpectations),
      baselineCard: buildBaselineCard(summary),
    },
    artifactPaths: {
      problem: path.relative(REPO_ROOT, problemPath),
      baselinePr: path.relative(REPO_ROOT, baselinePrPath),
      baselineMetadata: path.relative(REPO_ROOT, baselineMetadataPath),
    },
  };
}

function collectRepoCases(pack, repo, limit) {
  const repoPath = resolveRepoPath(repo.repoRelativePath);
  const repoWarnings = [];
  const repoSummary = {
    repoKey: repo.repoKey,
    domain: repo.domain,
    repoRelativePath: repo.repoRelativePath,
    repoPathExists: fs.existsSync(repoPath),
    shallow: false,
    visibleCommitCount: 0,
    selectedCaseCount: 0,
    warnings: repoWarnings,
  };

  if (!repoSummary.repoPathExists) {
    repoWarnings.push('repo_not_found');
    return { repoSummary, cases: [] };
  }

  repoSummary.shallow = runGit(repoPath, ['rev-parse', '--is-shallow-repository']) === 'true';
  repoSummary.visibleCommitCount = Number(runGit(repoPath, ['rev-list', '--count', 'HEAD'])) || 0;

  if (repoSummary.shallow) {
    repoWarnings.push('shallow_history_visible');
  }
  if (repoSummary.visibleCommitCount < limit) {
    repoWarnings.push(`visible_commit_count_below_target:${repoSummary.visibleCommitCount}`);
  }

  const selectedCases = [];
  const selectionFailures = {};

  for (const sha of listRecentCommitShas(repoPath, limit)) {
    if (selectedCases.length >= limit) {
      break;
    }

    const summary = readCommitSummary(repoPath, sha);
    const decision = shouldIncludeCommit(summary);
    if (!decision.include) {
      selectionFailures[decision.reason] = (selectionFailures[decision.reason] || 0) + 1;
      continue;
    }

    const route = inferRoute(summary);
    const primarySkill = inferPrimarySkill(route);
    const supportingSkills = inferSupportingSkills(repo, summary);
    const warnings = [];

    const { caseId, artifactPaths, promptFields } = writeCaseArtifacts(
      pack,
      repo,
      summary,
      route,
      primarySkill,
      supportingSkills,
      warnings
    );
    selectedCases.push({
      id: caseId,
      layer: 'history',
      packKey: pack.packKey,
      packLabel: pack.packLabel,
      comparisonMode: pack.comparisonMode,
      repoKey: repo.repoKey,
      domain: repo.domain,
      repoRelativePath: repo.repoRelativePath,
      productArea: inferProductArea(summary),
      commitSha: summary.sha,
      parentSha: summary.parentSha,
      commitDate: summary.commitDate,
      commitType: summary.commitType,
      commitScope: summary.commitScope,
      commitSubject: summary.subject,
      changedFileCount: summary.fileCount,
      insertions: summary.insertions,
      deletions: summary.deletions,
      changedFiles: summary.changedFiles.map(file => file.path),
      promptLevel: promptFields.promptLevel,
      changeKind: promptFields.changeKind,
      affectedSurface: promptFields.affectedSurface,
      taskCard: promptFields.taskCard,
      baselineCard: promptFields.baselineCard,
      userPrompt: promptFields.userPrompt,
      successCriteria: promptFields.successCriteria,
      verificationExpectations: promptFields.verificationExpectations,
      inferredRoute: route,
      expectedPrimarySkill: primarySkill,
      recommendedSupportingSkills: supportingSkills,
      storedArtifacts: artifactPaths,
      warnings,
    });
  }

  repoSummary.selectedCaseCount = selectedCases.length;

  for (const [reason, count] of Object.entries(selectionFailures)) {
    repoWarnings.push(`skipped_${reason}:${count}`);
  }

  if (selectedCases.length === 0) {
    repoWarnings.push('no_benchmarkable_commits_selected');
  }

  return { repoSummary, cases: selectedCases };
}

function generateRevexHistoryBenchmark(options = {}) {
  const requestedPerRepo = Number(options.requestedPerRepo || DEFAULT_LIMIT);
  const selectedPack = getSelectedBenchmarkPack();

  fs.rmSync(ARTIFACTS_ROOT, { recursive: true, force: true });
  ensureDir(ARTIFACTS_ROOT);

  const repoSummaries = [];
  const cases = [];

  for (const repo of selectedPack.repos) {
    const { repoSummary, cases: repoCases } = collectRepoCases(selectedPack, repo, requestedPerRepo);
    repoSummaries.push(repoSummary);
    cases.push(...repoCases);
  }

  const fixture = {
    schemaVersion: 'aw.eval.revex-history-benchmark.v3',
    benchmarkName: 'aw-revex-history-benchmark',
    packKey: selectedPack.packKey,
    packLabel: selectedPack.packLabel,
    comparisonMode: selectedPack.comparisonMode,
    requestedPerRepo,
    generatedAt: new Date().toISOString(),
    repos: repoSummaries,
    cases,
    judgeRubricPath: path.relative(REPO_ROOT, JUDGE_RUBRIC_PATH),
    packsPath: path.relative(REPO_ROOT, PACKS_PATH),
  };

  writeFile(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`);
  return fixture;
}

function loadRevexHistoryBenchmark() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

function buildJudgePrompt({ caseRecord, problemStatement, baselinePr, candidatePr }) {
  return [
    'You are judging an AW commit-reconstruction benchmark attempt.',
    'Compare the candidate PR artifact against the stored baseline PR for the same underlying shipped change.',
    'A candidate is allowed to score better than the baseline when the improvement is justified.',
    'This benchmark family is optimized for PR-output parity. Design-fidelity evals and UI-evidence evals are intentionally handled separately.',
    'Return strict JSON with keys: overall_score, verdict, dimensions, strengths, gaps, rationale.',
    'Dimensions must include: problem_coverage, correctness, scope_discipline, verification_quality, pr_quality, risk_posture.',
    '',
    `Case id: ${caseRecord.id}`,
    `Repo: ${caseRecord.repoKey}`,
    `Commit: ${caseRecord.commitSha}`,
    `Prompt level: ${caseRecord.promptLevel}`,
    `Change kind: ${caseRecord.changeKind}`,
    '',
    'Sparse ticket prompt:',
    problemStatement,
    '',
    'Baseline PR:',
    baselinePr,
    '',
    'Candidate PR:',
    candidatePr,
  ].join('\n');
}

module.exports = {
  ARTIFACTS_ROOT,
  DEFAULT_LIMIT,
  FIXTURE_PATH,
  JUDGE_RUBRIC_PATH,
  PACKS_PATH,
  buildJudgePrompt,
  generateRevexHistoryBenchmark,
  getSelectedBenchmarkPack,
  loadRevexHistoryBenchmark,
  loadBenchmarkPacks,
  resolveRepoPath,
};
