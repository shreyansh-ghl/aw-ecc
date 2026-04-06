#!/usr/bin/env node
const path = require('path');
const { generateRevexHistoryBenchmark, FIXTURE_PATH } = require('./lib/revex-history-benchmark');

function main() {
  const requestedPerRepo = Number(process.env.AW_REVEX_HISTORY_LIMIT || 20);
  const fixture = generateRevexHistoryBenchmark({ requestedPerRepo });

  const totalCases = fixture.cases.length;
  const repoSummary = fixture.repos
    .map(repo => `${repo.repoKey}:${repo.selectedCaseCount}/${repo.visibleCommitCount}${repo.shallow ? ' shallow' : ''}`)
    .join(', ');

  console.log(`Generated RevEx history benchmark fixture: ${path.relative(process.cwd(), FIXTURE_PATH)}`);
  console.log(`Requested per repo: ${fixture.requestedPerRepo}`);
  console.log(`Total cases: ${totalCases}`);
  console.log(`Repos: ${repoSummary}`);
}

main();
