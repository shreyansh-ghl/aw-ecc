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
3. Continue until the selected shipping scope is covered.
   Do not stop after one checklist item, one smoke result, or one monitoring note if the requested launch-readiness, rollout, or closeout scope still has open gaps.
4. Confirm rollback posture.
   If rollback is unclear, do not claim launch readiness.
5. Capture monitoring and follow-through.
   Name health checks, monitoring links, smoke results, and ownership.
   For release notes, runbooks, or durable decision capture, load `documentation-and-adrs`.
6. Close out the release.
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
- rollout plan
- rollback path
- evidence captured
- `html_companion_artifacts`
- blockers
- recommended next commands

## Human HTML Companion

Markdown `release.md` remains canonical for agents.
When ship writes or materially updates `release.md`, also create or refresh `.aw_docs/features/<feature_slug>/release.html`. HTML sidecars are required stage outputs, not advisory metadata.

Invoke `platform-core:human-collaboration-artifacts` with the `release-report` profile. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` subagent.
Invoking `/aw:ship` in default `dual` mode is explicit authorization to run `platform-core:human-collaboration-artifacts` for HTML companion generation. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` subagent; do not skip HTML only because no direct command is available.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass launch readiness, rollout plan, rollback posture, monitoring or smoke evidence, blockers, ownership, and next command as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.
Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar before the final handoff unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

## Verification

- [ ] launch checklist or blocker is explicit
- [ ] rollback readiness is documented
- [ ] monitoring and smoke expectations are named
- [ ] `release.md` and `state.json` are updated with closeout evidence
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Launch Readiness`
- `Rollout Plan`
- `Rollback Path`
- `Evidence`
- `Outcome`
- `HTML Companion`
- `Remote Docs`
- `Next`
