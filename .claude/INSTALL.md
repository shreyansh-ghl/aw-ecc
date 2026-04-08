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

Keep the canonical public surface aligned with the AW stage model:

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

Internal helpers remain internal.

## Learning Utilities

Claude Code should also expose:

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

Learned, imported, and evolved assets under home-directory learning roots remain local.
Only repo `skills/` are shipped across Claude, Codex, and Cursor installs, so harness-portable learning should flow through `/aw:publish-learning`.

## Routing Rule

Prefer the repo-local `skills/using-aw-skills/SKILL.md` router before any global fallback.

## Artifact Rule

Deterministic stage artifacts stay under:

- `.aw_docs/features/<feature_slug>/`

## Smoke Bar

The install is healthy when the harness can route planning, build, investigate, test, review, deploy, ship, and learning requests to the same AW surfaces without widening the stage model.
