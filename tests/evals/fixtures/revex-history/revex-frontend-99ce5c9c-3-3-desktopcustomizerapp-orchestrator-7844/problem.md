# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx frontend
Product area: `desktop-customizer`
Affected surface: `desktop-customizer`
Change kind: `feature`
Baseline theme: [3/3] DesktopCustomizerApp orchestrator (#7844).

## Observed Need
A product or engineering improvement is needed around `desktop-customizer` in RevEx frontend, inside the broader `desktop-customizer` area.

## Task
You are working in RevEx frontend. A product or engineering improvement is needed around `desktop-customizer` in RevEx frontend, inside the broader `desktop-customizer` area. Deliver the smallest safe feature in `desktop-customizer` using the expected AW route `/aw:build`. Success criteria: deliver the requested feature in `desktop-customizer` using the smallest reviewable slice; stay within the touched product area and avoid unnecessary interface churn; include implementation evidence that ties directly to the touched files or flow. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces; include delivery or rollout evidence for any release-path changes.

## Success Criteria
- deliver the requested feature in `desktop-customizer` using the smallest reviewable slice
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