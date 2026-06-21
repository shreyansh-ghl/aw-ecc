# AW Vulqan Daily Outcome Report Template

```markdown
# AW Vulqan Daily Outcome Report

Window: <start> to <end>
Mission: <team>/<mission>
Author scope: <authors>

## Executive Summary

- Runs scanned: <n>
- Unique PRs scanned: <n>
- Vulqan comments: <n>
- Resolved comments: <n> (<pct>)
- Likely fixed comments: <n> (<pct of resolved>, <pct of total>)
- Resolved but unverified: <n>
- Unresolved on merged PRs: <n>

## Outcome By Severity

| Severity | Total | Likely fixed | Resolved unverified | Unresolved open | Unresolved merged |
| --- | ---: | ---: | ---: | ---: | ---: |

## Outcome By Category

| Category | Total | Likely fixed | Resolution % | Fix-likelihood % | Representative issue |
| --- | ---: | ---: | ---: | ---: | --- |

## Top Developer-Solved Findings

| Severity | PR | Category | Vulqan callout | Evidence |
| --- | --- | --- | --- | --- |

## Repos Needing Attention

| Repo | Unresolved open | Unresolved merged | Top category |
| --- | ---: | ---: | --- |

## Trend Since Previous Report

- Comment volume: <up/down/flat>
- Likely fixed rate: <up/down/flat>
- Noisiest category: <category>
- Highest-value category: <category>

## Interpretation

What moved, what is noisy, which categories appear useful, and which categories need prompt/rule tuning.

## Caveats

Resolved is not fixed. Likely fixed is evidence-backed, not semantic proof. Explicit `goalOutcome` should replace heuristics as soon as it is available.

## Artifacts

- Comment CSV: <path>
- PR CSV: <path>
- Summary JSON: <path>
```
