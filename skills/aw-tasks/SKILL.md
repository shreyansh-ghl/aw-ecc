---
name: aw-tasks
description: Internal task helper that turns an approved spec into a recipe-level tasks.md artifact for aw-execute.
trigger: Internal only. Invoked by aw-plan after spec authoring or when an existing spec must be expanded into execution-ready tasks.
---

# AW Tasks

## Purpose

`aw-tasks` owns `tasks.md`.
It turns an approved technical contract into a fresh-worker execution recipe without adding a new public planning command.

The canonical public route remains `/aw:plan`.

## Required Behavior

1. load `.aw_docs/features/<feature_slug>/spec.md` and any relevant design or product artifacts
2. map the exact files that will be created, modified, or verified before defining tasks
3. break the work into bite-sized steps that are small enough to execute without re-planning
4. write `tasks.md` with explicit file paths, task ownership, commands, expected outcomes, and commit boundaries
5. run a placeholder scan and consistency review before handing off
6. update `.aw_docs/features/<feature_slug>/state.json`
7. recommend `/aw:execute`

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

## No Placeholders

Never write:

- `TODO`
- `TBD`
- `implement later`
- `write tests`
- `handle edge cases`
- `same as previous task`

If a worker would have to guess, the task is not ready.

## Self-Review

Before handoff:

1. confirm every spec requirement maps to at least one task
2. confirm file paths and interface names stay consistent across tasks
3. confirm no task relies on an undefined helper, type, or command
4. confirm execution can route straight to `/aw:execute`

## Final Output Shape

Always end with:

- `Feature Slug`
- `Tasks Path`
- `File Map`
- `Execution Route`
- `Parallel Candidates`
- `Review Result`
- `Recommended Next`
