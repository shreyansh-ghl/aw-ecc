# AW SDLC Install for Claude Code

## Goal

Load AW SDLC as a repo-local workflow layer so Claude Code routes to the same public stage surface as Codex.

## Required Repo Paths

Claude Code should use these repo-local paths as the source of truth:

- `AGENTS.md`
- `commands/`
- `skills/`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

## Public Commands

Keep the canonical public surface unchanged:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

Internal helpers remain internal.

## Routing Rule

Prefer the repo-local `skills/using-aw-skills/SKILL.md` router before any global fallback.

## Artifact Rule

Deterministic stage artifacts stay under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when the harness can route planning, execution, verification, deploy, and ship requests to the same AW SDLC public stages without widening the surface.
