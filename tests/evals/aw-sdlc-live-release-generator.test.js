const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const { buildReleaseMarkdown } = require('./lib/live-release-generator');

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
  console.log('\n=== AW SDLC Live Release Generator ===\n');

  let passed = 0;
  let failed = 0;

  const checks = [
    ['buildReleaseMarkdown includes the required release sections', () => {
      const markdown = buildReleaseMarkdown({
        requestedGoal: 'Ship Communities builder to staging.',
        selectedMode: 'staging',
        pipelineProvider: 'ghl-ai -> git-jenkins',
        deployedVersion: 'master',
        versionedLinks: 'https://staging.appcdn.leadconnectorhq.com/revex/communities-builder--ver--master/remoteEntry.js',
        jenkinsQueueUrl: 'https://jenkins.msgsndr.net/queue/item/6348566/',
        jenkinsBuildUrl: 'https://jenkins.msgsndr.net/job/staging-versions/job/revex/job/ghl-revex-frontend/10965/',
        testingAutomationUrl: 'https://jenkins.msgsndr.net/job/staging-versions/job/revex/job/ghl-revex-frontend/10965/',
        buildStatus: 'SUCCESS',
        prUrl: 'https://github.com/example/repo/pull/123',
      });

      assert.match(markdown, /## Requested Goal/);
      assert.match(markdown, /## Versioned Links/);
      assert.match(markdown, /PR URL: https:\/\/github\.com\/example\/repo\/pull\/123/);
      assert.match(markdown, /Jenkins Queue URL: https:\/\/jenkins\.msgsndr\.net\/queue\/item\/6348566\//);
      assert.match(markdown, /Build Status: SUCCESS/);
    }],
    ['generate-aw-sdlc-live-release writes the artifact to disk', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-sdlc-live-release-'));
      const outputPath = path.join(tmpDir, 'release.md');
      const result = spawnSync(
        'node',
        ['/Users/prathameshai/Documents/Agentic Workspace/aw-ecc/tests/evals/generate-aw-sdlc-live-release.js'],
        {
          encoding: 'utf8',
          env: {
            ...process.env,
            AW_SDLC_LIVE_RELEASE_FILE: outputPath,
            AW_SDLC_GOAL: 'Ship Communities builder to staging.',
            AW_SDLC_SELECTED_MODE: 'staging',
            AW_SDLC_PIPELINE_PROVIDER: 'ghl-ai -> git-jenkins',
            AW_SDLC_DEPLOYED_VERSION: 'master',
            AW_SDLC_JENKINS_QUEUE_URL: 'https://jenkins.msgsndr.net/queue/item/6348566/',
            AW_SDLC_JENKINS_BUILD_URL: 'https://jenkins.msgsndr.net/job/staging-versions/job/revex/job/ghl-revex-frontend/10965/',
            AW_SDLC_VERSIONED_LINKS: 'https://staging.appcdn.leadconnectorhq.com/revex/communities-builder--ver--master/remoteEntry.js',
            AW_SDLC_BUILD_STATUS: 'SUCCESS',
          },
        }
      );

      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.ok(fs.existsSync(outputPath), 'release.md should be written');
      const content = fs.readFileSync(outputPath, 'utf8');
      assert.match(content, /Ship Communities builder to staging/);
      assert.match(content, /ghl-ai -> git-jenkins/);
      assert.match(content, /communities-builder--ver--master\/remoteEntry\.js/);
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
