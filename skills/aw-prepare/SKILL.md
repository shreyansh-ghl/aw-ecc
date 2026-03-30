---
name: aw-prepare
description: Internal preparation layer that validates repo state, branch or worktree isolation, and execution readiness before risky AW stages begin.
trigger: Internal only. Invoked by aw-execute or aw-ship before code-changing or release-oriented work.
---

# AW Prepare

## Purpose

`aw-prepare` is an internal setup gate.
It keeps the public AW surface small while adding the practical safety checks needed before execution or release work starts.

## Responsibilities

Always check the smallest correct set of:

- current branch or worktree isolation
- dirty tracked or untracked state that could contaminate the requested work
- feature slug and artifact baseline
- obvious runnable baseline validation when it is cheap and safe
- deploy-target prerequisites when the next stage is release-oriented

## Required Behavior

1. detect whether the work is running in an isolated branch or worktree
2. report risky dirty state instead of silently continuing
3. confirm the intended feature slug and relevant AW artifact directory
4. capture baseline commands that should be rerun later when practical
5. hand back a preparation summary to the calling stage
6. when repo metadata is unavailable because the work is running inside a source snapshot or eval workspace, record degraded isolation as a warning and continue when local artifact work is still safe
7. only hard-block on missing git metadata when the next action truly requires live branch, PR, or deployment execution that cannot be represented safely as blocked evidence

## Hard Gates

- do not create a new public command
- do not silently discard or overwrite unrelated local changes
- do not claim deploy readiness from preparation alone
- do not block lightweight docs-only work unless repo state creates real ambiguity
- do not treat missing `.git` metadata in snapshot or eval workspaces as an automatic blocker for plan, execute, verify, or evidence-only deploy handoff

## Preparation Summary

Preparation output should capture:

- isolation status
- repo cleanliness summary
- baseline artifacts detected
- cheap baseline commands run, if any
- blockers or warnings
- recommended next stage
- whether the stage is continuing in degraded snapshot mode

## Final Output Shape

Always end with:

- `Isolation`
- `Repo State`
- `Artifacts Found`
- `Baseline Checks`
- `Warnings`
- `Recommended Next`
