---
name: performance-optimization
description: Optimizes performance with a measure-first workflow. Use when performance requirements exist, when regressions are suspected, or when user-visible speed and efficiency matter.
origin: ECC
---

# Performance Optimization

## Overview

Measure first, optimize second.
Performance work should improve a real bottleneck, not just produce clever code.

## When to Use

- a feature has explicit performance budgets or SLAs
- users or monitoring report slow behavior
- Core Web Vitals or endpoint timings are regressing
- large datasets, hot paths, or expensive rendering are involved
- review identifies likely performance risk that needs proof

**When NOT to use**

- there is no measurement and no evidence of a problem
- the "optimization" is really a speculative rewrite

## Workflow

1. Choose the performance goal.
   Name the metric that matters:
   - browser responsiveness
   - Core Web Vitals
   - API latency
   - query efficiency
   - throughput or batch time
2. Establish a baseline.
   Use `references/performance-checklist.md`.
   Capture the current measurement before touching code.
3. Localize the bottleneck.
   Identify whether the cost is in:
   - network
   - rendering
   - computation
   - data access
   - bundle or startup cost
4. Apply the smallest meaningful fix.
   Optimize the proven bottleneck, not the whole subsystem.
5. Measure again.
   Confirm the change improved the chosen metric and did not create a regression elsewhere.
6. Guard the gain.
   Add follow-up monitoring, benchmark expectations, or review notes so the regression is less likely to return.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This looks slow, so I'll optimize it now." | Visual intuition is not measurement. |
| "I'll rewrite it for performance just in case." | Premature optimization adds complexity and often misses the real bottleneck. |
| "A micro-optimization is better than no optimization." | Small cleverness is noise if the dominant cost lives elsewhere. |
| "The benchmark is enough; user experience will follow." | Good optimization improves the metric that matters to the user or operator, not just the easiest one to measure. |

## Red Flags

- no baseline exists before code changes
- the optimization changes multiple subsystems at once
- claimed improvements are not measured after the fix
- the new code is much harder to maintain for marginal gain

## Verification

After optimizing, confirm:

- [ ] the target metric was explicit
- [ ] a before/after measurement exists
- [ ] the fix targeted the actual bottleneck
- [ ] no obvious regression was introduced elsewhere
- [ ] the performance gain is documented in a form reviewers can verify
