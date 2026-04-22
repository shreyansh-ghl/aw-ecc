# Rubric: Eval Quality (10 dimensions, /100)

Evaluates the quality of an AW eval definition file used for benchmarking agent and skill performance.

## Scoring Table

| # | Dimension | 0 (Missing) | 5 (Partial) | 10 (Complete) |
|---|-----------|-------------|-------------|---------------|
| 1 | **Frontmatter** | Missing | `name` + `target` present | `name` + `target` + `category` + `difficulty` |
| 2 | **Task Clarity** | Missing or vague | Describes intent in general terms | Concrete task with specific artifact type, namespace, and domain |
| 3 | **Context** | Missing | Minimal (just a path or name) | Namespace, domain, target path, existing related work, key packages |
| 4 | **Expected Outcomes** | Missing | 1-2 vague expectations | 4+ specific, verifiable checkboxes with concrete acceptance criteria |
| 5 | **Grading Criteria** | Missing | Just PASS/FAIL | PASS/PARTIAL/FAIL with clear thresholds for each grade |
| 6 | **Evaluation Method** | Missing | Unspecified or implied | Explicit: deterministic, model-based, or hybrid with rationale |
| 7 | **Scenario Diversity** | Single happy path only | Happy path + 1 edge case | Happy + failure + edge case + adversarial scenario |
| 8 | **False-Pass Resistance** | Would pass a clearly wrong artifact | Some specificity in assertions | Assertions target quality dimensions, not just existence checks |
| 9 | **Reproducibility** | Non-deterministic or vague setup | Mostly reproducible with minor variance | Fully deterministic or clearly bounded stochastic with seed/tolerance |
| 10 | **Baseline Tracking** | No baseline mentioned | Mentions baseline informally | Explicit with/without comparison methodology and stored baseline scores |

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 90-100 | Production-grade. Reliable, reproducible, and resistant to false passes. |
| **A** | 75-89 | Strong. Good coverage; minor gaps in diversity or baseline tracking. |
| **B** | 60-74 | Functional. Tests the right thing but may miss edge cases or allow false passes. |
| **C** | 40-59 | Draft. Task is defined but grading criteria or scenarios need work. |
| **D** | 0-39 | Stub or broken. Not usable for benchmarking. |

## How to use this rubric

1. Open the eval definition file.
2. Score each dimension independently (0, 5, or 10).
3. Sum all 10 scores for a total out of 100.
4. Map the total to a tier using the thresholds above.
5. Evals below B-tier should not be included in benchmark suites -- prioritize false-pass resistance and scenario diversity to avoid misleading results.
