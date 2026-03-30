---
name: aw-ship
description: End-to-end orchestration skill that composes aw-plan, aw-execute, aw-verify, and aw-deploy into one explicit shipping workflow.
trigger: User explicitly asks to do the whole flow, take work end to end, or ship verified work in one command.
---

# AW Ship

## Purpose

`aw-ship` is the composite workflow skill.
It does not replace the stage skills.
It selects and runs the smallest correct sequence of:

- `aw-plan`
- `aw-execute`
- `aw-verify`
- `aw-deploy`

## Decision Rule

Default to the smallest correct sequence.

Examples:

- idea to build-ready -> `aw-plan`
- approved spec to verified implementation -> `aw-execute -> aw-verify`
- verified branch to staging -> `aw-deploy`
- verified work to PR and staging -> `aw-deploy(pr -> staging)`
- from idea to staged result -> `aw-plan -> aw-execute -> aw-verify -> aw-deploy`

## Execution Phases

### 1. Intake

- read the request
- inspect existing artifacts and branch state
- identify the requested end state

### 2. Sequence Selection

- determine which stages are already satisfied
- choose the minimum remaining stage sequence
- state the chosen sequence clearly

### 3. Planning Gate

If planning artifacts are missing for the requested outcome:

- run `aw-plan`
- stop if planning produces unresolved questions or missing prerequisites

### 4. Execution Gate

If implementation is still needed:

- run `aw-execute`
- stop on unresolved blockers

### 5. Verification Gate

Before any release outcome:

- run `aw-verify`
- if verify fails, route back to `aw-execute`

### 6. Deploy Gate

Only when the requested end state requires release:

- run `aw-deploy`
- respect repo archetype and deploy profile
- fail closed for unknown staging paths

### 7. Learning

- append end-to-end learnings
- record unfinished work and next action

## Hard Gates

- never skip verify before deploy
- never deploy from an unknown repo archetype without configuration
- never broaden the request beyond the requested end state
- always name the blocking stage if the workflow stops

## Final Output Shape

Always end with:

- `Selected Sequence`
- `Completed Stages`
- `Artifacts Written`
- `Verification Status`
- `Release Outcome`
- `Open Blockers`
- `Recommended Next`
