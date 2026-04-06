---
name: aw-tasks
description: Internal task helper that turns an approved spec into a recipe-level tasks.md artifact for aw-build.
trigger: Internal only. Invoked by aw-plan after spec authoring or when an existing spec must be expanded into execution-ready tasks.
---

# AW Tasks

## Overview

`aw-tasks` owns `tasks.md`.
It turns an approved technical contract into a fresh-worker execution recipe without adding a new public planning command.

The canonical public route remains `/aw:plan`.

## When to Use

- an approved `spec.md` exists and work needs an execution recipe
- execution scope is still too large or vague for a fresh builder
- task ordering, checkpoints, or parallel boundaries are unclear

Do not use when the request is still missing a stable technical contract.

## Workflow

This legacy heading maps to the detailed planning process below.

## The Planning Process

1. Enter task-planning mode.
   Load `.aw_docs/features/<feature_slug>/spec.md` and only the supporting design or product artifacts that matter.
   Do not write code during task authoring.
2. Map the file structure first.
   Name the exact files to create, modify, or verify before defining tasks.
3. Break the work into vertical slices.
   Prefer end-to-end slices and checkpointed phases over horizontal batches.
   Use `../../references/task-sizing-and-checkpoints.md` when sizing gets fuzzy.
4. Write tasks as fresh-worker instructions.
   Include explicit file paths, commands, expected outcomes, and commit boundaries.
5. Review the task list before handoff.
   Remove placeholders, fix dependency drift, and confirm the steps are build-ready.
6. Update state and hand off.
   Update `.aw_docs/features/<feature_slug>/state.json` and recommend `/aw:build`.

## Task Granularity

Each implementation step should usually be one action that takes about 2-5 minutes, for example:

- write the failing test
- run it to verify it fails for the expected reason
- write the minimal implementation
- rerun the test to verify it passes
- commit the focused change

## Required `tasks.md` Structure

`tasks.md` should include:

- a short header with the feature goal, architecture summary, and execution route
- a file structure map before the tasks
- task sections with exact file paths
- checkbox steps for tracking
- validation commands with expected outcomes
- commit steps for meaningful slices
- dependency or ordering notes
- bounded `parallel_candidate` markers only for disjoint write scopes

## Code and Command Detail

When a step changes code or tests, include the smallest concrete snippet, interface shape, or patch intent needed for a fresh worker to execute the step correctly.

Every validation step should include:

- exact command
- why that command is being run
- expected signal such as `FAIL`, `PASS`, or the named artifact/evidence result

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The builder can improvise the missing steps." | If the worker must guess, the task plan is not ready. |
| "I’ll keep tasks broad so the plan stays short." | Broad tasks hide dependencies and break rollback-friendly execution. |
| "I don’t need checkpoints for a small project." | Checkpoints are how you keep multi-slice work verifiable. |

## Red Flags

- a task title includes multiple independent changes joined by "and"
- file scope is missing or generic
- verification steps do not name exact commands or evidence targets
- parallel work is marked without disjoint write boundaries

## No Placeholders

Never write:

- `TODO`
- `TBD`
- `implement later`
- `write tests`
- `handle edge cases`
- `same as previous task`

If a worker would have to guess, the task is not ready.

## Verification

Before handoff:

1. confirm every spec requirement maps to at least one task
2. confirm file paths and interface names stay consistent across tasks
3. confirm no task relies on an undefined helper, type, or command
4. confirm execution can route straight to `/aw:build`

## Final Output Shape

Always end with:

- `Feature Slug`
- `Tasks Path`
- `File Map`
- `Execution Route`
- `Parallel Candidates`
- `Review Result`
- `Recommended Next`
