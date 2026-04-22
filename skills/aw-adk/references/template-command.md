# Command Template

Copy the scaffold below as your starting point. Replace all `<placeholder>` tokens.

---

## Scaffold

````markdown
---
name: <namespace>:<command-slug>
description: "<1-2 sentences. What workflow this automates and when to use it.>"
argument-hint: "[target] [--flag]"
mcp: []
---

# <Command Display Name>

<1-2 sentence purpose. What end-to-end workflow does this command automate?>

## Protocol

> **AW-PROTOCOL**: This command follows the AW orchestration protocol.
> All phases execute sequentially. Each phase has defined inputs, outputs,
> and checkpoints. Failure at any checkpoint triggers the on-failure handler
> before proceeding.

### Skill Loading Gate

> **BLOCKING**: Before executing ANY phase, resolve and load the following skills.
> Do not proceed until all skills are confirmed loaded.

| Skill | Purpose | Required |
|-------|---------|----------|
| `<namespace>-<skill-1>` | <what it provides> | Yes |
| `<namespace>-<skill-2>` | <what it provides> | Yes |
| `<namespace>-<skill-3>` | <what it provides> | No |

```
Resolve: <skill-1>, <skill-2>
Confirm: all loaded
Proceed: Phase 0
```

## Core Principles

1. **<Principle 1>** — <Why this principle matters for this workflow>
2. **<Principle 2>** — <Why this principle matters>
3. **<Principle 3>** — <Why this principle matters>

## Agent Roster

| Agent | Role | Phase(s) | Model |
|-------|------|----------|-------|
| `<agent-1>` | <what it does> | <phase numbers> | sonnet |
| `<agent-2>` | <what it does> | <phase numbers> | sonnet |
| `<agent-3>` | <what it does> | <phase numbers> | haiku |

## Phase 0: Initialize

**Purpose:** Validate inputs, resolve paths, establish workspace.

1. Parse arguments: `<expected arguments>`
2. Validate target exists: `<validation command>`
3. Create workspace directory:

```bash
mkdir -p <workspace-path>
```

4. Snapshot current state (for rollback):

```bash
<snapshot command>
```

**Output:** Validated inputs, workspace path, snapshot reference
**Checkpoint:** All inputs valid, workspace exists, snapshot saved
**On-failure:** Report missing inputs with usage example, exit

---

## Phase 1: <Phase Name>

**Purpose:** <What this phase accomplishes and why it comes first>

**Agent:** `<agent-name>`
**Input:** <What this phase receives from Phase 0 or prior phase>

### Steps

1. <Step with concrete action>
2. <Step with concrete action>
3. <Step with concrete action>

```bash
# Example command for this phase
<command>
```

**Output:** <Specific artifacts this phase produces>
**Checkpoint:** <Verifiable criteria — how to confirm this phase succeeded>
**On-failure:** <What to do if the checkpoint fails — retry, skip, escalate>

---

## Phase 2: <Phase Name>

**Purpose:** <What this phase accomplishes>

**Agent:** `<agent-name>`
**Input:** <Output from Phase 1>

### Steps

1. <Step with concrete action>
2. <Step with concrete action>

**Output:** <Artifacts produced>
**Checkpoint:** <Success criteria>
**On-failure:** <Recovery strategy>

---

## Phase 3: <Phase Name>

**Purpose:** <What this phase accomplishes>

**Agent:** `<agent-name>`
**Input:** <Output from Phase 2>

### Steps

1. <Step with concrete action>
2. <Step with concrete action>

**Output:** <Artifacts produced>
**Checkpoint:** <Success criteria>
**On-failure:** <Recovery strategy>

---

## Phase N: <Human Checkpoint> (optional)

**Purpose:** Pause for human review before irreversible actions.

**Input:** <Summary of all prior phase outputs>

### Review Prompt

```
The following changes are ready for <action>:

<summary of changes>

Proceed? [y/n]
```

**On-approve:** Continue to next phase
**On-reject:** <What to do — rollback, revise, or exit>

---

## Phase N+1: Deliver

**Purpose:** Produce final deliverables and report results.

### Steps

1. Aggregate outputs from all phases
2. Generate summary report
3. Clean up workspace (if applicable)

