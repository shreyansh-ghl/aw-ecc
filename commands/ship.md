---
name: aw:ship
description: End-to-end convenience command that runs the minimum required AW SDLC stages in order until the requested release outcome is produced.
argument-hint: "<goal, artifact, repo context, and desired release target>"
status: active
stage: composite
internal_skill: aw-ship
---

# Ship

Use `/aw:ship` when the user explicitly wants one command to take work across multiple stages.

This is a composite command.
It should orchestrate the existing stage commands instead of replacing them.

## Role

Move work from its current state to the requested release outcome by composing `/aw:plan`, `/aw:execute`, `/aw:verify`, and `/aw:deploy` in the smallest correct sequence.
After selecting that sequence, keep moving through it in the same `/aw:ship` run until the requested end state is achieved or a blocking condition makes the next stage unsafe.

If the requested release outcome is compound, such as PR creation followed by staging deployment, `/aw:ship` should keep the same stage order and ask `/aw:deploy` to run the explicit release sequence.

Internally, `/aw:ship` may invoke a hidden preparation layer before risky work starts, but the public command surface must stay unchanged.
If verify finds a clearly bounded execution gap while the selected sequence is still active, `/aw:ship` may perform one internal repair cycle before giving up on the requested end state.
Crossing stages internally does not remove stage artifact requirements: execute still owes `execution.md`, verify still owes `verification.md`, and deploy still owes `release.md`.

When approved technical inputs are already concrete enough to build from, `/aw:ship` should not reopen planning just because richer planning artifacts are absent.
For approved implementation inputs that already point to staging, the preferred fast path is `prepare -> execute -> verify -> deploy`.

## Modes

| Mode | Use when | Stages |
|---|---|---|
| `build-ready` | the user wants planning completed only to handoff-ready state | `prepare -> plan` |
| `implement` | planning exists and the user wants code built and validated | `prepare -> execute -> verify` |
| `release` | work is already verified and should become a PR, branch, or staging outcome | `prepare -> deploy` |
| `full` | the user wants end-to-end movement from idea or approved input to release outcome | `prepare -> plan -> execute -> verify -> deploy` |

## Required Inputs

- user request
- repo context
- relevant platform docs
- relevant `.aw_rules`

## Optional Inputs

- existing `prd.md`
- existing `design.md`
- existing `spec.md`
- existing `tasks.md`
- partial implementation
- branch, PR, or desired release target

## Outputs

- the outputs of the stages actually executed
- updated `.aw_docs/features/<feature_slug>/state.json`
- a final end-to-end summary of what stages ran and what remains

## Phases

| Phase | Responsibility |
|---|---|
| `intake` | classify current state, desired end state, and missing prerequisites |
| `stage-selection` | choose the smallest correct sequence of public AW stages and skip `plan` when approved technical inputs are already execution-ready |
| `prepare` | validate branch/worktree isolation and setup prerequisites through the internal `aw-prepare` layer |
| `plan` | create missing planning artifacts when required |
| `execute` | implement approved work |
| `verify` | collect evidence, review, governance, and readiness |
| `deploy` | produce the requested release outcome |
| `learning` | record end-to-end learnings and remaining follow-ups |

## Hard Gates

- do not run unnecessary stages
- do not skip the hidden setup gate before risky implementation or release work
- do not skip verify before deploy
- do not deploy to staging or production without the required checks
- stop cleanly on blockers and report the blocking stage
- if `.git` metadata is missing only because the repo is running as a source snapshot or eval workspace, continue in degraded mode and record blocked or simulated release evidence instead of stopping before artifact generation
- do not reopen `plan` when a concrete approved spec or task plan already makes execution safe
- do not stop after `plan`, `execute`, or `verify` when `/aw:ship` still owns later stages in the selected flow and there is no blocker
- do not stop after a fixable verify failure if one bounded execute -> verify repair cycle can still complete the requested release flow safely
- do not treat an internal stage as complete if its required artifact files were not written
- do not keep rereading compatibility-only workflow files after the selected flow is already concrete
- do not treat a code diff, shell transcript, or narrative summary as a substitute for the required stage artifact files

## Must Not Do

- must not silently broaden a narrow request into full ship
- must not hide which stage failed
- must not bypass human approval where deployment requires it

## Recommended Use

Use `/aw:ship` when the request sounds like:

- "take this from idea to ship"
- "do the whole flow"
- "build this end to end"
- "ship this to staging"

For stage-specific work, prefer the stage commands directly.

## Internal Routing

`/aw:ship` should orchestrate:

- `aw-prepare`
- `aw-plan`
- `aw-execute`
- `aw-verify`
- `aw-deploy`

`aw-prepare` is internal only and must not become a public command.
It may use `aw-brainstorm` or `aw-finish` only as compatibility helpers, not as the canonical path.
When `aw-prepare` detects a snapshot workspace without live git metadata, `/aw:ship` should keep planning, execution, verification, and evidence-writing stages moving unless the next action requires a real external side effect.

## Final Output Shape

Always end with:

- `Selected Flow`
- `Stages Run`
- `Artifacts`
- `Evidence`
- `Outcome`
- `Blockers`
- `Recommended Next`
