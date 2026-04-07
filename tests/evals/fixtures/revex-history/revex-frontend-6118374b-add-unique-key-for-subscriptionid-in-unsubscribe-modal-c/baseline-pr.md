# Baseline PR

## Title
fix(SitesContainer): add unique key for subscriptionId in unsubscribe modal components (#7776)

## Problem Summary
This shipped change addressed work around `wordpress` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:investigate`
- primary skill: `aw-investigate`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`, `documentation-and-adrs`
- comparison mode: `pr_parity`

## Changed Files
- `apps/wordpress/src/components/containers/sites/SitesContainer.vue` (+2 / -0)

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
- sha: `6118374b9f0a8c36b141c34a3dfbccd6c6fbe30d`
- parent: `70f9a6f73a3462824c9db1d7d6a585ed26fb865a`
- date: `2026-04-02T12:00:35+05:30`
