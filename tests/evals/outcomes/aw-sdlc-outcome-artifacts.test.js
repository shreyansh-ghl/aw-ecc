const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

function readReleaseFile() {
  const target = process.env.AW_SDLC_LIVE_RELEASE_FILE;
  if (!target) {
    console.log('SKIP set AW_SDLC_LIVE_RELEASE_FILE to validate a real release artifact');
    process.exit(0);
  }

  const releasePath = path.resolve(target);
  if (!fs.existsSync(releasePath)) {
    throw new Error(`release file does not exist: ${releasePath}`);
  }

  return {
    releasePath,
    content: fs.readFileSync(releasePath, 'utf8'),
  };
}

function envEnabled(name, defaultValue) {
  const value = process.env[name];
  if (value == null || value === '') {
    return defaultValue;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function run() {
  console.log('\n=== AW SDLC Live Artifacts ===\n');

  const { releasePath, content } = readReleaseFile();
  const liveKind = process.env.AW_SDLC_LIVE_KIND || 'generic';
  const requirePr = envEnabled('AW_SDLC_LIVE_REQUIRE_PR', false);
  const requireTestingAutomation = envEnabled('AW_SDLC_LIVE_REQUIRE_TESTING_URL', false);
  const requirePostDeployValidation = envEnabled('AW_SDLC_LIVE_REQUIRE_POST_DEPLOY_VALIDATION', false);
  const expectComplete = envEnabled('AW_SDLC_LIVE_EXPECT_COMPLETE', true);

  const githubPrUrl = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+/i;
  const jenkinsQueueUrl = /https:\/\/jenkins\.msgsndr\.net\/queue\/item\/\d+\//i;
  const jenkinsBuildUrl = /https:\/\/jenkins\.msgsndr\.net\/job\/.+\/\d+\//i;
  const testingAutomationUrl = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/actions\/runs\/\d+|https:\/\/jenkins\.msgsndr\.net\/job\/.+\/\d+\//i;
  const buildStatus = /\bSUCCESS\b|\bFAILURE\b|\bUNSTABLE\b|\bABORTED\b|\bIN_PROGRESS\b/i;
  const deployedVersion = /Deployed Version|developer_version|Version Routing Signal|Version Strategy/i;
  const postDeployValidationUrl = /https?:\/\/[^\s)]+/i;

  const versionedLinkPatterns = {
    generic: /https?:\/\/[^\s)]+(?:remoteEntry\.js|developer_version|staging|health|version)/i,
    microfrontend: /https?:\/\/[^\s)]+(?:remoteEntry\.js|spm-ts|developer_version)/i,
    microservice: /https?:\/\/[^\s)]+(?:staging|health|version)/i,
    worker: /https?:\/\/[^\s)]+(?:jenkins\.msgsndr\.net|staging|worker|queue|subscription)/i,
  };

  const placeholderOnly = /\bNOT_AVAILABLE\b|\bUNKNOWN\b|\bBLOCKED\b/i;

  let passed = 0;
  let failed = 0;

  const checks = [
    ['release file exists and is readable', () => {
      assert.ok(content.length > 0, `release artifact is empty: ${releasePath}`);
    }],
    ['release artifact contains a Jenkins queue URL', () => {
      assert.ok(jenkinsQueueUrl.test(content), 'missing Jenkins queue URL');
    }],
    ['release artifact contains a Jenkins build URL', () => {
      assert.ok(jenkinsBuildUrl.test(content), 'missing Jenkins build URL');
    }],
    ['release artifact contains a testing automation URL', () => {
      assert.ok(testingAutomationUrl.test(content), 'missing testing automation URL');
    }],
    ['release artifact records build status', () => {
      assert.ok(buildStatus.test(content), 'missing build status');
    }],
    ['release artifact records deployed version or version routing signal', () => {
      assert.ok(deployedVersion.test(content), 'missing deployed version or version routing signal');
    }],
    ['release artifact contains a versioned staging link for the selected archetype', () => {
      const pattern = versionedLinkPatterns[liveKind] || versionedLinkPatterns.generic;
      assert.ok(pattern.test(content), `missing versioned staging link for ${liveKind}`);
    }],
  ];

  if (requirePr) {
    checks.splice(1, 0, ['release artifact contains a real GitHub PR URL', () => {
      assert.ok(githubPrUrl.test(content), 'missing real GitHub PR URL');
    }]);
  }

  if (requireTestingAutomation) {
    checks.push(['release artifact contains a testing automation URL', () => {
      assert.ok(testingAutomationUrl.test(content), 'missing testing automation URL');
    }]);
  }

  if (requirePostDeployValidation) {
    checks.push(['release artifact contains a post-deploy validation link', () => {
      const match = content.match(/Post-Deploy Validation Link:\s*(.+)/i);
      assert.ok(match && postDeployValidationUrl.test(match[1]), 'missing post-deploy validation link');
    }]);
  }

  if (expectComplete) {
    checks.push(['release artifact is not placeholder-only after a live run', () => {
      assert.ok(!placeholderOnly.test(content), 'live release artifact still contains placeholder-only status markers');
    }]);
  }

  for (const [name, fn] of checks) {
    if (test(name, fn)) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nValidated: ${releasePath}`);
  console.log(`Live kind: ${liveKind}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
