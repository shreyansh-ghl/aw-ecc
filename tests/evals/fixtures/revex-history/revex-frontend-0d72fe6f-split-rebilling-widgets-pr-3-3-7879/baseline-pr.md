# Baseline PR

## Title
Split rebilling widgets PR 3/3. (#7879)

## Problem Summary
This shipped change addressed work around `agency-dashboard` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/agency-dashboard/src/components/dashboard/rebilling/__tests__/subAccountProfitabilityLeaderboard.test.ts` (+24 / -0)
- `apps/agency-dashboard/src/components/dashboard/rebilling/__tests__/walletUsageAttribution.test.ts` (+76 / -0)
- `apps/agency-dashboard/src/components/dashboard/rebilling/subAccountProfitabilityLeaderboard.vue` (+398 / -0)
- `apps/agency-dashboard/src/components/dashboard/rebilling/walletUsageAttribution.vue` (+230 / -0)

## Diff Summary
- files changed: 4
- insertions: 728
- deletions: 0

## Validation Clues
- tests changed in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `0d72fe6f68d0d3c4f3b967084980c028b00db8f2`
- parent: `bf43cc121f5260d50e41ccd15627347002224ba6`
- date: `2026-04-01T17:40:08+05:30`