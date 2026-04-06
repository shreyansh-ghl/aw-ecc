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
   Use `references/ship-launch-checklist.md`.
   Load `ci-cd-and-automation` when release automation, staged rollout, or rollback machinery is part of the ship decision.
3. Confirm rollback posture.
   If rollback is unclear, do not claim launch readiness.
4. Capture monitoring and follow-through.
   Name health checks, monitoring links, smoke results, and ownership.
   For release notes, runbooks, or durable decision capture, load `documentation-and-adrs`.
5. Close out the release.
   Update `release.md` and `state.json` with launch or blocker notes.

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

## Verification

- [ ] launch checklist or blocker is explicit
- [ ] rollback readiness is documented
- [ ] monitoring and smoke expectations are named
- [ ] `release.md` and `state.json` are updated with closeout evidence
