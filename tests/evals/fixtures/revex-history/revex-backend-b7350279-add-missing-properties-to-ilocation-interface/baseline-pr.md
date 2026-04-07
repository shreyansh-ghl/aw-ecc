# Baseline PR

## Title
fix: add missing properties to ILocation interface

## Problem Summary
This shipped change addressed work around `lc-phone` in RevEx backend.

## Baseline Route Expectation
- route: `/aw:investigate`
- primary skill: `aw-investigate`
- recommended supporting skills: `api-and-interface-design`, `incremental-implementation`, `documentation-and-adrs`
- comparison mode: `pr_parity`

## Changed Files
- `apps/lc-phone/src/twilio-accounts/twilio-accounts.service.ts` (+1 / -1)
- `apps/lc-phone/src/voice-call/workflow-call.service.ts` (+1 / -1)
- `common/services/locations/locations.interface.ts` (+29 / -0)
- `docs/public/phone-system/phone-system.json` (+22 / -2)

## Diff Summary
- files changed: 4
- insertions: 53
- deletions: 4

## Validation Clues
- no explicit test-file changes were visible in the shipped baseline
- release or delivery-related files were part of the baseline change

## Risk Notes
- baseline touched integration or orchestration boundaries

## Baseline Commit
- repo: `revex-backend`
- sha: `b7350279086f6cd5045704b25b7880c5f64578a5`
- parent: `edbe499bbbc414b98e8acf4d78b746b6e45a41d4`
- date: `2026-03-27T16:20:17+05:30`
