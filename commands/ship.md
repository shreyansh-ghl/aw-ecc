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

If the requested release outcome is compound, such as PR creation followed by staging deployment, `/aw:ship` should keep the same stage order and ask `/aw:deploy` to run the explicit release sequence.

## Modes

| Mode | Use when | Stages |
|---|---|---|
| `build-ready` | the user wants planning completed only to handoff-ready state | `plan` |
| `implement` | planning exists and the user wants code built and validated | `execute -> verify` |
| `release` | work is already verified and should become a PR, branch, or staging outcome | `deploy` |
| `full` | the user wants end-to-end movement from idea or approved input to release outcome | `plan -> execute -> verify -> deploy` |

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
| `stage-selection` | choose the smallest correct sequence of public AW stages |
| `plan` | create missing planning artifacts when required |
| `execute` | implement approved work |
| `verify` | collect evidence, review, governance, and readiness |
| `deploy` | produce the requested release outcome |
| `learning` | record end-to-end learnings and remaining follow-ups |

## Hard Gates

- do not run unnecessary stages
- do not skip verify before deploy
- do not deploy to staging or production without the required checks
- stop cleanly on blockers and report the blocking stage

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

- `aw-plan`
- `aw-execute`
- `aw-verify`
- `aw-deploy`

It may use `aw-brainstorm` or `aw-finish` only as compatibility helpers, not as the canonical path.

## Final Output Shape

Always end with:

- `Selected Flow`
- `Stages Run`
- `Artifacts`
- `Evidence`
- `Outcome`
- `Blockers`
- `Recommended Next`
