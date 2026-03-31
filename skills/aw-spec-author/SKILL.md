---
name: aw-spec-author
description: Internal spec-authoring helper that turns an approved direction into a deterministic technical spec without writing implementation tasks or code.
trigger: Internal only. Invoked by aw-plan after discovery is approved or when a technical contract must be written before task planning.
---

# AW Spec Author

## Purpose

`aw-spec-author` owns the technical contract layer inside AW planning.
It turns an approved direction into `.aw_docs/features/<feature_slug>/spec.md` without collapsing directly into implementation tasks.

The public planning route remains `/aw:plan`.

## Required Behavior

1. load the approved direction from `aw-brainstorm`, existing planning artifacts, and repo context
2. check whether the request actually spans multiple independent subsystems
3. if it does, decompose the scope before writing a single technical spec
4. write or refine `spec.md` with enough detail for a fresh task planner to proceed without rediscovering the architecture
5. run a fast self-review before handing the spec forward
6. stop and surface approval questions when the proposed technical direction materially changes the user-approved design
7. update `.aw_docs/features/<feature_slug>/state.json`
8. hand the approved spec to `aw-task-planner`

## Required `spec.md` Content

Capture at least:

- implementation goal
- scope and non-goals
- architecture or technical approach
- interfaces, contracts, or integration points
- expected file or module map when it can be inferred safely
- failure modes and rollback constraints
- acceptance criteria
- verification targets
- rollout, migration, or environment constraints when relevant

## Self-Review

Before handoff, run this inline review:

1. placeholder scan
2. internal consistency check
3. scope check
4. ambiguity check

Fix issues inline instead of carrying them into task planning.

## Hard Gates

- do not write implementation code
- do not jump directly to `/aw:execute`
- do not create `tasks.md`
- do not leave contradictory interfaces, names, or file boundaries unresolved
- do not treat a multi-subsystem request as one spec when it should be decomposed

## Final Output Shape

Always end with:

- `Feature Slug`
- `Spec Path`
- `Scope Decision`
- `Architecture`
- `Acceptance Criteria`
- `Open Approval Needs`
- `Recommended Next`
