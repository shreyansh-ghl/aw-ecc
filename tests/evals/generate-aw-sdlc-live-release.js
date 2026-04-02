const { buildReleaseMarkdown, writeReleaseFile } = require('./lib/live-release-generator');

function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : '';
}

function main() {
  const outputPath = required('AW_SDLC_LIVE_RELEASE_FILE');
  const markdown = buildReleaseMarkdown({
    requestedGoal: optional('AW_SDLC_GOAL'),
    profileUsed: optional('AW_SDLC_PROFILE_USED'),
    selectedMode: optional('AW_SDLC_SELECTED_MODE'),
    pipelineProvider: optional('AW_SDLC_PIPELINE_PROVIDER'),
    versionStrategy: optional('AW_SDLC_VERSION_STRATEGY'),
    deployedVersion: optional('AW_SDLC_DEPLOYED_VERSION'),
    versionRoutingSignal: optional('AW_SDLC_VERSION_ROUTING_SIGNAL'),
    versionedLinks: optional('AW_SDLC_VERSIONED_LINKS'),
    jenkinsQueueUrl: optional('AW_SDLC_JENKINS_QUEUE_URL'),
    jenkinsBuildUrl: optional('AW_SDLC_JENKINS_BUILD_URL'),
    buildLinks: optional('AW_SDLC_BUILD_LINKS'),
    testingAutomationUrl: optional('AW_SDLC_TESTING_AUTOMATION_URL'),
    testingAutomationLinks: optional('AW_SDLC_TESTING_AUTOMATION_LINKS'),
    buildStatus: optional('AW_SDLC_BUILD_STATUS'),
    buildStatuses: optional('AW_SDLC_BUILD_STATUSES'),
    executionSummary: optional('AW_SDLC_EXECUTION_SUMMARY'),
    executionEvidence: optional('AW_SDLC_EXECUTION_EVIDENCE'),
    rollbackPath: optional('AW_SDLC_ROLLBACK_PATH'),
    outcome: optional('AW_SDLC_OUTCOME'),
    recommendedNext: optional('AW_SDLC_RECOMMENDED_NEXT'),
    prUrl: optional('AW_SDLC_PR_URL'),
    prStatus: optional('AW_SDLC_PR_STATUS'),
    postDeployValidationLink: optional('AW_SDLC_POST_DEPLOY_VALIDATION_LINK'),
  });

  const writtenPath = writeReleaseFile(outputPath, markdown);
  console.log(`wrote live release artifact: ${writtenPath}`);
}

main();
