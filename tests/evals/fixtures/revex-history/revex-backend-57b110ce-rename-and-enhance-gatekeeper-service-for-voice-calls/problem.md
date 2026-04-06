# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx backend
Product area: `lc-phone`
Affected surface: `lc-phone`
Change kind: `refactor`
Baseline theme: rename and enhance gatekeeper service for voice calls.

## Observed Need
The implementation around `lc-phone` in RevEx backend is carrying avoidable complexity that now needs cleanup without breaking stable behavior.

## Task
You are working in RevEx backend. The implementation around `lc-phone` in RevEx backend is carrying avoidable complexity that now needs cleanup without breaking stable behavior. Deliver the smallest safe refactor in `lc-phone` using the expected AW route `/aw:build`. Success criteria: simplify or restructure `lc-phone` while preserving current behavior; leave a reviewable change boundary with no unrelated cleanup; include implementation evidence that ties directly to the touched files or flow. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces.

## Success Criteria
- simplify or restructure `lc-phone` while preserving current behavior
- leave a reviewable change boundary with no unrelated cleanup
- include implementation evidence that ties directly to the touched files or flow

## Constraints
- keep the scope narrow and reversible
- preserve stable contracts where possible
- do not assume a large rewrite is acceptable without evidence
- keep the result reviewable against the stored baseline PR
- prefer the smallest correct AW route; expected starting route: `/aw:build`

## Verification Expectations
- record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow
- show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces