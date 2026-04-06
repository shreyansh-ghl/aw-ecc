# Baseline PR

## Title
fix highrise breaking changes isue (#7875)

## Problem Summary
This shipped change addressed work around `yext` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/yext/src/components/DuplicateSuppression/TableComponents/DuplicateSuppressionTable.vue` (+2 / -0)

## Diff Summary
- files changed: 1
- insertions: 2
- deletions: 0

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `61bc4fe8e6385654e2f1ef99121f3cd762365a58`
- parent: `f15c53df146c291fa12b3b1d0a123aeb8c9f6d0c`
- date: `2026-04-01T15:03:15+05:30`