**Output:** Final deliverables (see table below)
**Checkpoint:** All required deliverables exist and pass validation

## Compound Learnings

<Patterns discovered across phases that should be captured for future runs.
This section is populated after the first few executions.>

- <Learning 1 — e.g., "Phase 2 consistently takes 3x longer than Phase 1; consider parallelizing sub-steps">
- <Learning 2 — e.g., "Agent X produces better output when given Phase 1 output as structured JSON, not prose">

## Output Format

```
## <Command Name> Results

**Status:** <COMPLETE | PARTIAL | FAILED>
**Duration:** <time>
**Phases completed:** <N/M>

### Phase Summary
| Phase | Status | Key Output |
|-------|--------|------------|
| 0: Init | PASS | Workspace at <path> |
| 1: <name> | PASS | <output summary> |
| 2: <name> | PASS | <output summary> |

### Deliverables
<list of produced artifacts with paths>

### Issues
<any failures, warnings, or items needing follow-up>
```

## Error Handling

| Error | Phase | Recovery |
|-------|-------|----------|
| <error-type-1> | <phase> | <what to do> |
| <error-type-2> | <phase> | <what to do> |
| <error-type-3> | Any | <what to do> |
| Unrecoverable failure | Any | Rollback to Phase 0 snapshot, report error |

## References

- [<skill-name>](../skills/<slug>/SKILL.md) — <what it provides>
- [<reference-name>](references/<file>.md) — <what it covers>
````

---

## Section-by-Section Guide

### Frontmatter

- `name` — follows naming convention: `aw:platform-<domain>-<slug>` for platform, `aw:<team>-<sub_team>-<slug>` for teams (or `aw:<team>-<sub_team>-<domain>-<slug>` when domain nesting is used), `aw:<slug>` for stage commands. All hyphens, no colons (except the `aw:` prefix). See [registry-structure.md](registry-structure.md) for the full naming table.
- `description` — front-load the workflow being automated
- `argument-hint` — shown in help text; keep it short
- `mcp` — list of MCP servers this command requires (empty if none)

### Protocol & Skill Loading Gate

The AW-PROTOCOL reference signals that this is a managed pipeline. The skill loading gate is BLOCKING — the command must not execute any phase until all required skills are confirmed loaded. This prevents partial execution with missing context.

### Core Principles

Three to five principles that shape decision-making across all phases. These are not rules (those go in rules/); they are workflow-specific values. Example: "Prefer incremental rollout over big-bang deployment."

### Agent Roster

Declares all agents used across phases upfront. This lets the reader understand the full cast before diving into phases. Include the model tier — it affects cost and capability expectations.

### Phase Structure

Every phase follows the same contract:

- **Purpose** — Why this phase exists (not what it does — the steps cover that)
- **Agent** — Which agent executes this phase
- **Input** — Explicit data dependency on prior phases
- **Steps** — Concrete, numbered actions
- **Output** — What this phase produces (consumed by later phases)
- **Checkpoint** — Verifiable success criteria (binary: pass or fail)
- **On-failure** — Recovery strategy (retry, skip, escalate, rollback)

This structure makes commands debuggable. When Phase 3 fails, you check Phase 3's checkpoint and on-failure handler.

### Human Checkpoints

Insert before irreversible actions (deployments, data migrations, external API calls). The command pauses, presents a summary, and waits for approval. Include a clear on-reject path.

### Compound Learnings

Populated after real executions. This is where operational wisdom accumulates. Review after the first 5-10 runs and update the command based on observed patterns.

### Error Handling Table

Exhaustive mapping of known failure modes to recovery strategies. The "Any" phase row catches unexpected failures with a universal rollback strategy.

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| No checkpoints between phases | Cascading failures — Phase 3 fails because Phase 1 silently produced bad output | Add checkpoint to every phase |
| Monolithic single-phase command | Not a command — it's a script. Commands orchestrate multiple agents through phases | Break into 3+ phases or make it a skill |
| No skill loading gate | Agents execute without required context, producing shallow output | Add BLOCKING gate with required skills |
| Phase depends on implicit state | Breaks when phases are re-run or reordered | Make all inputs explicit in the Input field |
