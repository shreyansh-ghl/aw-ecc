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

When `aw-ship` crosses a stage boundary internally, it must still preserve that stage's deterministic artifact contract.
Do not treat internal traversal as permission to skip `execution.md`, `verification.md`, `release.md`, or `state.json`.

## Decision Rule

Default to the smallest correct sequence.
Once a sequence is selected, keep ownership of the whole sequence inside the same `/aw:ship` run until the requested end state is reached or a real blocker stops the next stage.

Examples:

- idea to build-ready -> `aw-plan`
- approved spec to verified implementation -> `aw-execute -> aw-verify`
- approved spec to staging -> `aw-execute -> aw-verify -> aw-deploy`
- verified branch to staging -> `aw-deploy`
- verified work to PR and staging -> `aw-deploy(pr -> staging)`
- from idea to staged result -> `aw-plan -> aw-execute -> aw-verify -> aw-deploy`

## Fast Path: Approved Plan To Staging

When the repo already has a concrete approved execution input under `.aw_docs/features/<feature_slug>/`, prefer the shortest composite flow instead of rereading unrelated workflow helpers.

Treat the flow as execution-ready when:

- `spec.md` already names the intended code or config changes
- `tasks.md` or equivalent approved task notes already break the change into executable units
- the requested end state is verification or release, not fresh planning

For the common "approved implementation plan to staging" case:

1. classify preparation state through `aw-prepare`
2. select `aw-execute -> aw-verify -> aw-deploy`
3. keep the context focused on the current feature artifacts plus the selected stage skills
4. write `execution.md` before verify begins
5. write `verification.md` before deploy begins
6. write `release.md` before returning the final summary

Do not reopen `aw-plan` only because `prd.md` or `design.md` are absent when the approved technical inputs are already concrete enough to implement safely.

## Execution Phases

### 1. Intake

- read the request
- inspect existing artifacts and branch state
- identify the requested end state

### 2. Sequence Selection

- determine which stages are already satisfied
- choose the minimum remaining stage sequence
- state the chosen sequence clearly
- if approved technical inputs already exist and the request is to ship or stage them, skip replanning and move directly to `aw-execute -> aw-verify -> aw-deploy`
- do not stop after an internal stage merely because it completed its own artifact set when later stages are still part of the selected sequence

### 3. Preparation Gate

Before execution or deploy-oriented work:

- run `aw-prepare`
- confirm branch or worktree isolation is acceptable for the requested flow
- use `.aw_docs/features/<feature_slug>/workspace.json` when preparation materialized a dedicated worktree lifecycle
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
- require `execution.md` and `state.json` before moving forward
- stop on unresolved blockers
- otherwise continue directly to verification without asking for a new command

### 6. Verification Gate

Before any release outcome:

- run `aw-verify`
- require `verification.md` and `state.json` before moving forward
- if verify fails with a concrete repair scope that stays within the selected flow, perform one bounded repair cycle through `aw-execute -> aw-verify`
- if verify still fails after the bounded repair cycle, stop and report the blocking stage explicitly
- if verify passes and deploy is still part of the selected sequence, continue directly to deploy in the same `/aw:ship` run

### 7. Deploy Gate

Only when the requested end state requires release:

- run `aw-deploy`
- require `release.md` and `state.json` before returning
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
- do not reopen `aw-plan` from a concrete approved spec or task plan just because richer planning artifacts are absent
- always name the blocking stage if the workflow stops
- do not stop the whole workflow solely because `.git` metadata is missing in an eval or source-snapshot workspace when the remaining work can still be represented safely in artifacts
- do not end `/aw:ship` after planning or verification if later stages in the selected sequence are still pending and no blocker exists
- do not abandon a selected release sequence after a fixable verify finding when one bounded repair cycle can still complete the requested flow safely
- do not count an internal stage as completed until its required stage artifacts are written to disk
- do not spend time rereading compatibility-only commands once a concrete `aw-execute -> aw-verify -> aw-deploy` path has already been selected
- do not treat a code diff, console summary, or spoken handoff as a substitute for `execution.md`, `verification.md`, `release.md`, or `state.json`

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
