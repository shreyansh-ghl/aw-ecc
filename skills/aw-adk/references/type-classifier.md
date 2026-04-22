# CASRE Type Classifier

Decision tree for classifying user requests into the correct artifact type. Use this before any ADK work to prevent misclassification.

## Decision Tree

```
What does the user want?
│
├── "I want to define a standard/constraint/rule"
│   └── RULE — An enforceable constraint with WRONG/RIGHT examples
│
├── "I want to test/validate an existing artifact"
│   └── EVAL — Scenarios that verify an artifact works correctly
│
├── "I want a multi-step workflow that orchestrates agents"
│   └── COMMAND — A pipeline with phases, agent assignments, checkpoints
│
├── "I want a persona that makes decisions and uses tools"
│   └── AGENT — Has identity, judgment, model tier, and skills
│
├── "I want reusable knowledge, patterns, or checklists"
│   └── SKILL — Static knowledge loaded on demand
│
└── Ambiguous?
    → Ask: "Does this involve multiple phases with different agents,
       or is it a single body of knowledge?"
    → Ask: "Does this enforce a standard, or teach a practice?"
```

## Quick Classifier Table

| Signal | Type | Reasoning |
|---|---|---|
| "best practices for X" | Skill | Static knowledge, reference material |
| "review checklist for X" | Skill | Checklist = static knowledge |
| "pipeline from spec to deploy" | Command | Multi-phase workflow |
| "automate the ship process" | Command | Orchestration of agents |
| "expert in database optimization" | Agent | Persona with judgment |
| "reviewer that checks security" | Agent | Decision-making persona |
| "no hardcoded secrets allowed" | Rule | Enforceable constraint |
| "all PRs must have tests" | Rule | Standard with severity |
| "verify my agent works correctly" | Eval | Testing existing artifact |
| "add test cases for this skill" | Eval | Validation scenarios |

## Common Misclassifications

These are the most frequent mistakes. Catch them before scaffolding:

### "Create a command for X best practices"
**Wrong:** Command. **Right:** Skill.
**Why:** "Best practices" is static knowledge, not a multi-phase workflow. Commands orchestrate agents through pipeline phases.

### "Create a command that reviews X"
**Usually wrong:** Command. **Usually right:** Skill (review checklist).
**Exception:** If it's a multi-phase pipeline (analyze → review → report → remediate), then it IS a command.
**Ask:** "Is this a review checklist, or a multi-phase review pipeline?"

### "Create a command that acts as an X expert"
**Wrong:** Command. **Right:** Agent.
**Why:** "Acts as" = persona. Commands don't have identity. Agents do.

### "Create a rule for how to write good code"
**Wrong:** Rule. **Right:** Skill.
**Why:** Rules enforce specific constraints ("no bare any"). Skills teach practices ("how to write good code").

### "Create an agent that contains all MongoDB patterns"
**Wrong:** Agent. **Right:** Skill.
**Why:** A static body of knowledge is a skill. An agent has judgment and decision-making ability. The agent *loads* the skill.

## When to Redirect

If you classify and the user disagrees, don't argue. But explain your reasoning:

```
I'd suggest making this a skill rather than a command because:
- It's a body of knowledge (MongoDB patterns), not a multi-step workflow
- Skills are loaded on demand by agents — an agent can use this skill
- Commands orchestrate agents through phases, which isn't needed here

But if you prefer a command, I can scaffold one. What would you like?
```

## Type Relationship

Understanding how types relate helps classify correctly:

```
Commands orchestrate → Agents
Agents load → Skills
Rules constrain → All types
Evals validate → All types
```

- A command USES agents (assigns them to phases)
- An agent LOADS skills (references them in frontmatter)
- A rule CONSTRAINS any artifact (applies as a standard)
- An eval TESTS any artifact (validates it works)
