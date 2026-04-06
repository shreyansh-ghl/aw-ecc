# Baseline PR

## Title
Remove carousel buttons (#7885)

## Problem Summary
This shipped change addressed work around `gokollab-preview` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/gokollab-preview/src/components/discovery-v2/sales/SalesMediaCarousel.vue` (+1 / -24)

## Diff Summary
- files changed: 1
- insertions: 1
- deletions: 24

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline removed or simplified existing code paths

## Baseline Commit
- repo: `revex-frontend`
- sha: `2fefee70f84b88c0e1add17aa860e5e9e9b135ee`
- parent: `0d72fe6f68d0d3c4f3b967084980c028b00db8f2`
- date: `2026-04-01T18:15:35+05:30`