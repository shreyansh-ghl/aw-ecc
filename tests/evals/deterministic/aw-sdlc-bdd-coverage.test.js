const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { OUTCOME_CASES } = require('../outcomes/aw-sdlc-outcomes.test.js');

const FEATURE_DIR = path.join(__dirname, '..', '..', 'bdd', 'features');

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

function parseFeatureFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const scenarios = [];
  let featureName = null;
  let pendingCaseId = null;
  let pendingTags = [];
  let currentScenario = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith('# case-id:')) {
      pendingCaseId = line.slice('# case-id:'.length).trim();
      continue;
    }

    if (line.startsWith('@')) {
      pendingTags.push(...line.split(/\s+/));
      continue;
    }

    if (line.startsWith('Feature:')) {
      featureName = line.slice('Feature:'.length).trim();
      continue;
    }

    if (line.startsWith('Scenario:')) {
      currentScenario = {
        featureName,
        name: line.slice('Scenario:'.length).trim(),
        caseId: pendingCaseId,
        tags: pendingTags,
        steps: [],
      };
      scenarios.push(currentScenario);
      pendingCaseId = null;
      pendingTags = [];
      continue;
    }

    const stepMatch = line.match(/^(Given|When|Then|And|But)\s+(.*)$/);
    if (stepMatch && currentScenario) {
      currentScenario.steps.push({
        keyword: stepMatch[1],
        text: stepMatch[2],
      });
    }
  }

  return scenarios;
}

function readAllScenarios() {
  const files = fs.readdirSync(FEATURE_DIR)
    .filter(name => name.endsWith('.feature'))
    .sort()
    .map(name => path.join(FEATURE_DIR, name));

  return files.flatMap(parseFeatureFile);
}

function run() {
  console.log('\n=== AW SDLC BDD Coverage ===\n');

  const scenarios = readAllScenarios();
  const outcomeCaseIds = new Set(OUTCOME_CASES.map(testCase => testCase.id));
  const scenarioCaseIds = scenarios.map(scenario => scenario.caseId);
  const requiredStageTags = ['@plan', '@build', '@review', '@deploy', '@ship', '@yolo'];

  let passed = 0;
  let failed = 0;

  const checks = [
    ['contains BDD scenarios', () => {
      assert.ok(scenarios.length >= 10, 'expected at least 10 BDD scenarios');
    }],
    ['every scenario has a mapped case id', () => {
      for (const scenario of scenarios) {
        assert.ok(scenario.caseId, `scenario "${scenario.name}" is missing # case-id metadata`);
        assert.ok(outcomeCaseIds.has(scenario.caseId), `scenario "${scenario.name}" maps to unknown outcome case "${scenario.caseId}"`);
      }
    }],
    ['case ids are unique and cover all real outcome cases', () => {
      assert.equal(new Set(scenarioCaseIds).size, scenarioCaseIds.length, 'BDD case ids should be unique');
      assert.deepEqual(
        [...new Set(scenarioCaseIds)].sort(),
        [...outcomeCaseIds].sort(),
        'BDD scenarios should cover the same case ids as the outcomes suite'
      );
    }],
    ['scenarios stay intent first', () => {
      for (const scenario of scenarios) {
        const whenSteps = scenario.steps.filter(step => step.keyword === 'When');
        assert.equal(whenSteps.length, 1, `scenario "${scenario.name}" should have exactly one When step`);
        assert.ok(!scenario.steps.some(step => /\/aw:/.test(step.text)), `scenario "${scenario.name}" should not use slash commands`);
        assert.ok(scenario.tags.includes('@intent'), `scenario "${scenario.name}" should be tagged @intent`);
      }
    }],
    ['each scenario uses Given/When/Then structure', () => {
      for (const scenario of scenarios) {
        const keywords = new Set(scenario.steps.map(step => step.keyword));
        assert.ok(keywords.has('Given'), `scenario "${scenario.name}" is missing a Given step`);
        assert.ok(keywords.has('When'), `scenario "${scenario.name}" is missing a When step`);
        assert.ok(keywords.has('Then'), `scenario "${scenario.name}" is missing a Then step`);
      }
    }],
    ['stage coverage is complete', () => {
      const allTags = new Set(scenarios.flatMap(scenario => scenario.tags));
      for (const tag of requiredStageTags) {
        assert.ok(allTags.has(tag), `missing stage tag ${tag}`);
      }
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
