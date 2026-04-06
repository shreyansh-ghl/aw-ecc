# Baseline PR

## Title
Use richer media data for carousel (#7882)

## Problem Summary
This shipped change addressed work around `gokollab-preview` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/gokollab-preview/src/__tests__/sales/SalesMediaCarousel.spec.ts` (+72 / -13)
- `apps/gokollab-preview/src/components/discovery-v2/sales/AboutMobile.vue` (+1 / -1)
- `apps/gokollab-preview/src/components/discovery-v2/sales/AboutWeb.vue` (+1 / -1)
- `apps/gokollab-preview/src/components/discovery-v2/sales/SalesMediaCarousel.vue` (+35 / -40)
- `apps/gokollab-preview/src/models/Listings.ts` (+2 / -0)
- `apps/gokollab-preview/src/util/mediaDataCarousel.ts` (+138 / -0)

## Diff Summary
- files changed: 6
- insertions: 249
- deletions: 55

## Validation Clues
- tests changed in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `e9ef8db967e779d1ee4e35cfc2dfacc88dd5fb04`
- parent: `e9fe7d85653e12434525ca64ba7e45ae40d267b1`
- date: `2026-04-01T17:28:44+05:30`