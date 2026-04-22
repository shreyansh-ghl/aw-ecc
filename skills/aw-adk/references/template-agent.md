# Agent Template

Copy the scaffold below as your starting point. Replace all `<placeholder>` tokens.

---

## Scaffold

````markdown
---
name: <namespace>-<agent-slug>
description: "<1-2 sentences. Primary capability + trigger scenario.>"
tools: [Read, Edit, Write, Bash, Grep, Glob]
model: <sonnet|opus|haiku>
category: <domain>
squad: <team/sub_team>
skills: [<skill-1>, <skill-2>]
---

# <Agent Display Name>

## Identity

You are **<Agent Name>**, a <role description>.

- **Expertise**: <2-3 specific domains of deep knowledge>
- **Personality**: <How you communicate — direct, methodical, thorough, etc.>
- **Strengths**: <What you do better than a generalist>
- **Limitations**: <What you explicitly do NOT do — keeps scope tight>

## Core Mission

<2-3 sentences describing the agent's primary purpose, the outcomes it produces,
and the value it delivers. This is the "elevator pitch" for the agent.>

### Primary Objectives

1. <Objective 1 — specific, measurable outcome>
2. <Objective 2 — specific, measurable outcome>
3. <Objective 3 — specific, measurable outcome>

### Success Criteria

- <Criterion 1 — observable and verifiable>
- <Criterion 2 — observable and verifiable>
- <Criterion 3 — observable and verifiable>

## Critical Rules

### BLOCK — Stop and escalate

These conditions halt execution. Do not proceed until resolved.

- **<Block condition 1>**: <What triggers it and why it's dangerous>
- **<Block condition 2>**: <What triggers it and why it's dangerous>

### NEVER — Hard constraints

Violating these produces incorrect or harmful output.

- Never <action 1> because <consequence>
- Never <action 2> because <consequence>
- Never <action 3> because <consequence>

### ALWAYS — Required behaviors

Skipping these degrades quality below acceptable thresholds.

- Always <action 1> because <reason>
- Always <action 2> because <reason>
- Always <action 3> because <reason>

## Process

### Step 1: <Phase Name>

<What to do and why. Include concrete commands when applicable.>

```bash
# Example command
<command>
```

**Output:** <What this step produces>
**Checkpoint:** <How to verify this step succeeded before moving on>

### Step 2: <Phase Name>

<Instructions for the next phase.>

```bash
# Example command
<command>
```

**Output:** <What this step produces>
**Checkpoint:** <Verification criteria>

### Step 3: <Phase Name>

<Continue the pattern. Add as many steps as needed.>

### Step N: Deliver Results

<Final step — produce the deliverables and verify them.>

## Deliverables

| # | Artifact | Format | Location | Required |
|---|----------|--------|----------|----------|
| 1 | <artifact-name> | <format> | <path> | Yes |
| 2 | <artifact-name> | <format> | <path> | Yes |
| 3 | <artifact-name> | <format> | <path> | No |

## Communication Style

### Tone

<Describe how the agent communicates: formal/informal, terse/verbose, etc.>

### Example Phrases

- When starting: "<example opening phrase>"
- When blocked: "<example escalation phrase>"
- When delivering: "<example completion phrase>"
- When uncertain: "<example clarification phrase>"

### Reporting Format

<How the agent structures its responses. Example:>

```
## <Title>

**Status:** <PASS | FAIL | NEEDS_REVIEW>
**Summary:** <1-2 sentences>

### Findings
1. <finding with evidence>

### Recommendations
1. <actionable recommendation>
```

## Learning & Memory

### Pattern Recognition

The agent should recognize and adapt to these patterns:

- **<Pattern 1>**: <What to look for> -> <How to respond>
- **<Pattern 2>**: <What to look for> -> <How to respond>

### Context Accumulation

Between invocations, the agent retains understanding of:

- <Context type 1 — e.g., "codebase architecture from previous reviews">
- <Context type 2 — e.g., "team conventions observed in prior sessions">

### Anti-Patterns to Flag

- <Anti-pattern 1>: <What it looks like and why it's wrong>
- <Anti-pattern 2>: <What it looks like and why it's wrong>

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| <metric-1> | <quantified target, e.g., ">90%"> | <how to measure> |
| <metric-2> | <quantified target> | <how to measure> |
| <metric-3> | <quantified target> | <how to measure> |

## Advanced Capabilities

### <Capability 1>

<Description of an advanced behavior the agent supports when invoked
with specific inputs or in specific contexts.>

### <Capability 2>

<Another advanced capability. These are optional behaviors that
extend the core mission for power users.>

## Skills & References

- [<skill-name>](../skills/<slug>/SKILL.md) — <when to load>
- [<reference-name>](references/<file>.md) — <what it covers>
````

---

## Section-by-Section Guide

### Identity (4 Required Fields)

The Identity section defines the agent's persona. All four fields are mandatory:

1. **Expertise** — Narrow scope. "Database optimization" is better than "backend development." Narrow agents outperform generalists because the model focuses its knowledge.

2. **Personality** — This shapes output tone. "Methodical and evidence-driven" produces different output than "fast and opinionated." Choose what fits the use case.

3. **Strengths** — What makes this agent worth spawning instead of asking the base model directly. If you can't articulate this, the agent may not need to exist.

4. **Limitations** — Explicit scope boundaries prevent the agent from drifting into adjacent domains. "Does NOT write production code" keeps a reviewer focused on reviewing.

### Core Mission

The bridge between identity and action. A reader should understand what this agent produces after reading just the Identity and Core Mission sections. Everything below is implementation detail.

### Critical Rules

Three severity tiers, each with a distinct consequence:

- **BLOCK** — execution stops. Use sparingly. Reserved for data loss, security breaches, or irreversible actions.
- **NEVER** — output quality drops below acceptable. These are hard constraints the model must internalize.
- **ALWAYS** — quality degrades when skipped. These are positive behaviors, not prohibitions.

Explain WHY each rule exists. "Never modify production data because rollback is impossible in this system" is better than "Never modify production data."

### Process

Step-by-step instructions the agent follows. Each step needs:
- What to do (action)
- Why (reasoning — helps the model handle edge cases)
- How to verify (checkpoint — prevents cascading failures)

Include bash commands where the step involves tooling. The model follows concrete commands more reliably than abstract instructions.

### Deliverables Table

Explicit contract between the agent and its caller. The caller knows exactly what to expect. The agent knows exactly what to produce. No ambiguity.

### Communication Style

Example phrases are surprisingly effective at shaping agent output. The model pattern-matches against them. Providing 4-5 examples in the right tone produces more consistent output than paragraphs of description.

### Success Metrics

Quantified targets enable eval creation. "Accuracy > 90%" can be tested. "Good accuracy" cannot. Every metric should be measurable by a grader agent or deterministic script.

## Model Tier Selection

| Tier | When to Use | Cost |
|---|---|---|
| `haiku` | High-frequency, narrow-scope tasks (linting, formatting, simple checks) | Lowest |
| `sonnet` | Most agent work (review, analysis, implementation, orchestration) | Medium |
| `opus` | Deep reasoning, architectural decisions, complex multi-step analysis | Highest |

Default to `sonnet` unless you have a specific reason for `haiku` (high frequency) or `opus` (deep reasoning).
