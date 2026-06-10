# OpenCode Install Notes

## Goal

Treat OpenCode as a runtime harness for the remaining ECC assets. AW SDLC stage routing is no longer owned or shipped by aw-ecc.

## Required Repo Paths

OpenCode should have repo-local access to the active aw-ecc paths:

- `AGENTS.md`
- `commands/`
- `skills/`

## Public Commands

Do not install or recreate the retired AW SDLC public stage surface from aw-ecc:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

## Routing Rule

Use platform docs / the AW registry for AW SDLC routing. aw-ecc keeps only non-SDLC command prompts and registry tooling skills such as `aw-adk` and `aw-publish`.

## Artifact Rule

Deterministic stage outputs remain under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when OpenCode does not expose retired AW SDLC stage commands from aw-ecc and can still load the remaining ECC prompts, hooks, and registry tooling.
