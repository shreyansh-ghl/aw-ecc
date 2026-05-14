---
name: to-issues
description: Break a PRD, spec, or plan into local vertical slices that can feed `tasks.md` or optional tracker issues. Use when AW planning needs tracer-bullet work breakdown before implementation tasks.
---

# To Issues

Break a plan into independently reviewable vertical slices.

In AW, "issues" means implementation-ready work items by default, not necessarily remote GitHub/Linear/Jira issues. The normal output feeds `.aw_docs/features/<feature_slug>/tasks.md` and `state.json`. Publish remote issues only when the user explicitly asks and the target tracker is configured.

## When To Use

- `/aw:plan` is about to write `tasks.md` and the work needs a vertical breakdown.
- A PRD or spec is too broad to hand directly to `/aw:build`.
- The user asks to convert a plan into tickets, issues, slices, or implementation chunks.

## Process

### 1. Gather Context

Read the source plan, PRD, spec, or conversation context. If an external issue URL is supplied, fetch only the referenced issue and relevant comments.

### 2. Draft Vertical Slices

Each slice should deliver a narrow but complete path through the system. Avoid horizontal slices like "build all backend first" or "write all tests first".

For each slice, capture:

- **Title**: short behavior-oriented name
- **Type**: `AFK` when an agent can execute from artifacts; `HITL` when a human decision/design review is required
- **Goal**: the end-to-end behavior or proof this slice delivers
- **Blocked by**: prior slices or decisions
- **Acceptance criteria**: observable pass conditions
- **Suggested validation**: command, test, review, or runtime proof
- **Write scope**: exact or likely files/modules when known safely

### 3. Check Granularity

Prefer many thin slices over a few bulky phases. A good slice is independently demoable or verifiable, but still small enough to review and roll back.

### 4. Hand Off To AW Tasks

Return the approved or best-effort slice list to `aw-tasks` so it can create `tasks.md` with phases, file maps, validation commands, and dependency order.

### 5. Optional Remote Publishing

Only publish tracker issues when all of these are true:

- the user explicitly asks for remote issue creation
- the target tracker and project are known
- labels/assignees/status conventions are known
- parent issue handling is clear

Never close or modify a parent issue as part of slice generation unless the user explicitly asks.

## Guardrails

- Do not require an issue tracker for AW planning.
- Do not rely on external setup commands.
- Do not write `tasks.md` directly unless the caller asks; return the slice model to `aw-tasks`.
- Do not invent file paths when the codebase has not been inspected enough to infer them safely.
