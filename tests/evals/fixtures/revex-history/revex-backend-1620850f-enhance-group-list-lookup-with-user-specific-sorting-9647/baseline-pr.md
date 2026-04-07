# Baseline PR

## Title
feat(groups): enhance group list lookup with user-specific sorting (#9647)

## Problem Summary
This shipped change addressed work around `communities` in RevEx backend.

## Baseline Route Expectation
- route: `/aw:build`
- primary skill: `aw-build`
- recommended supporting skills: `api-and-interface-design`, `incremental-implementation`
- comparison mode: `pr_parity`

## Changed Files
- `apps/communities/src/groups/__tests__/groups.service.spec.ts` (+87 / -2)
- `apps/communities/src/groups/groups.controller.ts` (+11 / -0)
- `apps/communities/src/groups/groups.repository.ts` (+5 / -5)
- `apps/communities/src/groups/groups.service.ts` (+39 / -4)
- `apps/communities/src/users-groups/user-groups.repository.ts` (+17 / -1)
- `apps/communities/src/users-groups/users-groups.service.ts` (+13 / -3)

## Diff Summary
- files changed: 6
- insertions: 172
- deletions: 15

## Validation Clues
- tests changed in the shipped baseline

## Risk Notes
- baseline touched integration or orchestration boundaries

## Baseline Commit
- repo: `revex-backend`
- sha: `1620850fd9984ca7cca4e4f6e16995bd36076222`
- parent: `ca1a406405fcbefa35cb750fbd387eef99346c70`
- date: `2026-03-27T10:48:19+05:30`
