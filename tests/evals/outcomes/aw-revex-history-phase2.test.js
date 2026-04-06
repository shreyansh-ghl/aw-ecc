const fs = require('fs');
const path = require('path');
const { runRevexHistoryPhase2 } = require('../lib/revex-history-phase2');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

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
  console.log('\n=== AW RevEx History Phase 2 ===\n');

  let passed = 0;
  let failed = 0;

  let runResult;
  if (test('selected RevEx cases can generate candidate PR artifacts and judge outputs', () => {
    runResult = runRevexHistoryPhase2();

    if (!runResult.results.length) {
      throw new Error('expected at least one RevEx result');
    }

    for (const result of runResult.results) {
      const resultDir = result.resultDir;
      const requiredFiles = [
        'problem.md',
        'baseline-pr.md',
        'baseline-metadata.json',
        'case-profile.json',
        'candidate-pr.md',
        'candidate-summary.json',
        'candidate-output.json',
        'candidate-events.jsonl',
        'quality-gates.json',
        'result-card.json',
        'system-validation.txt',
        'judge-output.json',
        'judge-events.jsonl',
        'candidate-cli-output.txt',
        'judge-cli-output.txt',
        'workspace-diff-stat.txt',
        'workspace-changed-files.txt',
        'workspace-status.txt',
        'case-manifest.json',
      ];

      for (const fileName of requiredFiles) {
        const absolutePath = path.join(resultDir, fileName);
        if (!fs.existsSync(absolutePath)) {
          throw new Error(`${result.caseId} is missing result file ${fileName}`);
        }
      }
    }
  })) passed++; else failed++;

  if (runResult && test('run summary is written for the Phase 2 benchmark pass', () => {
    const summaryPath = path.join(runResult.resultDir, 'summary.json');
    const manifestPath = path.join(runResult.resultDir, 'run-manifest.json');
    const scoreboardJsonPath = path.join(REPO_ROOT, 'tests/results', 'history-benchmark-scoreboard.json');
    const scoreboardMarkdownPath = path.join(REPO_ROOT, 'tests/results', 'history-benchmark-scoreboard.md');
    const ledgerPath = path.join(REPO_ROOT, 'tests/results', 'history-benchmark-run-ledger.jsonl');
    if (!fs.existsSync(summaryPath)) {
      throw new Error('summary.json was not written');
    }
    if (!fs.existsSync(manifestPath)) {
      throw new Error('run-manifest.json was not written');
    }
    if (!fs.existsSync(scoreboardJsonPath)) {
      throw new Error('history-benchmark-scoreboard.json was not written');
    }
    if (!fs.existsSync(scoreboardMarkdownPath)) {
      throw new Error('history-benchmark-scoreboard.md was not written');
    }
    if (!fs.existsSync(ledgerPath)) {
      throw new Error('history-benchmark-run-ledger.jsonl was not written');
    }
  })) passed++; else if (runResult) failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  run();
}

module.exports = {
  run,
};
