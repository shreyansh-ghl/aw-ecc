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

Run `platform-core:echo-direct` with the `release-report` profile.
Invoking `/aw:ship` in default `dual` mode requires `platform-core:echo-direct` for HTML companion generation; do not skip HTML only because `aw:echo` is unavailable.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass launch readiness, rollout plan, rollback posture, monitoring or smoke evidence, blockers, ownership, and next command as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `runner`, `echo_agent_status`, publish status, and any explicit Markdown-only skip, Echo Direct/HCA provenance, or blocked reason.
Load `platform-core:echo-direct`, let it invoke `platform-core:human-collaboration-artifacts`, and wait for the colocated `.html` sidecar. Do not freehand or command-template HTML outside that skill contract. Record successful Echo Direct execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, `runner: platform-core:echo-direct`, and `echo_agent_status: in_process_fast_path`; do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include Echo Direct/HCA provenance in the final handoff.

## Verification

- [ ] launch checklist or blocker is explicit
- [ ] rollback readiness is documented
- [ ] monitoring and smoke expectations are named
- [ ] `release.md` and `state.json` are updated with closeout evidence
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Direct/HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The Echo Direct/HCA handoff owns HTML generation and remote sharing. Before the final response, inspect the Echo Direct/HCA handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when Echo Direct/HCA returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If Echo Direct/HCA cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
