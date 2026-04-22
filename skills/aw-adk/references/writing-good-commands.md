# Writing Good Commands

A command is a user-facing pipeline that orchestrates agents, skills, and tools through defined phases to produce an end-to-end outcome. Commands are what users invoke (e.g., `/review-pr`, `/implement-feature`).

## Before / After: Command Structure

### Bad — monolith command

```yaml
name: review-pr
phases:
  - name: "Review"
    description: "Review the PR and provide feedback"
    agents: [code-reviewer, security-reviewer, performance-reviewer, test-reviewer, doc-reviewer]
    steps:
      - "Load the PR diff"
      - "Review everything"
      - "Output findings"
```

Problems: One phase does everything. No checkpoints. No skill loading. Five agents compete for context with no coordination. No error handling. The user sees nothing until the end.

### Good — phased pipeline with checkpoints

```yaml
name: review-pr
phases:
  - name: "Context"
    description: "Load PR context and determine review scope"
    agent: coordinator
    model: opus
    steps:
      - "Fetch PR diff and metadata via gh CLI"
      - "Classify changed files by domain (backend, frontend, infra, test)"
      - "Load relevant skills based on file types"
      - "Determine which review agents are needed"
    gate: "coordinator confirms scope and agent roster before proceeding"

  - name: "Review"
    description: "Parallel domain-specific reviews"
    agents:
      - code-reviewer (changed backend files)
      - security-reviewer (auth/input/secret files)
    model: sonnet
    execution: parallel
    steps:
      - "Each agent reviews its assigned files"
      - "Each agent produces structured findings with severity"

  - name: "Synthesis"
    description: "Merge findings and produce verdict"
    agent: coordinator
    model: opus
    steps:
      - "Collect findings from all reviewers"
      - "Deduplicate overlapping findings"
      - "Assign final verdict: BLOCK / APPROVE WITH COMMENTS / APPROVE"
    checkpoint: "Present findings to user for confirmation before posting"

  - name: "Publish"
    description: "Post review to GitHub"
    agent: coordinator
    steps:
      - "Format findings as PR review comments"
      - "Post via gh CLI"
```

## Phase Design Patterns

### Linear Pipeline

Phases execute sequentially. Output of phase N is input to phase N+1.

```
Context → Plan → Implement → Test → Review → Commit
```

**Use when:** Tasks have natural ordering where later phases depend on earlier results.

### Interactive Loop

A phase repeats until a condition is met, with human input between iterations.

```
Draft → [checkpoint: user reviews] → Revise → [checkpoint] → ... → Approve
```

**Use when:** Output quality requires human judgment (e.g., PRD drafting, design review).

### Parallel Fan-Out

Multiple agents work simultaneously on independent subtasks, then results merge.

```
Context → [security-review | code-review | perf-review] → Synthesis
```

**Use when:** Subtasks are independent and can run concurrently. Always follow with a synthesis phase.

### MCP-Driven

Phases interact with external systems (GitHub, Jenkins, Grafana) via MCP tools.

```
Fetch PR → Review → Post Comments → Trigger Build → Monitor
```

**Use when:** The command integrates with external services and needs to react to their responses.

## Anti-Pattern Catalog

### 1. No Checkpoints

**Symptom:** Command runs 10 minutes, produces wrong output, user has no opportunity to correct course.

**Fix:** Add at least 1 human checkpoint. Place it after the most consequential decision (usually after planning or before publishing).

**Rule of thumb:** Minimum 1 checkpoint, maximum 3. More than 3 creates friction. Fewer than 1 creates risk.

### 2. No Skill Loading Gate

**Symptom:** Agents start working without loading relevant skills. They use generic knowledge instead of your team's patterns.

**Fix:** Add a Context phase that classifies the task and loads appropriate skills before agents begin work.

```yaml
# BAD: agents start cold
phases:
  - name: "Review"
    agents: [code-reviewer]

# GOOD: context phase loads skills first
phases:
  - name: "Context"
    steps:
      - "Classify changed files by domain"
      - "Load skills: nestjs-patterns, mongoose-queries (based on file types)"
  - name: "Review"
    agents: [code-reviewer]  # now has loaded skills in context
```

