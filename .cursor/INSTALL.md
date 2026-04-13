# AW SDLC Install for Cursor

## Goal

Use AW SDLC as the repo-local control plane while Cursor continues to provide the editor and execution runtime.

## Required Repo Paths

Cursor-facing rules or prompts should point at:

- `AGENTS.md`
- `commands/`
- `skills/`
- `.cursor/rules/common-aw-routing.md`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

## Public Commands

Map intent to the same public stage surface:

- `/aw-plan`
- `/aw-execute`
- `/aw-verify`
- `/aw-deploy`
- `/aw-ship`

## Contract Rule

Cursor-specific prompt wrappers may exist, but they should stay thinner than the AW SDLC stage skills and must not introduce extra public stages.

The global Cursor routing rule should be `alwaysApply: true` and must:

- require `using-aw-skills` first
- require the smallest correct AW stage route first
- point Cursor at bundled AW skills under `~/.cursor/skills/`
- point Cursor at org rules under `~/.aw_rules/platform/`
- keep repo-local instructions additive only

## Artifact Rule

Deterministic artifacts stay under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when a planning request, implementation request, review request, release request, and full ship request all resolve to the AW SDLC stage model instead of a Cursor-only workflow vocabulary.
