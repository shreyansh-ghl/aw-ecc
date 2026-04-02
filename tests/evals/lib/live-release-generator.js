const fs = require('fs');
const path = require('path');

function asList(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(/\r?\n|\|\|/)
    .map(item => item.trim())
    .filter(Boolean);
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function bulletList(items, fallback) {
  if (items.length > 0) {
    return items.map(item => `- ${item}`).join('\n');
  }

  return `- ${fallback}`;
}

function buildReleaseMarkdown(options = {}) {
  const requestedGoal = firstNonEmpty(options.requestedGoal, 'Record live release evidence for the requested AW SDLC flow.');
  const profileUsed = firstNonEmpty(options.profileUsed, 'live-external');
  const selectedMode = firstNonEmpty(options.selectedMode, 'staging');
  const pipelineProvider = firstNonEmpty(options.pipelineProvider, 'ghl-ai -> git-jenkins');
  const versionStrategy = firstNonEmpty(options.versionStrategy, 'Versioned staging deployment');
  const deployedVersion = firstNonEmpty(options.deployedVersion);
  const versionRoutingSignal = firstNonEmpty(options.versionRoutingSignal);
  const versionLines = [];

  if (deployedVersion) {
    versionLines.push(`Deployed Version: ${deployedVersion}`);
  }

  if (versionRoutingSignal) {
    versionLines.push(`Version Routing Signal: ${versionRoutingSignal}`);
  }

  if (versionLines.length === 0) {
    versionLines.push('Version strategy recorded with the release evidence below.');
  }

  const versionedLinks = asList(options.versionedLinks);
  const buildLinks = [];
  const queueUrl = firstNonEmpty(options.jenkinsQueueUrl);
  const buildUrl = firstNonEmpty(options.jenkinsBuildUrl);
  const prUrl = firstNonEmpty(options.prUrl);

  if (queueUrl) {
    buildLinks.push(`Jenkins Queue URL: ${queueUrl}`);
  }

  if (buildUrl) {
    buildLinks.push(`Jenkins Build URL: ${buildUrl}`);
  }

  if (prUrl) {
    buildLinks.push(`PR URL: ${prUrl}`);
  }

  buildLinks.push(...asList(options.buildLinks));

  const testingAutomationLinks = [];
  const testingAutomationUrl = firstNonEmpty(options.testingAutomationUrl);
  if (testingAutomationUrl) {
    testingAutomationLinks.push(`Testing Automation URL: ${testingAutomationUrl}`);
  }
  testingAutomationLinks.push(...asList(options.testingAutomationLinks));

  const buildStatuses = [];
  const buildStatus = firstNonEmpty(options.buildStatus);
  if (buildStatus) {
    buildStatuses.push(`Build Status: ${buildStatus}`);
  }
  buildStatuses.push(...asList(options.buildStatuses));

  const executionEvidence = [];
  const executionSummary = firstNonEmpty(options.executionSummary);
  if (executionSummary) {
    executionEvidence.push(executionSummary);
  }
  executionEvidence.push(...asList(options.executionEvidence));

  const rollbackPath = firstNonEmpty(
    options.rollbackPath,
    'Re-run the previous known-good versioned deploy and revert the staging routing signal if validation fails.'
  );

  const outcomeLines = [];
  const prStatus = firstNonEmpty(options.prStatus);
  const postDeployValidationLink = firstNonEmpty(options.postDeployValidationLink);
  const outcomeSummary = firstNonEmpty(
    options.outcome,
    'Live release evidence captured for the requested flow.'
  );

  if (prUrl) {
    outcomeLines.push(`PR URL: ${prUrl}`);
  } else {
    outcomeLines.push('PR flow was not requested for this live capture.');
  }

  if (prStatus) {
    outcomeLines.push(`PR Status: ${prStatus}`);
  }

  if (queueUrl) {
    outcomeLines.push(`Jenkins Queue URL: ${queueUrl}`);
  }

  if (buildUrl) {
    outcomeLines.push(`Jenkins Build URL: ${buildUrl}`);
  }

  if (postDeployValidationLink) {
    outcomeLines.push(`Post-Deploy Validation Link: ${postDeployValidationLink}`);
  }

  outcomeLines.push(outcomeSummary);

  const recommendedNext = firstNonEmpty(
    options.recommendedNext,
    'Confirm the live deployment outcome, then attach this artifact to the AW release handoff.'
  );

  return [
    '# Release Report',
    '## Requested Goal',
    requestedGoal,
    '## Profile Used',
    profileUsed,
    '## Selected Mode',
    selectedMode,
    '## Pipeline or Provider',
    pipelineProvider,
    '## Version Strategy',
    [versionStrategy, bulletList(versionLines, 'Version details were not captured.')].join('\n'),
    '## Versioned Links',
    bulletList(
      versionedLinks,
      'No versioned staging link was captured for this flow yet.'
    ),
    '## Build Links',
    bulletList(
      buildLinks,
      'No build links were captured for this flow yet.'
    ),
    '## Testing Automation Build Links',
    bulletList(
      testingAutomationLinks,
      'No separate testing automation link was captured for this flow.'
    ),
    '## Build Status',
    bulletList(
      buildStatuses,
      'No explicit build status was captured for this flow yet.'
    ),
    '## Execution Evidence',
    bulletList(
      executionEvidence,
      'Live release evidence was captured from the external deployment flow.'
    ),
    '## Rollback Path',
    rollbackPath,
    '## Outcome',
    bulletList(outcomeLines, 'No release outcome was recorded.'),
    '## Recommended Next',
    recommendedNext,
    '',
  ].join('\n\n');
}

function writeReleaseFile(targetPath, markdown) {
  const outputPath = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');
  return outputPath;
}

module.exports = {
  asList,
  buildReleaseMarkdown,
  writeReleaseFile,
};
