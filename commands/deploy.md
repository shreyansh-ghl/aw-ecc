---
name: aw:deploy
description: Create one requested release outcome for work that already has the required QA, review, and readiness evidence.
argument-hint: "<reviewed work, target environment, or release request>"
status: active
stage: deploy
internal_skill: aw-deploy
---

# Deploy

Use `/aw:deploy` to turn reviewed work into a PR, branch handoff, or deployment outcome.

## Role

Perform one explicit release action with the correct GHL provider and mechanism for the current repo archetype.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `pr` | work should be handed off for review or merge | PR URL, `release.md`, `state.json` |
| `branch` | work should remain on a branch | branch name, `release.md`, `state.json` |
| `staging` | reviewed work should go to staging | deploy evidence, `release.md`, `state.json` |
| `production` | explicitly approved work should go to production | deploy evidence, `release.md`, `state.json` |

## Required Inputs

- passing test and review outcome, or a compatible verified state that resolves to the same evidence
- branch or change set
- relevant release context
- resolved deploy profile when present

## Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- one concrete release outcome artifact:
  - PR URL
  - branch name
  - staging URL
  - deployment reference
  - build links
  - status summary

## Deploy Rules

1. Do one release action at a time.
2. Resolve the provider and mechanism from repo archetype and baseline profile.
3. Record deterministic evidence even when external execution is blocked.
4. Hand off to `/aw:ship` when launch, rollout, rollback readiness, or release closeout is requested after deploy.

## Must Not Do

- must not bypass test and review evidence
- must not silently choose the wrong provider
- must not reopen planning during deployment

## Recommended Next Commands

- `/aw:ship`

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
