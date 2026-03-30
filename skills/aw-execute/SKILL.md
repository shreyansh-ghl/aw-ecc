---
name: aw-execute
description: Implement approved work from `.aw_docs/features/<feature_slug>/` planning artifacts and write deterministic execution evidence.
trigger: User requests implementation of approved work, or `/aw:ship` needs to move from planning into implementation.
---

# AW Execute

## Purpose

`aw-execute` owns implementation only.
It reads approved planning inputs, may run `aw-prepare` as a hidden setup gate, uses `aw-systematic-debugging` when bug work is still uncertain, makes the minimum correct changes, runs the relevant local checks when possible, and writes execution evidence.

## Inputs

Preferred approved inputs live under:

- `.aw_docs/features/<feature_slug>/spec.md`
- `.aw_docs/features/<feature_slug>/tasks.md`
- `.aw_docs/features/<feature_slug>/design.md`
- `.aw_docs/features/<feature_slug>/prd.md`

If the user supplies an already-approved direct technical request, use that as the execution input without forcing unrelated artifacts.

## Execution Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `code` | source code implementation is required | code changes, tests, `execution.md`, `state.json` |
| `infra` | Helm, Terraform, CI/CD, or runtime setup changes are required | infra/config changes, `execution.md`, `state.json` |
| `docs` | documentation-only work is required | docs changes, `execution.md`, `state.json` |
| `migration` | schema or data rollout work is required | migration changes, rollback notes, `execution.md`, `state.json` |
| `config` | feature flags or runtime configuration are required | config changes, `execution.md`, `state.json` |

## Required Behavior

Always:

1. load the approved execution input
2. choose the smallest correct execution mode
3. break non-trivial work into explicit task units
4. package the minimum correct context for the current task unit instead of reopening the entire plan every time
5. when the work is a bug fix or failing-behavior repair, capture reproduction and root-cause evidence before patching
6. implement the required change without reopening planning
7. run a `spec_review` before marking a task unit complete
8. run a `quality_review` before handing off
9. run relevant local validation commands when available
10. write `.aw_docs/features/<feature_slug>/execution.md`
11. update `.aw_docs/features/<feature_slug>/state.json`
12. hand off to `aw-verify`

## Task-Unit Orchestration

When the execution input implies more than one meaningful step, use this internal loop:

1. identify the next task unit
2. name the task goal, affected files, and required inputs
3. build only that unit
4. run `spec_review`
5. run `quality_review`
6. either mark the unit complete or stop on a named blocker

Independent units may be flagged as `parallel_candidate`, but the public surface remains a single `/aw:execute` stage.

## TDD Policy

For code changes, prefer explicit RED-GREEN-REFACTOR or failure-first behavior where the repo can support it.

- reuse an existing failing test if it already captures the bug
- add or update the smallest correct automated test when the behavior is testable
- record the `RED` signal, the minimal `GREEN` change, and any `REFACTOR` follow-up in `execution.md`
- record test limitations in `execution.md` instead of silently skipping them

For bug-oriented work, use `aw-systematic-debugging` to drive:

- reproduction
- expected vs actual behavior
- root-cause hypothesis
- confirming probe before broad fixes

## Hard Gates

- do not invent product or design work during execution
- stop cleanly on blockers instead of guessing
- do not deploy from `aw-execute`
- do not silently skip tests when the repo has runnable checks
- do not mark multi-step work complete without recording task-unit progress
- do not skip `aw-prepare` when repo state could make execution unsafe
- do not claim a bug is fixed without either a failing-test signal or an equivalent reproduction signal
- do not skip the debugging trail when the root cause was initially uncertain

## Execution Report

`execution.md` should capture:

- selected mode
- approved inputs used
- task units completed
- spec review and quality review outcomes
- RED-GREEN-REFACTOR or failure-first evidence when code behavior changed
- debugging trace when bug work required root-cause isolation
- files changed
- key implementation notes
- commands run
- blockers or concerns
- recommended next stage

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "execute"`
- `mode`
- `status`
- completed task units
- pending task units or blockers
- written artifacts
- key validation commands
- recommended next commands

## Final Output Shape

Always end with:

- `Selected Mode`
- `Task Loop`
- `Inputs Used`
- `Files Changed`
- `Validation Run`
- `Blockers`
- `Recommended Next`
