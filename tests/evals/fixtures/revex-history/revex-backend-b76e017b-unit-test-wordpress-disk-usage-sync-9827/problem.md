# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx backend
Product area: `wordpress`
Affected surface: `wordpress:src/disk-usage-sync`
Change kind: `implementation`
Baseline theme: Unit Test - WordPress [Disk-Usage-Sync] (#9827).

## Observed Need
A product or engineering improvement is needed around `wordpress:src/disk-usage-sync` in RevEx backend, inside the broader `wordpress` area.

## Task
You are working in RevEx backend. A product or engineering improvement is needed around `wordpress:src/disk-usage-sync` in RevEx backend, inside the broader `wordpress` area. Deliver the smallest safe implementation in `wordpress:src/disk-usage-sync` using the expected AW route `/aw:build`. Success criteria: deliver the requested implementation in `wordpress:src/disk-usage-sync` using the smallest reviewable slice; stay within the touched product area and avoid unnecessary interface churn; include implementation evidence that ties directly to the touched files or flow. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show the smallest reviewable validation or diff-based proof without reopening unrelated surfaces.

## Success Criteria
- deliver the requested implementation in `wordpress:src/disk-usage-sync` using the smallest reviewable slice
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