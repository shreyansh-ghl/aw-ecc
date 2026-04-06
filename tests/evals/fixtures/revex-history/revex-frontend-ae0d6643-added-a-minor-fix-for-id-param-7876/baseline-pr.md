# Baseline PR

## Title
added a minor fix for id param (#7876)

## Problem Summary
This shipped change addressed work around `location-billing` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/location-billing/webpack.config.js` (+1 / -1)
- `apps/locations/src/components/locations/manageClient/index.vue` (+10 / -0)
- `apps/locations/src/components/locations/overview/LocationList.ts` (+46 / -26)

## Diff Summary
- files changed: 3
- insertions: 57
- deletions: 27

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `ae0d664321499098479fc0b431c70c073eb56d90`
- parent: `42794c016b3f893a75876ec3d3796cad6f0a76b2`
- date: `2026-04-01T15:32:12+05:30`