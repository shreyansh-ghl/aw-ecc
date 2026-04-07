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
   Include explicit file paths, commands, expected outcomes, commit boundaries, save-point commit expectations, phase ordering, expected review mode when it is known safely, and any bounded parallel execution metadata.
   For behavior-changing slices, default to explicit `RED -> GREEN -> REFACTOR` steps instead of generic "write tests" guidance.
5. Review the task list before handoff.
   Remove placeholders, fix dependency drift, and confirm the steps are build-ready.
6. Update state and hand off.
   Update `.aw_docs/features/<feature_slug>/state.json` and recommend `/aw:build`.

## Task Granularity

Each implementation step should usually be one action that takes about 2-5 minutes, for example:

- write the RED test
- run it to verify it fails for the expected reason
- write the minimal implementation
- rerun the exact command to verify GREEN
- refactor or simplify while keeping the same proof green
- commit the focused change

## Required `tasks.md` Structure

`tasks.md` should include:

- an explicit `## Spec Brief` section near the top with the feature goal, approved scope, and architecture summary
- assumptions or constraints that materially affect execution
- a file structure map before the tasks
- explicit phase sections such as `## Phase 1`, `## Phase 2`, and so on
- a short phase outcome or exit check for each phase
- task sections with exact file paths
- checkbox steps for tracking
- validation commands with expected outcomes
- explicit RED and GREEN commands with expected outcomes for behavior-changing slices
- commit steps for meaningful slices
- save-point commit expectation for each meaningful slice
- dependency or ordering notes
- bounded `parallel_candidate` markers only for disjoint write scopes
- `parallel_group`, `parallel_ready_when`, and `parallel_write_scope` details for any parallel slice
- `max_parallel_subagents: 3` by default when parallel fan-out is planned, unless another cap is explicitly justified

If a slice cannot end in a clean save-point commit, it should usually be merged into the next dependent slice before handoff to build.
If no safe disjoint work exists, say so explicitly instead of forcing fake parallelism.
Even a small plan should still start with `## Spec Brief` and label the execution order with at least `## Phase 1` so the next worker can see the sequence immediately.

## Code and Command Detail

When a step changes code or tests, include the smallest concrete snippet, interface shape, or patch intent needed for a fresh worker to execute the step correctly.

Every validation step should include:

- exact command
- why that command is being run
- expected signal such as `FAIL`, `PASS`, or the named artifact/evidence result

For behavior-changing work, tasks should not say only "add tests" or "verify it works."
They should spell out:

- RED command and expected failure
- GREEN command and expected pass
- refactor or simplification expectation after GREEN

If test-first is not meaningful for a slice, say why and provide the best pre-change proof plus focused post-change validation instead.

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
- behavior-changing work lacks explicit RED and GREEN proof
- parallel work is marked without disjoint write boundaries
- parallel fan-out is proposed without a cap or without naming the owned write scope

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
4. confirm `## Spec Brief` and the phase order are obvious from the top of `tasks.md`
5. confirm behavior-changing slices use explicit `RED -> GREEN -> REFACTOR` wording or explicitly justify why test-first is not meaningful
6. confirm the execution mode and review mode are clear when they can be known safely
7. confirm execution can route straight to `/aw:build`

## Final Output Shape

Always end with:

- `Feature Slug`
- `Tasks Path`
- `Spec Brief`
- `File Map`
- `Phases`
- `Execution Route`
- `Review Mode`
- `Parallel Candidates`
- `Review Result`
- `Recommended Next`
