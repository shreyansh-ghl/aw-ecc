# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx frontend
Product area: `power-dialer`
Affected surface: `power-dialer:src/components`
Change kind: `implementation`
Baseline theme: Feat/cu ghlen 7472 call event v3 (#5918).

## Observed Need
A product or engineering improvement is needed around `power-dialer:src/components` in RevEx frontend, inside the broader `power-dialer` area.

## Task
You are working in RevEx frontend. A product or engineering improvement is needed around `power-dialer:src/components` in RevEx frontend, inside the broader `power-dialer` area. Deliver the smallest safe implementation in `power-dialer:src/components` using the expected AW route `/aw:build`. Success criteria: deliver the requested implementation in `power-dialer:src/components` using the smallest reviewable slice; stay within the touched product area and avoid unnecessary interface churn; include implementation evidence that ties directly to the touched files or flow. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces.

## Success Criteria
- deliver the requested implementation in `power-dialer:src/components` using the smallest reviewable slice
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