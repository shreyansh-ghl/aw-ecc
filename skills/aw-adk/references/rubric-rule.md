# Rubric: Rule Quality (10 dimensions, /100)

Evaluates the quality of an AW rule definition file. Expands the original 5-dimension /50 rubric from aw-rules to 10 dimensions /100.

## Scoring Table

| # | Dimension | 0 (Missing) | 5 (Partial) | 10 (Complete) |
|---|-----------|-------------|-------------|---------------|
| 1 | **Frontmatter** | Missing | `id` + `severity` present | `id` + `severity` + `domains` + `paths` glob patterns |
| 2 | **Rule Statement** | Missing | Vague or ambiguous phrasing | One clear sentence stating the requirement and why it matters |
| 3 | **WRONG Example** | Missing | Generic or hypothetical violation | Real violation pattern drawn from actual codebase conventions |
| 4 | **RIGHT Example** | Missing | Generic fix | Verified fix grounded in platform docs or referenced skills |
| 5 | **Skill Link** | Missing | Wrong or broken link | Correct link to an existing, relevant skill |
| 6 | **Severity Justification** | Missing | Just states MUST/SHOULD without rationale | Explains why this severity: risk, blast radius, precedent |
| 7 | **Automation Path** | Missing | "Can be linted" without specifics | Specific lint rule, pre-commit hook, or CI script that enforces this |
| 8 | **Scope Precision** | Too broad ("all code") | Domain-scoped (e.g., "backend" or "frontend") | Path-scoped with glob patterns (e.g., `services/*/src/**/*.ts`) |
| 9 | **Exceptions** | No mention of edge cases | "Edge cases exist" without detail | Explicit exceptions listed with justification for each |
| 10 | **Manifest Entry** | Missing from rule-manifest.json | Incomplete entry (missing fields) | Full entry: id, severity, domains, description, principle |

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 90-100 | Production-grade. Enforceable, scoped, and documented with automation. |
| **A** | 75-89 | Strong. Clear rule with examples; minor gaps in automation or exceptions. |
| **B** | 60-74 | Functional. Rule is understandable but lacks enforcement path or scope precision. |
| **C** | 40-59 | Draft. Statement exists but missing examples or justification. |
| **D** | 0-39 | Stub or broken. Not enforceable or understandable. |

## How to use this rubric

1. Open the rule file and its corresponding entry in `rule-manifest.json`.
2. Score each dimension independently (0, 5, or 10).
3. Sum all 10 scores for a total out of 100.
4. Map the total to a tier using the thresholds above.
5. Rules below B-tier should not be added to the active manifest -- prioritize adding WRONG/RIGHT examples and an automation path.
