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
4. Execute or record the blocker.
   External failure should still yield deterministic `release.md` evidence.
5. Hand off to `aw-ship` when requested.
   Use `aw-ship` for rollout safety, rollback readiness, and closeout.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Deploy can also handle launch closeout." | Release action and launch discipline are related but distinct. |
| "I'll just guess the staging mechanism." | Unknown deployment config must fail closed. |

## Red Flags

- deploy runs without clear test and review evidence
- provider or mechanism is guessed
- deploy silently turns into release orchestration

## Verification

- [ ] one release action was selected explicitly
- [ ] provider and mechanism came from repo archetype and baseline resolution
- [ ] `release.md` and `state.json` are updated
- [ ] handoff to `aw-ship` is clear when launch discipline is still needed
