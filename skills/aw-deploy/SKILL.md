---
name: aw-deploy
description: Turn reviewed work into one requested release outcome with explicit GHL provider resolution and deterministic release artifacts.
trigger: Test and review passed and the user requests PR creation, branch handoff, or deployment.
---

# AW Deploy

## Overview

`aw-deploy` owns release action only.
It should not reopen planning or implementation.

## When to Use

- reviewed work needs a PR
- reviewed work should remain on a branch
- reviewed work should go to staging or production

Do not use for launch discipline or end-to-end orchestration.

## Workflow

1. Confirm the evidence gate.
   The required QA and review outputs must exist.
2. Select one release path.
   PR, branch, staging, or production.
3. Resolve the org-standard mechanism.
   Use the repo archetype and resolved baseline profile to choose provider and mechanism.
   Load `ci-cd-and-automation` for gate ordering, preview/deploy automation, and rollback-aware pipeline expectations.
   For releases that retire or migrate legacy paths, load `deprecation-and-migration`.
   When the selected path is branch completion instead of environment deployment, preserve the `aw-finish` compatibility behavior:
   merge locally, push and create PR, keep as branch, or discard only with explicit confirmation.
   If `.aw_docs/features/<feature_slug>/workspace.json` exists, use it as the source of truth for active branch, worktree path, and cleanup policy.
4. Execute or record the blocker.
   Complete the selected release action end-to-end for the chosen mode.
   External failure should still yield deterministic `release.md` evidence.
5. Hand off to `aw-ship` when requested.
   Use `aw-ship` for rollout safety, rollback readiness, and closeout.

## Completion Contract

Deploy is complete only when one of these is true:

- the selected release action finished and was recorded clearly
- the release action is blocked and the blocker is recorded clearly

Every deploy handoff must make these things obvious:

- which release mode was selected
- which provider and mechanism were resolved
- what evidence or links were produced
- what happened to the branch or worktree when branch completion was part of the release action
- what rollback path is currently known
- which exact next command should run next

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Deploy can also handle launch closeout." | Release action and launch discipline are related but distinct. |
| "I'll just guess the staging mechanism." | Unknown deployment config must fail closed. |
| "I can discard or clean up the branch as part of deploy by default." | Branch cleanup needs an explicit path and must not destroy active work. |

## Red Flags

- deploy runs without clear test and review evidence
- provider or mechanism is guessed
- deploy silently turns into release orchestration

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "deploy"`
- `mode`
- `status`
- written artifacts
- provider
- resolved mechanism
- build or release links
- execution evidence
- branch or worktree outcome when applicable
- rollback path
- blockers
- recommended next commands

## Verification

- [ ] one release action was selected explicitly
- [ ] provider and mechanism came from repo archetype and baseline resolution
- [ ] `release.md` and `state.json` are updated
- [ ] handoff to `aw-ship` is clear when launch discipline is still needed

## Final Output Shape

Always end with:

- `Selected Mode`
- `Provider`
- `Resolved Mechanism`
- `Build Links`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `Next`
