---
name: aw-spec
description: Internal spec helper that turns an approved direction into a deterministic technical spec without writing implementation tasks or code.
trigger: Internal only. Invoked by aw-plan after discovery is approved or when a technical contract must be written before task planning.
---

# AW Spec

## Overview

`aw-spec` owns the technical contract layer inside AW planning.
It turns an approved direction into `.aw_docs/features/<feature_slug>/spec.md` without collapsing directly into implementation tasks or code.

The public planning route remains `/aw:plan`.

## When to Use

- discovery or planning has already approved the direction
- the request needs a technical contract before task breakdown
- an existing spec is vague, incomplete, or inconsistent
- the work spans interfaces, file boundaries, rollout concerns, or migration risk

Do not use when execution-ready tasks already exist or when the request is still fundamentally a product or design question.

## Workflow

1. Enter technical planning mode.
   Read the approved direction, relevant code paths, and the smallest set of architecture context needed.
   Do not write code while authoring the spec.
2. Check the scope shape.
   If the request spans multiple independent subsystems, decompose it before writing one giant spec.
3. Define the stable contract.
   Name interfaces, boundaries, file responsibilities, rollout constraints, and failure modes.
   Use `references/interface-stability.md` when an API or contract is changing.
4. Write `spec.md` for a fresh planner or builder.
   Make it specific enough that `aw-tasks` can proceed without rediscovering the architecture.
5. Run a fast review pass.
   Fix placeholders, contradictions, scope drift, and ambiguous names before handoff.
6. Update state and hand off.
   Update `.aw_docs/features/<feature_slug>/state.json` and hand the approved spec to `aw-tasks`.

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

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The builder can figure the interfaces out." | Unstable interfaces are where rework and regressions start. |
| "This is only one feature, so one large spec is fine." | Mixed subsystems still need decomposition if the boundaries differ. |
| "I’ll leave the risky rollout details for later." | Migration and rollback constraints belong in the spec if they affect implementation. |

## Red Flags

- the spec says "update as needed" instead of naming boundaries
- file or module responsibility is still vague
- rollout or migration constraints are implied instead of stated
- contradictory helper names, interface names, or paths appear across sections

## Verification

Before handoff, run this inline review:

1. placeholder scan
2. internal consistency check
3. scope check
4. ambiguity check

Fix issues inline instead of carrying them into task planning.

## Hard Gates

- do not write implementation code
- do not jump directly to `/aw:build`
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