### 3. No Error Handling

**Symptom:** If `gh pr diff` fails (network error, auth issue), the command crashes with no recovery.

**Fix:** Define fallback behavior for each phase:

```yaml
error_handling:
  network_failure: "Retry once, then report error to user with diagnostic info"
  empty_diff: "Report 'No changes found' and exit gracefully"
  agent_timeout: "Use partial results, note incomplete review in output"
```

### 4. Silent Execution

**Symptom:** User invokes command and sees nothing for 5 minutes.

**Fix:** Each phase should emit a progress signal:

```yaml
phases:
  - name: "Context"
    on_start: "Fetching PR #{{pr_number}} context..."
    on_complete: "Scope: {{file_count}} files across {{domains}} domains"
  - name: "Review"
    on_start: "Running {{agent_count}} reviewers in parallel..."
    on_complete: "Found {{finding_count}} findings ({{critical_count}} critical)"
```

### 5. Too Many Agents

**Symptom:** Command uses 7 agents, each invoked once. Context window is bloated with identity setup for agents that do minimal work.

**Fix:** Follow the agent roster rules below. If an agent does one small task, consider making it a step within another agent's workflow instead.

### 6. No Phase Gates

**Symptom:** Phase 2 proceeds even when Phase 1 produced garbage (e.g., empty plan, failed fetch).

**Fix:** Add gates between phases:

```yaml
gate: "Plan must contain at least 3 implementation steps and a test strategy"
```

If the gate fails, the command stops and reports to the user rather than wasting tokens on doomed downstream phases.

## Agent Roster Rules

### Minimize Unique Agents

Every unique agent added to a command costs context window (identity, mission, tools, rules). Use the minimum set.

| Command Complexity | Recommended Agent Count |
|-------------------|------------------------|
| Simple (single-domain) | 1-2 |
| Medium (cross-domain) | 2-3 |
| Complex (full pipeline) | 3-5 |

### Max 2-3 Uses Per Agent

If an agent is used more than 3 times in a command, it's doing too much. Either:
- Merge those phases into one agent invocation
- Split the agent's responsibilities

### Coordinator Is Opus

The coordinating agent (phase routing, synthesis, conflict resolution) should run on Opus. Worker agents run on Sonnet. Checklist agents run on Haiku.

```yaml
# GOOD: tiered model assignment
agents:
  coordinator: { model: opus, uses: [context, synthesis, publish] }
  code-reviewer: { model: sonnet, uses: [review] }
  lint-checker: { model: haiku, uses: [formatting-check] }
```

## Human Checkpoint Guidance

### Minimum: 1 Checkpoint

Every command that produces artifacts visible to others (PR comments, commits, messages) must have at least one checkpoint before publishing.

### Maximum: 3 Checkpoints

More than 3 checkpoints turns an automated command into a manual process. If you need that much human oversight, the command is not well-defined enough.

### Where to Place Checkpoints

| Placement | When |
|-----------|------|
| After planning | When the plan determines all downstream work |
| After review/synthesis | When findings will be published externally |
| Before destructive actions | Commits, deployments, PR comments |

### Checkpoint Format

```yaml
checkpoint:
  display: "Summary of what was done and what will happen next"
  options:
    - "proceed" — continue to next phase
    - "revise" — re-run current phase with feedback
    - "abort" — stop command, preserve artifacts so far
```

## Command Quality Checklist

- [ ] Minimum 2 phases (context + execution at minimum)
- [ ] Skill loading gate in first phase
- [ ] 1-3 human checkpoints at consequential decision points
- [ ] Progress signals on every phase (on_start, on_complete)
- [ ] Error handling with fallbacks for network, empty input, timeouts
- [ ] Agent count justified (not exceeding 5 for complex commands)
- [ ] Coordinator on Opus, workers on Sonnet, checkers on Haiku
- [ ] Gates between phases to prevent garbage propagation
- [ ] Each agent used 1-3 times (not more)
