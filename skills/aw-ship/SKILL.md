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

- `aw-prepare`
- `aw-plan`
- `aw-execute`
- `aw-verify`
- `aw-deploy`

## Decision Rule

Default to the smallest correct sequence.
Once a sequence is selected, keep ownership of the whole sequence inside the same `/aw:ship` run until the requested end state is reached or a real blocker stops the next stage.

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
- do not stop after an internal stage merely because it completed its own artifact set when later stages are still part of the selected sequence

### 3. Preparation Gate

Before execution or deploy-oriented work:

- run `aw-prepare`
- confirm branch or worktree isolation is acceptable for the requested flow
- confirm required artifacts and setup prerequisites exist
- stop early if setup blockers make the next stage unsafe
- if repo metadata is missing only because the work is running in a source snapshot or eval workspace, record the degraded isolation warning and continue with local artifact stages
- in degraded snapshot mode, allow release stages to emit blocked or simulated evidence instead of stopping before `verification.md` or `release.md` can be written

### 4. Planning Gate

If planning artifacts are missing for the requested outcome:

- run `aw-plan`
- stop if planning produces unresolved questions or missing prerequisites
- otherwise continue directly to the next selected stage in the same `/aw:ship` run

### 5. Execution Gate

If implementation is still needed:

- run `aw-execute`
- stop on unresolved blockers
- otherwise continue directly to verification without asking for a new command

### 6. Verification Gate

Before any release outcome:

- run `aw-verify`
- if verify fails, route back to `aw-execute`
- if verify passes and deploy is still part of the selected sequence, continue directly to deploy in the same `/aw:ship` run

### 7. Deploy Gate

Only when the requested end state requires release:

- run `aw-deploy`
- respect repo archetype and deploy profile
- fail closed for unknown staging paths

### 8. Learning

- append end-to-end learnings
- record unfinished work and next action

## Hard Gates

- never expose `aw-prepare` as a public route
- never skip verify before deploy
- never deploy from an unknown repo archetype without configuration
- never broaden the request beyond the requested end state
- always name the blocking stage if the workflow stops
- do not stop the whole workflow solely because `.git` metadata is missing in an eval or source-snapshot workspace when the remaining work can still be represented safely in artifacts
- do not end `/aw:ship` after planning or verification if later stages in the selected sequence are still pending and no blocker exists

## Internal Helper

`aw-prepare` is the hidden setup gate before risky work, not a public route or replacement stage.

## Final Output Shape

Always end with:

- `Selected Sequence`
- `Completed Stages`
- `Artifacts Written`
- `Verification Status`
- `Release Outcome`
- `Open Blockers`
- `Recommended Next`
