# AW SDLC Install for Cursor

## Goal

Use AW SDLC as the repo-local control plane while Cursor continues to provide the editor and execution runtime.

## Required Repo Paths

Cursor-facing rules or prompts should point at:

- `AGENTS.md`
- `commands/`
- `skills/`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

## Public Commands

Map intent to the same public stage surface:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

Compatibility routes may still exist:

- `/aw:execute`
- `/aw:verify`

## Learning Utilities

Cursor should surface the same AW learning helpers:

- `/aw:learn`
- `/aw:learn-eval`
- `/aw:instinct-status`
- `/aw:evolve`
- `/aw:promote`
- `/aw:publish-learning`
- `/aw:save-session`
- `/aw:resume-session`
- `/aw:sessions`

## Portable Skills

Local learned or evolved outputs are not automatically portable across harnesses.
Patterns that should install into Codex, Cursor, and Claude must be published into repo `skills/` via `/aw:publish-learning`.

## Contract Rule

Cursor-specific prompt wrappers may exist, but they should stay thinner than the AW SDLC stage skills and must not introduce extra public stages.

## Artifact Rule

Deterministic artifacts stay under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when planning, implementation, investigate, QA, review, release, and learning requests all resolve to the AW model instead of a Cursor-only workflow vocabulary.
