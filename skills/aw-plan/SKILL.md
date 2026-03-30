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

## Required Behavior

Always:

1. load repo context, relevant platform docs, and relevant `.aw_rules`
2. infer or honor the feature slug
3. detect which planning artifact(s) already exist
4. create only the missing artifact(s) required by the request
5. update `.aw_docs/features/<feature_slug>/state.json`
6. stop after planning and recommend the next stage

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

Capture:

- implementation goal
- scope
- interfaces or contracts
- technical approach
- failure modes
- acceptance criteria
- verification targets

### `tasks.md`

Break implementation into small, executable chunks with:

- files
- steps
- acceptance
- task type: `code`, `infra`, `docs`, `migration`, or `config`

## Hard Gates

- do not write code
- do not require `prd.md` for a technical-only request that is already well-defined
- do not force unrelated artifacts
- do not silently broaden a narrow planning request into full planning

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "plan"`
- `mode`
- `status`
- written artifacts
- key inputs
- recommended next commands

## Final Output Shape

Always end with:

- `Route`
- `Mode`
- `Created`
- `Missing`
- `Next`
