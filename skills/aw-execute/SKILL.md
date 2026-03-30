---
name: aw-execute
description: Implement approved work from `.aw_docs/features/<feature_slug>/` planning artifacts and write deterministic execution evidence.
trigger: User requests implementation of approved work, or `/aw:ship` needs to move from planning into implementation.
---

# AW Execute

## Purpose

`aw-execute` owns implementation only.
It reads approved planning inputs, makes the minimum correct changes, runs the relevant local checks when possible, and writes execution evidence.

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
3. implement the required change without reopening planning
4. run relevant local validation commands when available
5. write `.aw_docs/features/<feature_slug>/execution.md`
6. update `.aw_docs/features/<feature_slug>/state.json`
7. hand off to `aw-verify`

## Hard Gates

- do not invent product or design work during execution
- stop cleanly on blockers instead of guessing
- do not deploy from `aw-execute`
- do not silently skip tests when the repo has runnable checks

## Execution Report

`execution.md` should capture:

- selected mode
- approved inputs used
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
- written artifacts
- key validation commands
- recommended next commands

## Final Output Shape

Always end with:

- `Selected Mode`
- `Inputs Used`
- `Files Changed`
- `Validation Run`
- `Blockers`
- `Recommended Next`
