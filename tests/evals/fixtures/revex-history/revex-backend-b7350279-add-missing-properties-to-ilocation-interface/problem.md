# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx backend
Product area: `lc-phone`
Affected surface: `lc-phone:src/twilio-accounts`
Change kind: `bugfix`
Baseline theme: add missing properties to ILocation interface.

## Observed Need
A user-facing or runtime bug has been reported around `lc-phone:src/twilio-accounts` in RevEx backend, and the current behavior is not reliable enough to leave as-is.

## Task
You are working in RevEx backend. A user-facing or runtime bug has been reported around `lc-phone:src/twilio-accounts` in RevEx backend, and the current behavior is not reliable enough to leave as-is. Deliver the smallest safe bugfix in `lc-phone:src/twilio-accounts` using the expected AW route `/aw:investigate`. Success criteria: resolve the user-visible or runtime issue in `lc-phone:src/twilio-accounts` without widening scope; preserve adjacent behavior and existing contracts unless a narrow compatibility adjustment is required; capture the failure mode or behavior gap clearly before proposing the patch. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show a focused regression check or narrow supporting note that addresses the original failure mode; include delivery or rollout evidence for any release-path changes.

## Success Criteria
- resolve the user-visible or runtime issue in `lc-phone:src/twilio-accounts` without widening scope
- preserve adjacent behavior and existing contracts unless a narrow compatibility adjustment is required
- capture the failure mode or behavior gap clearly before proposing the patch

## Constraints
- keep the scope narrow and reversible
- preserve stable contracts where possible
- do not assume a large rewrite is acceptable without evidence
- keep the result reviewable against the stored baseline PR
- prefer the smallest correct AW route; expected starting route: `/aw:investigate`

## Verification Expectations
- record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow
- show a focused regression check or narrow supporting note that addresses the original failure mode
- include delivery or rollout evidence for any release-path changes