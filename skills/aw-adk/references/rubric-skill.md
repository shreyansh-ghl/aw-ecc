# Rubric: Skill Quality (10 dimensions, /100)

Evaluates the quality of an AW skill file (SKILL.md + references/).

## Scoring Table

| # | Dimension | 0 (Missing) | 5 (Partial) | 10 (Complete) |
|---|-----------|-------------|-------------|---------------|
| 1 | **Frontmatter** | Missing | `name` + `description` present | `name` + `description` + `trigger` with "use when" clause |
| 2 | **Purpose Statement** | Missing | 1 vague sentence | 2-3 specific sentences naming domain, scope, and outcomes |
| 3 | **When to Use** | Missing | 1 trigger scenario | 3+ trigger scenarios covering distinct use cases |
| 4 | **Instructions** | Missing or vague | Numbered list without detail | Step-by-step with concrete actions, commands, decision points |
| 5 | **Code Examples** | No code blocks | 1 generic code block | 3+ domain-specific code blocks with context |
| 6 | **Checklists** | Missing | Basic bullet list | Items with pass/fail criteria, severity, and fix guidance |
| 7 | **References** | No references | Internal links only | Links to platform-docs + reference files in references/ |
| 8 | **Progressive Disclosure** | Everything in SKILL.md or too sparse | SKILL.md + some refs | SKILL.md < 5k words, detailed content in references/ |
| 9 | **Domain Specificity** | Generic / framework-agnostic | Mentions package names | Actual package names, design tokens, API patterns with versions |
| 10 | **Output Format** | No output template | Vague description of output | Concrete markdown template with field names and placeholders |

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 90-100 | Production-grade. Ready for cross-team adoption. |
| **A** | 75-89 | Strong. Minor gaps in examples or references. |
| **B** | 60-74 | Functional. Usable but missing depth in 2-3 dimensions. |
| **C** | 40-59 | Draft. Needs significant work before team use. |
| **D** | 0-39 | Stub or broken. Not usable without rewrite. |

## How to use this rubric

1. Open the skill's `SKILL.md` and its `references/` directory.
2. Score each dimension independently (0, 5, or 10).
3. Sum all 10 scores for a total out of 100.
4. Map the total to a tier using the thresholds above.
5. Record dimension-level scores to guide targeted improvements -- focus on any dimension scoring 0 or 5 first.
