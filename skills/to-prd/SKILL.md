---
name: to-prd
description: Synthesize existing conversation, repo context, and decisions into a local AW `prd.md`. Use whenever `/aw:plan` creates a new feature — every planning mode requires a user-facing PRD (brief for technical-only requests), when product assumptions need to be frozen before spec/tasks, or when the user asks to turn discovery into a PRD.
---

# To PRD

Turn already-gathered context into a local AW PRD.

This skill does not require a project issue tracker and does not publish anything remotely unless the user explicitly asks for that as a separate action. Its default output is the canonical `.aw_docs/features/<feature_slug>/prd.md` content used by AW planning.

## When To Use

- `/aw:plan` is in `product` or `full` mode.
- A fuzzy request needs product scope, success criteria, actors, or non-goals frozen before technical planning.
- Existing discovery, tickets, conversation, screenshots, or notes are enough to synthesize a PRD.

## When Not To Use

- The request is already a well-defined technical change and `spec.md` can be written without product discovery.
- The user explicitly asks for Markdown-only technical planning.
- The needed product facts are missing. In that case, ask the smallest useful question or route through `grill-with-docs` first.

## Process

1. Gather only the context needed for the PRD:
   - user request and conversation decisions
   - relevant existing planning artifacts
   - repo context only when it clarifies current behavior or constraints
   - domain glossary and ADRs when they exist
2. Identify the product shape:
   - problem
   - target users or actors
   - desired outcome
   - in-scope and out-of-scope behavior
   - acceptance criteria
   - risks, assumptions, dependencies, and open questions
3. Write PRD-ready content for `.aw_docs/features/<feature_slug>/prd.md`.
4. Preserve unresolved questions instead of inventing product facts.
5. Hand the PRD back to `aw-plan` so the stage can decide whether `spec.md`, `design.md`, or `tasks.md` are still needed.

## PRD Shape

Use this structure unless the existing repo has a stricter local template:

```md
# <Feature Name> PRD

## Goal

## Problem

## Users / Actors

## Scope

## Non-Goals

## User Stories

## Acceptance Criteria

## Assumptions and Constraints

## Risks and Mitigations

## Open Questions
```

## Guardrails

- Do not require a PRD for every technical plan.
- Do not publish to GitHub, Linear, Jira, or any other tracker unless explicitly requested.
- Do not create implementation tasks here; use `to-issues` or `aw-tasks` for vertical slice breakdown.
- Do not turn a PRD into a contract for code files; keep file paths in `spec.md` or `tasks.md`.
