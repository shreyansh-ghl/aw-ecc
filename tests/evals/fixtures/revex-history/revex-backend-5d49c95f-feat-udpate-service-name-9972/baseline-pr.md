# Baseline PR

## Title
feat/udpate-service-name (#9972)

## Problem Summary
This shipped change addressed work around `lc-cpaas-compliance` in RevEx backend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `api-and-interface-design`, `incremental-implementation`
- comparison mode: `pr_parity`

## Changed Files
- `apps/lc-cpaas-compliance/deployments/production/values.server.production.yaml` (+1 / -1)
- `apps/lc-cpaas-messages/deployments/production/values.server.production.yaml` (+1 / -1)
- `apps/lc-cpaas-voice/deployments/production/values.server.production.yaml` (+1 / -1)

## Diff Summary
- files changed: 3
- insertions: 3
- deletions: 3

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline
- release or delivery-related files were part of the baseline change

## Risk Notes
- baseline remained within a narrow local change surface

## Baseline Commit
- repo: `revex-backend`
- sha: `5d49c95f51325f17c2d00fb56080eb03132e4d2c`
- parent: `d4e01a17303a51fefcd41d99269e339d3925709e`
- date: `2026-03-26T17:58:35+05:30`