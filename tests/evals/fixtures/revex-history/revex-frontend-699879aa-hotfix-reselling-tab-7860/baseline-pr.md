# Baseline PR

## Title
hotfix/reselling-tab (#7860)

## Problem Summary
This shipped change addressed work around `agency-dashboard` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/agency-dashboard/src/components/dashboard/reselling/resellingFilters.vue` (+5 / -5)
- `apps/agency-dashboard/src/components/dashboard/reselling/resellingTab.vue` (+2 / -2)

## Diff Summary
- files changed: 2
- insertions: 7
- deletions: 7

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `699879aa1fd3cd04b42266fb4cb98e288d339dc2`
- parent: `14c8d285605c3781a6fb0b4e89a289aeaefc66a2`
- date: `2026-04-01T11:42:20+05:30`