#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'aw-cross-harness-cli-cases.json');
const CLAUDE_EXPECT_PATH = path.join(__dirname, 'lib', 'claude-interactive-smoke.exp');
const DEFAULT_WORKSPACE = process.cwd();
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const RESULT_ROOT = process.env.AW_CLI_SMOKE_RESULT_DIR
  || path.join(REPO_ROOT, 'tests', 'results', `aw-cross-harness-cli-smoke-${TIMESTAMP}`);
const TIMEOUT_MS = Number(process.env.AW_CLI_SMOKE_TIMEOUT_MS || 120000);
const HARNESS_FILTER = new Set(
  String(process.env.AW_CLI_SMOKE_HARNESSES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const CASE_FILTER = new Set(
  String(process.env.AW_CLI_SMOKE_CASES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const HARNESSES = [
  {
    id: 'cursor',
    command: 'cursor-agent',
    args: (workspace, prompt) => [
      '--print',
      '--output-format', 'text',
      '--mode', 'ask',
      '--trust',
      '--workspace', workspace,
      prompt,
    ],
  },
  {
    id: 'codex',
    command: 'codex',
    args: (workspace, prompt, outputFile) => [
      'exec',
      '--skip-git-repo-check',
      '--ephemeral',
      '--sandbox', 'workspace-write',
      '--cd', workspace,
      '--output-last-message', outputFile,
      prompt,
    ],
    readsLastMessageFile: true,
  },
  {
    id: 'claude',
    command: 'expect',
    args: (workspace, _prompt, _outputFile, promptPath) => [
      CLAUDE_EXPECT_PATH,
      workspace,
      promptPath,
      String(Math.max(10, Math.floor(TIMEOUT_MS / 1000))),
    ],
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function findMissingCommands() {
  return HARNESSES
    .filter((harness) => HARNESS_FILTER.size === 0 || HARNESS_FILTER.has(harness.id))
    .filter((harness) => spawnSync('which', [harness.command], { encoding: 'utf8' }).status !== 0)
    .map((harness) => harness.command);
}

function readCases() {
  return JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
}

function sanitize(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function extractSelectedField(text, label) {
  const match = String(text).match(new RegExp(`^${label}:\\s*(.+)$`, 'mi'));
  return match ? match[1].trim() : null;
}

function extractLastMatchingField(text, regex, predicate) {
  const matches = [...String(text).matchAll(regex)].map((match) => (match[1] || '').trim());
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (!predicate || predicate(matches[index])) {
      return matches[index];
    }
  }
  return null;
}

function normalizeList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/^`+|`+$/g, '')
    .replace(/^"+|"+$/g, '')
    .replace(/^'+|'+$/g, '')
    .trim();
}

function stripAnsi(value) {
  return String(value || '').replace(
    // eslint-disable-next-line no-control-regex
    /\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g,
    '',
  );
}

function normalizeScreenText(value) {
  return stripAnsi(value)
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function canonicalizeStageSkill(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (/aw[-:]plan|platform-core-plan/i.test(token)) return 'aw-plan';
  if (/architecture-design|spec-writing|bootstrap-new-service|incremental-delivery/i.test(token)) return 'aw-plan';
  if (/aw[-:]investigate|aw[-:]debug|platform-core-investigate/i.test(token)) return 'aw-investigate';
  if (/observability|grafana|log-analysis|incident-report/i.test(token)) return 'aw-investigate';
  if (/aw[-:]review|platform-core-review/i.test(token)) return 'aw-review';
  if (/security-review|code-review-pr|reliability-review|maintainability-review|performance-review/i.test(token)) return 'aw-review';
  if (/aw[-:]deploy|platform-core-deploy/i.test(token)) return 'aw-deploy';
  if (/aw[-:]ship|platform-core-ship/i.test(token)) return 'aw-ship';
  if (/aw[-:]build|aw[-:]execute|platform-core-(build|execute)/i.test(token)) return 'aw-build';
  if (/aw[-:]test|aw[-:]verify|platform-core-(test|verify)/i.test(token)) return 'aw-test';
  return token;
}

function canonicalizeRoute(value) {
  const token = normalizeToken(value);
  if (!token) return '';
  if (/^\/aw:plan$/i.test(token) || /^plan$/i.test(token)) return '/aw:plan';
  if (/^\/aw:investigate$/i.test(token) || /^investigate$/i.test(token)) return '/aw:investigate';
  if (/^\/aw:review$/i.test(token) || /^review$/i.test(token)) return '/aw:review';
  if (/^\/aw:build$/i.test(token) || /^\/aw:execute$/i.test(token) || /^(build|execute)$/i.test(token)) return '/aw:build';
  if (/^\/aw:test$/i.test(token) || /^\/aw:verify$/i.test(token) || /^(test|verify)$/i.test(token)) return '/aw:test';
  if (/^\/aw:deploy$/i.test(token) || /^deploy$/i.test(token)) return '/aw:deploy';
  if (/^\/aw:ship$/i.test(token) || /^ship$/i.test(token)) return '/aw:ship';
  return token;
}

function evaluateCase({ harnessId, outputText, expectedRoute, expectedStageSkill }) {
  const cleanText = harnessId === 'claude' ? normalizeScreenText(outputText) : stripAnsi(outputText);
  const route = harnessId === 'claude'
    ? extractLastMatchingField(cleanText, /AW\s*Route:\s*([^\n]+)/gi, (value) => /\/aw:/.test(value))
    : extractSelectedField(cleanText, 'Selected AW Route');
  const stageSkill = harnessId === 'claude'
    ? extractLastMatchingField(cleanText, /Primary\s*Stage\s*Skill:\s*([^\n]+)/gi, (value) => /aw[-:]/i.test(value))
    : extractSelectedField(cleanText, 'Primary Stage Skill');
  const supportingSkills = normalizeList(extractSelectedField(cleanText, 'Supporting Skills')).map(normalizeToken);
  const consultedRulesRaw = harnessId === 'claude'
    ? extractLastMatchingField(cleanText, /Consulted\s*Rules:\s*([^\n]+)/gi)
    : extractSelectedField(cleanText, 'Consulted Rules');
  const consultedRules = normalizeList(consultedRulesRaw).map(normalizeToken);
  const normalizedRoute = canonicalizeRoute(route);
  let normalizedStageSkill = canonicalizeStageSkill(stageSkill);
  if (normalizedStageSkill === 'using-aw-skills') {
    const inferredFromSupporting = canonicalizeStageSkill(supportingSkills.join(', '));
    if (inferredFromSupporting && inferredFromSupporting !== 'using-aw-skills') {
      normalizedStageSkill = inferredFromSupporting;
    }
  }

  const rulesText = `${consultedRulesRaw || ''}\n${outputText}`;
  const checks = {
    routeDeclared: Boolean(route),
    stageSkillDeclared: Boolean(stageSkill),
    routeMatches: normalizedRoute === expectedRoute,
    stageSkillMatches: normalizedStageSkill === expectedStageSkill,
    usingAwSkillsMentioned: harnessId === 'claude'
      ? (
        /using-aw-skills/i.test(cleanText)
        || (
          /AW\s*Route:\s*\/aw:/i.test(cleanText)
          && (
            /Skill\(aw:[^)]+\)|Successfully loaded skill/i.test(cleanText)
            || (/Primary\s*Stage\s*Skill:\s*aw[-:]/i.test(cleanText) && /Consulted\s*Rules:/i.test(cleanText))
          )
        )
      )
      : (
        supportingSkills.includes('using-aw-skills')
        || /using-aw-skills/i.test(cleanText)
        || (
          /^\/aw:/.test(normalizedRoute)
          && consultedRules.length > 0
          && (/^aw-/.test(normalizedStageSkill) || supportingSkills.length > 0)
        )
      ),
    consultedRulesPresent: consultedRules.length > 0,
    universalRuleMentioned: /universal|AGENTS\.md|baseline-profiles/i.test(rulesText),
    securityRuleMentioned: /security|AGENTS\.md|baseline-profiles/i.test(rulesText),
  };

  const passed = harnessId === 'cursor'
    ? (
      checks.routeDeclared
      && checks.stageSkillDeclared
      && checks.routeMatches
      && checks.stageSkillMatches
      && checks.consultedRulesPresent
    )
    : harnessId === 'claude'
      ? (
        checks.routeDeclared
        && checks.stageSkillDeclared
        && checks.routeMatches
        && checks.stageSkillMatches
        && checks.usingAwSkillsMentioned
        && checks.consultedRulesPresent
        && checks.universalRuleMentioned
        && checks.securityRuleMentioned
      )
    : Object.values(checks).every(Boolean);

  return {
    selectedRoute: normalizedRoute,
    selectedStageSkill: normalizedStageSkill,
    supportingSkills,
    consultedRules,
    checks,
    passed,
  };
}

function runHarnessCase(harness, testCase, workspace) {
  const caseDir = path.join(RESULT_ROOT, harness.id, sanitize(testCase.id));
  ensureDir(caseDir);

  const stdoutPath = path.join(caseDir, 'stdout.txt');
  const stderrPath = path.join(caseDir, 'stderr.txt');
  const promptPath = path.join(caseDir, 'prompt.txt');
  const metaPath = path.join(caseDir, 'meta.json');
  const verdictPath = path.join(caseDir, 'verdict.json');
  const lastMessagePath = path.join(caseDir, 'last-message.txt');

  fs.writeFileSync(promptPath, `${testCase.prompt}\n`, 'utf8');

  const args = harness.args(workspace, testCase.prompt, lastMessagePath, promptPath);
  const startedAt = Date.now();
  const result = spawnSync(harness.command, args, {
    cwd: workspace,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
  });
  const durationMs = Date.now() - startedAt;

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  fs.writeFileSync(stdoutPath, stdout, 'utf8');
  fs.writeFileSync(stderrPath, stderr, 'utf8');

  let outputText = stdout.trim();
  if (harness.readsLastMessageFile && fs.existsSync(lastMessagePath)) {
    outputText = fs.readFileSync(lastMessagePath, 'utf8').trim();
  }

  const verdict = evaluateCase({
    harnessId: harness.id,
    outputText,
    expectedRoute: testCase.expectedRoute,
    expectedStageSkill: testCase.expectedStageSkill,
  });

  const meta = {
    harness: harness.id,
    caseId: testCase.id,
    command: harness.command,
    args,
    cwd: workspace,
    exitCode: result.status,
    signal: result.signal,
    error: result.error ? result.error.message : null,
    durationMs,
    outputSource: harness.readsLastMessageFile ? 'last-message-file' : 'stdout',
  };

  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
  fs.writeFileSync(verdictPath, JSON.stringify(verdict, null, 2), 'utf8');

  return {
    harness: harness.id,
    caseId: testCase.id,
    meta,
    verdict,
  };
}

function isSuccessfulResult(result) {
  if (!result.verdict.passed) return false;
  if (result.meta.exitCode === 0) return true;
  return result.harness === 'claude' && /ETIMEDOUT/i.test(result.meta.error || '');
}

function printSummary(results) {
  console.log('\n=== AW Cross-Harness CLI Smoke ===\n');
  for (const result of results) {
    const status = isSuccessfulResult(result) ? 'PASS' : 'FAIL';
    console.log(`${status} ${result.harness} :: ${result.caseId}`);
    console.log(`  route: ${result.verdict.selectedRoute || '(missing)'}`);
    console.log(`  stage: ${result.verdict.selectedStageSkill || '(missing)'}`);
    console.log(`  using-aw-skills: ${result.verdict.checks.usingAwSkillsMentioned ? 'yes' : 'no'}`);
    console.log(`  universal rule: ${result.verdict.checks.universalRuleMentioned ? 'yes' : 'no'}`);
    console.log(`  security rule: ${result.verdict.checks.securityRuleMentioned ? 'yes' : 'no'}`);
    if (result.meta.exitCode !== 0 || result.meta.error) {
      console.log(`  process: exit=${result.meta.exitCode} error=${result.meta.error || 'none'}`);
    }
  }
}

function writeSummary(results) {
  const byHarness = {};
  for (const result of results) {
    if (!byHarness[result.harness]) byHarness[result.harness] = { total: 0, passed: 0, failed: 0 };
    byHarness[result.harness].total += 1;
    if (isSuccessfulResult(result)) {
      byHarness[result.harness].passed += 1;
    } else {
      byHarness[result.harness].failed += 1;
    }
  }

  const summary = {
    workspace: DEFAULT_WORKSPACE,
    resultRoot: RESULT_ROOT,
    generatedAt: new Date().toISOString(),
    timeoutMs: TIMEOUT_MS,
    byHarness,
    results: results.map((result) => ({
      harness: result.harness,
      caseId: result.caseId,
      exitCode: result.meta.exitCode,
      error: result.meta.error,
      passed: isSuccessfulResult(result),
      selectedRoute: result.verdict.selectedRoute,
      selectedStageSkill: result.verdict.selectedStageSkill,
      checks: result.verdict.checks,
    })),
  };

  fs.writeFileSync(path.join(RESULT_ROOT, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  return summary;
}

function main() {
  ensureDir(RESULT_ROOT);

  const missing = findMissingCommands();
  if (missing.length > 0) {
    console.error(`Missing required CLI(s): ${missing.join(', ')}`);
    process.exit(1);
  }

  const cases = readCases();
  const results = [];
  const selectedHarnesses = HARNESSES.filter((harness) => HARNESS_FILTER.size === 0 || HARNESS_FILTER.has(harness.id));
  const selectedCases = cases.filter((testCase) => CASE_FILTER.size === 0 || CASE_FILTER.has(testCase.id));

  for (const harness of selectedHarnesses) {
    for (const testCase of selectedCases) {
      results.push(runHarnessCase(harness, testCase, DEFAULT_WORKSPACE));
    }
  }

  printSummary(results);
  const summary = writeSummary(results);
  const failed = Object.values(summary.byHarness).some((entry) => entry.failed > 0);
  console.log(`\nArtifacts: ${RESULT_ROOT}`);
  process.exit(failed ? 1 : 0);
}

main();
