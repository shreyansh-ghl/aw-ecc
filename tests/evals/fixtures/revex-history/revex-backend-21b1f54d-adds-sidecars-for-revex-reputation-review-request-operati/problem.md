# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx backend
Product area: `reputation`
Affected surface: `reputation:deployments/production`
Change kind: `implementation`
Baseline theme: adds sidecars for revex-reputation-review-request-operations-worker (#10016).

## Observed Need
A product or engineering improvement is needed around `reputation:deployments/production` in RevEx backend, inside the broader `reputation` area.

## Task
You are working in RevEx backend. A product or engineering improvement is needed around `reputation:deployments/production` in RevEx backend, inside the broader `reputation` area. Deliver the smallest safe implementation in `reputation:deployments/production` using the expected AW route `/aw:build`. Success criteria: deliver the requested implementation in `reputation:deployments/production` using the smallest reviewable slice; stay within the touched product area and avoid unnecessary interface churn; include implementation evidence that ties directly to the touched files or flow. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces; include delivery or rollout evidence for any release-path changes.

## Success Criteria
- deliver the requested implementation in `reputation:deployments/production` using the smallest reviewable slice
- stay within the touched product area and avoid unnecessary interface churn
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
- include delivery or rollout evidence for any release-path changes
