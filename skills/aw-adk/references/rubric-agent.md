# Rubric: Agent Quality (10 dimensions, /100)

Evaluates the quality of an AW agent definition file.

## Scoring Table

| # | Dimension | 0 (Missing) | 5 (Partial) | 10 (Complete) |
|---|-----------|-------------|-------------|---------------|
| 1 | **Identity & Personality** | No identity defined | Has role but missing personality, memory, or experience | Full 4-field identity: role, personality, memory, experience |
| 2 | **Core Mission** | Missing or vague | 1 generic sentence | 2-3 specific sentences naming domain, outcomes, scope boundaries |
| 3 | **Critical Rules** | Missing or soft suggestions | 1-2 rules without BLOCK/NEVER keywords | 3-5 hard rules with BLOCK/NEVER/ALWAYS and measurable thresholds |
| 4 | **Process / Workflow** | Missing | Numbered list without code or commands | Step-by-step with input/output per step, code examples, bash commands |
| 5 | **Deliverables** | Missing | Table with names only | Table with format + quality bar + inline template for each deliverable |
| 6 | **Communication Style** | Missing or 1 sentence | 2 personality traits described | 3-4 example phrases showing distinct voice and tone |
| 7 | **Code Examples** | No code blocks | 1 generic block | 2+ domain-specific blocks showing good vs. bad patterns |
| 8 | **Learning & Memory** | Missing | Lists what to remember | Pattern recognition + anti-patterns + cross-session learning protocol |
| 9 | **Success Metrics** | Missing or vague | 2-3 metrics without numbers | 4-5 quantified targets with explicit thresholds |
| 10 | **Advanced Capabilities** | Missing | 1-2 bullets | 3+ mastery areas showing growth trajectory from basic to expert |

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 90-100 | Production-grade. Agent is distinctive, reliable, and self-improving. |
| **A** | 75-89 | Strong. Minor gaps in voice, metrics, or advanced capabilities. |
| **B** | 60-74 | Functional. Usable but lacks personality depth or measurable targets. |
| **C** | 40-59 | Draft. Core mission exists but workflow and deliverables need work. |
| **D** | 0-39 | Stub or broken. Not usable without significant rewrite. |

## How to use this rubric

1. Open the agent definition file.
2. Score each dimension independently (0, 5, or 10).
3. Sum all 10 scores for a total out of 100.
4. Map the total to a tier using the thresholds above.
5. Prioritize fixing dimensions that scored 0 -- these represent missing sections that block agent effectiveness.
