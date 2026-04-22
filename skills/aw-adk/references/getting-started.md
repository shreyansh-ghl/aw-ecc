---
name: getting-started
description: Quickstart guide for creating CASRE artifacts with the ADK
---

# Getting Started with the ADK

## Your First Artifact in 5 Steps

1. **Say what you want.** Use natural language — the ADK classifies the type for you.
2. **Answer the interview.** The ADK asks targeted questions based on the artifact type.
3. **Review the scaffold.** The ADK creates the file at the correct registry path.
4. **Check the score.** The ADK scores your artifact against the type-specific rubric.
5. **Run the evals.** The ADK creates 2+ evals and validates them.

## Example Prompts by Type

### Agent
> Create an agent for code review automation in the platform/review namespace. It should analyze PR diffs for security issues, performance regressions, and style violations. Tools: Read, Grep, Glob, Bash. Model: sonnet.

### Skill
> Create a skill for MongoDB aggregation patterns in the platform/data namespace. Cover $lookup, $unwind, $group, pagination, and index-aware pipeline design.

### Command
> Create a command for incident response in the platform/infra namespace. Phases: triage → investigate → mitigate → postmortem. Human checkpoint before mitigation.

### Rule
> Create a rule called no-direct-db-connection for the backend domain. All database access must go through @platform-core/* packages. Severity: MUST. File patterns: *.service.ts, *.repository.ts.

### Eval
> Create evals for the existing code-reviewer agent at .aw/.aw_registry/platform/review/agents/code-reviewer.md. One happy path, one where the PR has no issues but the agent flags false positives.

## Common Intent Phrases

These phrases trigger the ADK via the `using-aw-skills` router:

- "create an agent/skill/command/rule/eval"
- "score my agent/skill"
- "audit all agents in platform/services"
- "fix the lint errors on this skill"
- "improve the payments-processor agent"

## What Happens Under the Hood

Every create follows the same 14-step pipeline:

```
CLASSIFY → INTERVIEW → RESOLVE PATH → SCAFFOLD → CHECKPOINT →
LINT → SCORE → EVAL GATE (2+) → TEST RUNS → ITERATE →
DESCRIPTION OPT → CROSS-IDE → REGISTRY UPDATES → SYNC
```

No steps are optional. Rules, agents, commands, skills, and evals all go through the full flow.
