---
name: aw-deploy
description: Turn verified work into the requested release outcome, with explicit GHL staging provider resolution and deterministic release artifacts.
trigger: Verification passed and the user requests PR creation, branch handoff, or deployment, or `/aw:ship` needs a release outcome.
---

# AW Deploy

## Hard Gate

`aw-verify` must have passed before deploy runs.
If verification is missing or failed, stop and route back to `aw-verify`.

## Purpose

`aw-deploy` owns release outcomes only.
It should not reopen planning or implementation.

Default to one release path.
If the user explicitly asks for a compound release flow, run the requested deploy modes in order, usually `pr -> staging`.

## Supported Modes

| Mode | Use when | Expected result |
|---|---|---|
| `pr` | the work should be handed off for review or merge | PR URL or PR-ready blocker, plus release summary |
| `branch` | the work should remain on a branch | branch outcome or blocker, plus release summary |
| `staging` | the work should be released to staging | staging provider, deployment evidence or blocker, plus release summary |
| `production` | the work is explicitly approved for production | production evidence or blocker, plus release summary |

## Required Behavior

Always:

1. load `.aw_docs/features/<feature_slug>/verification.md`
2. resolve the requested release path
3. resolve the deploy provider from repo archetype and profile
4. resolve the concrete deploy mechanism from repo archetype and profile
5. attempt the requested release action when environment support exists
6. write `.aw_docs/features/<feature_slug>/release.md`
7. update `.aw_docs/features/<feature_slug>/state.json`

## GHL Staging Defaults

For staging, resolve the provider by repo archetype:

- microfrontend -> provider `ghl-ai`, backend `git-jenkins`, mechanism `versioned-mfa-staging`
- microservice -> provider `ghl-ai`, backend `git-jenkins`, mechanism `versioned-service-staging`
- worker -> provider `ghl-ai`, backend `git-jenkins`, mechanism `versioned-worker-staging`
- unknown -> `unconfigured`

## External-System Rule

If real external execution is blocked by missing git context, missing remote configuration, missing Jenkins access, or missing credentials:

- do not pretend the release happened
- still write `release.md`
- record the requested release sequence
- record the resolved provider
- record the exact blocker
- keep the output deterministic and actionable

## Hard Gates

- do not bypass verification
- do not silently choose the wrong provider
- do not mix release paths unless explicitly requested
- do not fail open for unknown staging configuration

## Release Report

`release.md` should capture:

- selected mode or ordered release sequence
- resolved provider
- resolved mechanism
- versioned links or routing references for the selected deploy path
- deployment build links
- testing automation build links
- build status for each relevant build or external job
- execution evidence
- PR outcome or blocker
- staging outcome or blocker
- rollback path
- final outcome

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "deploy"`
- `mode`
- `status`
- release artifacts
- provider resolution
- blockers or release references

## Final Output Shape

Always end with:

- `Selected Mode`
- `Resolved Provider`
- `Resolved Mechanism`
- `Versioned Links`
- `Build Links`
- `Testing Automation Build Links`
- `Build Status`
- `Execution Evidence`
- `Rollback Path`
- `Outcome`
- `Recommended Next`
