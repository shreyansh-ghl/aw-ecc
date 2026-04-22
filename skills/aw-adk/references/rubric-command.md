# Rubric: Command Quality (10 dimensions, /100)

Evaluates the quality of an AW command definition file.

## Scoring Table

| # | Dimension | 0 (Missing) | 5 (Partial) | 10 (Complete) |
|---|-----------|-------------|-------------|---------------|
| 1 | **Frontmatter** | Missing | `name` + `description` present | `name` + `description` + `argument-hint` + `mcp` list |
| 2 | **Protocol Reference** | Missing | Generic mention of a protocol | Explicit AW-PROTOCOL reference + skill loading gate requirement |
| 3 | **Agent Roster** | Missing | Informal mentions of agents in prose | Table with phase, agent name, tier, and skills loaded per agent |
| 4 | **Skill Loading Gate** | Missing | Partial mention of skill loading | Full blocking gate: agent -> skills -> learnings chain before execution |
| 5 | **Phase Structure** | No phases defined | Phases listed without I/O contracts | Numbered phases with input, output, and human checkpoints per phase |
| 6 | **Output Format** | Missing | Vague description | Concrete markdown template with placeholders and field names |
| 7 | **Human Checkpoints** | None defined | 1 vague mention of review | Explicit gates with approval criteria and proceed/halt behavior |
| 8 | **Learning / Transparency** | Missing | Mentions learning broadly | Per-step .md artifacts + transparency JSON + learnings append protocol |
| 9 | **User Communication** | Silent execution | Some status messages | Status message per phase with progress indicator format |
| 10 | **Error Handling** | Missing | "Retry if failed" | Per-phase failure paths, fallback agents, and halt conditions |

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 90-100 | Production-grade. Fully orchestrated with checkpoints and error recovery. |
| **A** | 75-89 | Strong. Minor gaps in error handling or transparency artifacts. |
| **B** | 60-74 | Functional. Phases exist but missing checkpoints or fallback paths. |
| **C** | 40-59 | Draft. Basic structure present but no orchestration rigor. |
| **D** | 0-39 | Stub or broken. Not executable as a command. |

## How to use this rubric

1. Open the command definition file.
2. Score each dimension independently (0, 5, or 10).
3. Sum all 10 scores for a total out of 100.
4. Map the total to a tier using the thresholds above.
5. Commands scoring below B-tier should not be shipped to users -- focus on phase structure and error handling first.
