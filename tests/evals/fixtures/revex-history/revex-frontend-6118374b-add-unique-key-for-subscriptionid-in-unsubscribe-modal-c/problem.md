# Sparse Ticket Prompt

## Context
Benchmark pack: RevEx Frontend + Backend
Repo: RevEx frontend
Product area: `wordpress`
Affected surface: `SitesContainer`
Change kind: `bugfix`
Baseline theme: add unique key for subscriptionId in unsubscribe modal components (#7776).

## Observed Need
A user-facing or runtime bug has been reported around `SitesContainer` in RevEx frontend, and the current behavior is not reliable enough to leave as-is.

## Task
You are working in RevEx frontend. A user-facing or runtime bug has been reported around `SitesContainer` in RevEx frontend, and the current behavior is not reliable enough to leave as-is. Deliver the smallest safe bugfix in `SitesContainer` using the expected AW route `/aw:investigate`. Success criteria: resolve the user-visible or runtime issue in `SitesContainer` without widening scope; preserve adjacent behavior and existing contracts unless a narrow compatibility adjustment is required; capture the failure mode or behavior gap clearly before proposing the patch. Verification expectations: record narrow evidence that makes the candidate PR reviewable against the changed files or affected flow; show a focused regression check or narrow supporting note that addresses the original failure mode.

## Success Criteria
- resolve the user-visible or runtime issue in `SitesContainer` without widening scope
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