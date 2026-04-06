# Baseline PR

## Title
[86d0bjrta] fix: handle unsubscribe 'Got It' button navigation in LoginDetails (#7763)

## Problem Summary
This shipped change addressed work around `yext` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/yext/src/components/ListingPageComponents/EditListingComponents/LoginDetails.vue` (+8 / -1)
- `apps/yext/src/pages/ListingPage.vue` (+196 / -194)

## Diff Summary
- files changed: 2
- insertions: 204
- deletions: 195

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `900e4044d4229ad0dd1e754e277f8f99f2ac8711`
- parent: `0d18e6056edc8082e3ccaf12180ef5e94a78ff2e`
- date: `2026-04-01T10:56:16+05:30`