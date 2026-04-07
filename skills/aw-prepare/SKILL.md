---
name: aw-prepare
description: Internal preparation layer that validates repo state, branch or worktree isolation, and execution readiness before risky AW stages begin.
trigger: Internal only. Invoked by aw-build, aw-deploy, aw-ship, or aw-yolo before code-changing or release-oriented work.
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
- workspace metadata handoff for the active feature
- obvious runnable baseline validation when it is cheap and safe
- deploy-target prerequisites when the next stage is release-oriented

## Isolation Levels

Preparation should classify the current workspace into one of these levels:

| Level | Meaning | Default action |
|---|---|---|
| `isolated-worktree` | dedicated worktree or clearly isolated workspace | proceed |
| `isolated-branch` | dedicated feature branch in the main checkout | proceed with caution notes |
| `shared-branch-dirty` | shared branch or dirty state could contaminate work | warn or block based on risk |
| `snapshot-degraded` | source snapshot or eval workspace without live git metadata | proceed in degraded mode when side effects are not required |

## Recommended Isolation Action

When isolation is weaker than `isolated-worktree`, preparation should recommend the smallest corrective action, such as:

- create a feature branch
- switch to a dedicated worktree
- stash or isolate unrelated local changes
- continue in degraded snapshot mode with blocked external side effects

## Operational Lifecycle

When a dedicated worktree is the right isolation boundary, use the repo-local orchestration helpers instead of leaving setup implicit:

- `node scripts/orchestrate-worktrees.js <plan.json>` to render the branch-backed worktree plan
- `node scripts/orchestrate-worktrees.js <plan.json> --execute` to create the worktree session
- `node scripts/orchestration-status.js <plan.json|session-name>` to inspect the resulting orchestration snapshot

For single-worker isolation, a one-worker orchestration plan is valid.
Do not invent a separate workflow for "simple" worktree creation.

## Workspace Metadata

When preparation creates, selects, or reuses an isolated workspace, persist `.aw_docs/features/<feature_slug>/workspace.json` with the minimum useful fields:

- `feature_slug`
- `isolation_level`
- `branch_name`
- `worktree_path`
- `coordination_dir`
- `cleanup_policy`
- `status_command`
- `recommended_next`

## Required Behavior

1. detect whether the work is running in an isolated branch or worktree
2. report risky dirty state instead of silently continuing
3. confirm the intended feature slug and relevant AW artifact directory
4. recommend the smallest isolation action when the current workspace is weaker than ideal
5. capture baseline commands that should be rerun later when practical
6. write or update `workspace.json` when a dedicated branch or worktree is selected
7. hand back a preparation summary to the calling stage
8. when repo metadata is unavailable because the work is running inside a source snapshot or eval workspace, record degraded isolation as a warning and continue when local artifact work is still safe
9. only hard-block on missing git metadata when the next action truly requires live branch, PR, or deployment execution that cannot be represented safely as blocked evidence

## Hard Gates

- do not create a new public command
- do not silently discard or overwrite unrelated local changes
- do not claim deploy readiness from preparation alone
- do not block lightweight docs-only work unless repo state creates real ambiguity
- do not treat missing `.git` metadata in snapshot or eval workspaces as an automatic blocker for plan, execute, verify, or evidence-only deploy handoff
- do not treat a dirty shared branch as equivalent to an isolated worktree
- do not continue into multi-stage ship work without naming the chosen isolation level

## Preparation Summary

Preparation output should capture:

- isolation level
- isolation status
- recommended isolation action
- repo cleanliness summary
- baseline artifacts detected
- cheap baseline commands run, if any
- blockers or warnings
- recommended next stage
- whether the stage is continuing in degraded snapshot mode
- workspace metadata path, when written

## Final Output Shape

Always end with:

- `Isolation Level`
- `Isolation`
- `Recommended Isolation Action`
- `Repo State`
- `Artifacts Found`
- `Baseline Checks`
- `Warnings`
- `Workspace Metadata`
- `Recommended Next`
