---
name: aw-ship
description: Launch, rollout, rollback readiness, and release closeout skill for work that already has the required build, test, review, and deploy context.
trigger: User requests launch readiness, rollout management, or release closeout after deploy or during final release preparation.
---

# AW Ship

## Overview

`aw-ship` is now the shipping stage, not the composite "do everything" workflow.
It owns launch safety, rollback readiness, monitoring posture, and release closeout.

## When to Use

- launch readiness is the goal
- rollout checkpoints and monitoring need to be named
- the release action already happened and needs closeout
- rollback confidence must be documented before claiming readiness

Do not use for end-to-end orchestration.
That belongs to `aw-yolo`.

## Preparation Gate

Before risky shipping work, call `aw-prepare` as the internal preparation gate when any of these are unclear:

- release context
- artifact readiness
- workspace isolation or repo cleanliness
- whether the current request is really shipping versus deploy or review

Do not guess through missing release inputs when `aw-prepare` should be used first.

## Workflow

1. Load the release context.
   Start from deploy evidence, review status, known risks, and rollout intent.
   If release inputs or workspace readiness are unclear, run the internal `aw-prepare` gate first instead of guessing.
2. Apply the launch checklist.
   Use `../../references/ship-launch-checklist.md`.
   Load `ci-cd-and-automation` when release automation, staged rollout, or rollback machinery is part of the ship decision.
   Explicitly name pre-flight status, smoke-test expectations, monitoring coverage, and rollback ownership.
3. Continue until the selected shipping scope is covered.
   Do not stop after one checklist item, one smoke result, or one monitoring note if the requested launch-readiness, rollout, or closeout scope still has open gaps.
4. Confirm rollback posture.
   If rollback is unclear, do not claim launch readiness.
5. Capture monitoring and follow-through.
   Name health checks, monitoring links, smoke results, and ownership.
   For release notes, runbooks, or durable decision capture, load `documentation-and-adrs`.
6. Assign a confidence call instead of vague optimism.
   State whether the release is ready, conditionally ready, or blocked, and why.
7. Close out the release.
   Update `release.md` and `state.json` with launch or blocker notes.

## Completion Contract

Shipping is complete only when one of these is true:

- launch readiness, rollout, or closeout scope is covered clearly enough for operations
- a launch blocker prevents safe shipping and that blocker is named clearly

Every shipping handoff must make these things obvious:

- the current launch readiness decision
- the rollout or monitoring plan
- the rollback path or rollback blocker
- the operational evidence captured
- the current shipping confidence and named owner for follow-through
- which exact next command should run next, if any

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Deploy already proved we're safe to ship." | Execution success is not the same as rollout safety. |
| "Rollback can be figured out later." | No rollback story means no real launch confidence. |
| "Ship should still mean the whole pipeline." | Overloading ship is what made the old model confusing. |

## Red Flags

- no rollback plan or rollback blocker is named
- no monitoring or smoke evidence exists for a risky release
- ship is used as a synonym for end-to-end automation

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "ship"`
- `mode`
- `status`
- written artifacts
- launch readiness
- shipping confidence
- rollout plan
- rollback path
- evidence captured
- operational owner
- blockers
- recommended next commands

## Verification

- [ ] launch checklist or blocker is explicit
- [ ] rollback readiness is documented
- [ ] monitoring and smoke expectations are named
- [ ] rollout ownership and confidence are explicit
- [ ] `release.md` and `state.json` are updated with closeout evidence

## Final Output Shape

Always end with:

- `Mode`
- `Launch Readiness`
- `Confidence`
- `Rollout Plan`
- `Rollback Path`
- `Evidence`
- `Outcome`
- `Next`
