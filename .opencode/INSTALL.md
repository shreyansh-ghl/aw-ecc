# AW SDLC Install for OpenCode

## Goal

Treat OpenCode as the runtime harness and AW SDLC as the repo-local workflow contract layer.

## Required Repo Paths

OpenCode should have repo-local access to:

- `AGENTS.md`
- `commands/`
- `skills/`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

## Public Commands

Preserve the same public stage surface:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

## Routing Rule

Use the repo-local AW router and keep internal helpers such as `aw-prepare`, `aw-review-loop`, and `aw-systematic-debugging` behind the public stage boundary.

## Artifact Rule

Deterministic stage outputs remain under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when OpenCode can follow the AW SDLC stage model without inventing a separate public workflow or bypassing the verify/deploy split.
