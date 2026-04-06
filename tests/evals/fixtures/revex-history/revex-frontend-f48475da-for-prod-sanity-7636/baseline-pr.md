# Baseline PR

## Title
for prod sanity (#7636)

## Problem Summary
This shipped change addressed work around `email-isv` in RevEx frontend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `frontend-ui-engineering`, `browser-testing-with-devtools`
- comparison mode: `pr_parity`

## Changed Files
- `apps/email-isv/src/helper/support-portal.types.ts` (+1 / -1)

## Diff Summary
- files changed: 1
- insertions: 1
- deletions: 1

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-frontend`
- sha: `f48475da65d0fc4c590d503671ccad7d6a4ee58e`
- parent: `99ce5c9cb172dfaf34f91f6c4d5c729d5c6215c8`
- date: `2026-04-01T14:27:41+05:30`