---
name: aw-plan
description: Create the minimum correct planning artifacts under `.aw_docs/features/<feature_slug>/` and stop cleanly before implementation.
trigger: User requests planning, a missing planning artifact blocks execution, or `/aw:ship` needs to move work into a build-ready state.
---

# AW Plan

## Purpose

`aw-plan` owns planning only.
It creates the minimum correct planning artifact set for the request and always writes deterministic outputs under:

- `.aw_docs/features/<feature_slug>/`

When planning is required, the output should be execution-ready for a fresh worker with limited repo context.
That means the plan should reduce guesswork around files, validation, order, and handoff risks instead of stopping at vague prose.
For non-trivial work, `aw-plan` should behave like a small internal planning graph rather than a single flat prompt.

## Required Behavior

Always:

1. load repo context, relevant platform docs, and relevant `.aw_rules`
2. infer or honor the feature slug
3. detect which planning artifact(s) already exist
4. decide whether the request is already clear enough for direct planning or needs discovery first
5. create only the missing artifact(s) required by the request
6. make every created artifact concrete enough for the next stage to proceed without re-planning
7. update `.aw_docs/features/<feature_slug>/state.json`
8. stop after planning and recommend the next stage

## Internal Skill Graph

Use the smallest correct internal route:

- fuzzy request, open design question, or overscoped feature -> `aw-brainstorm`
- approved direction but missing technical contract -> `aw-spec`
- approved spec but missing execution recipe -> `aw-tasks`
- already execution-ready tasks -> stop and recommend `aw-execute`

Do not collapse all of these responsibilities back into one vague planning pass.

## Planning Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are unclear | `prd.md`, `state.json` |
| `design` | UX behavior or interface design must be defined | `design.md`, `designs/`, `state.json` |
| `technical` | implementation approach or architecture must be defined | `spec.md`, `state.json` |
| `tasks` | implementation work needs to be broken into steps | `tasks.md`, `state.json` |
| `full` | multiple planning artifacts are missing | missing artifacts in order, plus `state.json` |

## Artifact Rules

- write artifacts only under `.aw_docs/features/<feature_slug>/`
- use only deterministic names:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`
  - `state.json`
- do not write planning artifacts to `docs/plans/`
- do not create random filenames
- do not write implementation code

## Authoring Guidance

### `prd.md`

Capture:

- goal
- scope
- non-goals
- acceptance criteria
- risks or dependencies

### `design.md`

Capture:

- routes or flows
- states
- interaction rules
- accessibility notes
- references to `designs/`

### `spec.md`

Canonical internal owner: `aw-spec`

Capture:

- implementation goal
- scope
- interfaces or contracts
- technical approach
- failure modes
- acceptance criteria
- verification targets
- expected changed files or modules when those can be inferred safely
- key commands, migrations, or rollout constraints that execution must honor

### `tasks.md`

Canonical internal owner: `aw-tasks`

Start with a short header that captures:

- feature goal
- architecture summary
- execution route: `/aw:execute`
- expected execution mode when it is known safely

Before task sections, map the file structure:

- exact files to create
- exact files to modify
- exact tests to add or update
- the responsibility of each file when that can be stated clearly

Break implementation into small, executable chunks with:

- files
- checkbox steps
- acceptance
- task type: `code`, `infra`, `docs`, `migration`, or `config`
- validation command or evidence target
- dependency or ordering note when sequencing matters
- `parallel_candidate` only when the write scope is safely disjoint

For code behavior, prefer task steps close to:

- write the failing test or capture the failing signal
- run it to verify the failure is real
- write the minimal change
- rerun the relevant verification to confirm the pass
- commit the focused slice

Each step should usually be small enough to fit in about 2-5 minutes.

## Plan Richness

When the request is in `technical`, `tasks`, or `full` mode, planning should be specific enough that execution does not have to rediscover the shape of the work.

Prefer including:

- exact or likely changed files and what each one is responsible for
- exact file paths when they can be inferred safely
- concrete task goals
- checkbox execution steps for non-trivial work
- exact commands and expected outcomes for failure and pass checks
- the minimal validation commands or evidence expected after implementation
- commit boundaries for meaningful slices
- sequencing notes for dependent tasks
- bounded parallel candidates for disjoint work
- key risks, blockers, or rollback constraints

The goal is not maximum verbosity.
The goal is minimum ambiguity.

## Execution-Ready Tasks

`tasks.md` should avoid vague tasks such as:

- "implement feature"
- "fix bug"
- "update code as needed"

Prefer task units that name:

- goal
- file scope
- change intent
- acceptance check
- validation command or evidence target
- expected verification signal
- commit boundary when the slice is meaningful

## No Placeholders

Planning fails if it contains placeholders such as:

- `TODO`
- `TBD`
- `implement later`
- `write tests`
- `handle edge cases`
- `same as Task N`

If execution would need to guess what a step means, planning is not complete.

## Plan Self-Review

Before ending the planning stage:

1. confirm each spec requirement maps to a task or explicit reason it is out of scope
2. scan for placeholders and vague steps
3. check that file paths, type names, helper names, and commands stay consistent
4. confirm the next stage can route directly to `/aw:execute` or explicitly state what approval is still missing

## Execution Handoff

When `tasks.md` is ready:

- recommend `/aw:execute`
- name the selected execution mode when it is known safely
- name any blocker that should send the work back to planning instead of guessing

## Hard Gates

- do not write code
- do not require `prd.md` for a technical-only request that is already well-defined
- do not force unrelated artifacts
- do not silently broaden a narrow planning request into full planning
- do not produce handoff tasks so vague that execution must re-plan the file scope

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "plan"`
- `mode`
- `status`
- written artifacts
- key inputs
- internal skills used
- recommended next commands

## Final Output Shape

Always end with:

- `Route`
- `Mode`
- `Created`
- `Execution Readiness`
- `Missing`
- `Next`
