const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { REPO_ROOT } = require('../lib/aw-sdlc-paths');

const CHECKLIST_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-outcomes-eval-checklist.md');
const CONFIDENCE_DOC = path.join(REPO_ROOT, 'docs/aw-sdlc-confidence-plan.md');
const RUNNER_SCRIPT = path.join(REPO_ROOT, 'tests/evals/run-aw-sdlc-evals.sh');

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
  console.log('\n=== AW SDLC Outcome Artifact Contract ===\n');

  const checklist = fs.readFileSync(CHECKLIST_DOC, 'utf8');
  const confidence = fs.readFileSync(CONFIDENCE_DOC, 'utf8');
  const runner = fs.readFileSync(RUNNER_SCRIPT, 'utf8');

  let passed = 0;
  let failed = 0;

  const checks = [
    ['checklist defines the exact outcome release evidence fields', () => {
      const required = [
        'PR URL',
        'PR Status',
        'Jenkins Queue URL',
        'Jenkins Build URL',
        'Testing Automation URL',
        'Build Status',
        'Deployed Version',
        'Versioned Staging Link',
      ];
      for (const item of required) {
        assert.ok(checklist.includes(item), `missing checklist item: ${item}`);
      }
    }],
    ['checklist forbids placeholder-only outcome artifacts after success', () => {
      assert.ok(
        checklist.includes('These fields should not be represented as only `NOT_AVAILABLE`'),
        'missing guidance against placeholder-only live artifacts'
      );
    }],
    ['confidence plan requires the outcome artifact validation gate', () => {
      assert.ok(confidence.includes('AW_SDLC_LIVE_RELEASE_FILE'), 'missing live release file gate');
      assert.ok(confidence.includes('Jenkins queue URL'), 'missing Jenkins queue URL requirement');
      assert.ok(confidence.includes('Jenkins build URL'), 'missing Jenkins build URL requirement');
      assert.ok(confidence.includes('versioned staging link'), 'missing versioned staging link requirement');
    }],
    ['runner exposes the outcome-artifacts validation mode', () => {
      assert.ok(runner.includes('run_outcome_artifacts'), 'missing outcome-artifacts runner function');
      assert.ok(runner.includes('outcome-artifacts'), 'missing outcome-artifacts mode');
    }],
  ];

  for (const [name, fn] of checks) {
    if (test(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
