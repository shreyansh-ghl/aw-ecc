# AW SDLC Install for Codex

## Goal

Use this repo as a repo-local AW SDLC control plane inside Codex without depending on a machine-global router.

## Required Repo Paths

Codex should treat these repo-local paths as the source of truth:

- `AGENTS.md`
- `commands/`
- `skills/`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

The root `AGENTS.md` should provide the first repo-local instruction layer so Codex does not fall back to a parent workspace prompt when running AW SDLC flows in isolation.

## Runtime Rule

At session start, prefer the repo-local router:

- `skills/using-aw-skills/SKILL.md`

Only fall back to an external `.aw_registry` when the repo does not provide its own AW SDLC routing layer.

## Public Commands

The canonical AW delivery surface must remain:

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

Codex should also expose the AW learning and recall helpers:

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

Learned and evolved assets under `~/.claude/skills/learned/` and `~/.claude/homunculus/` stay local.
If a pattern should become a real skill across Codex, Cursor, and Claude, it must be curated into repo `skills/` through `/aw:publish-learning`.

Internal helpers such as `aw-brainstorm`, `aw-prepare`, `aw-review-loop`, `aw-systematic-debugging`, and `aw-finish` should stay behind the public stage boundary.

## Smoke Test

A minimal Codex install is healthy when all of the following are true:

1. a planning request resolves to `/aw:plan`
2. an implementation request resolves to `/aw:build`
3. a QA request resolves to `/aw:test`
4. a review request resolves to `/aw:review`
5. a release request resolves to `/aw:deploy`
6. a learning request can resolve to `/aw:learn-eval` or `/aw:publish-learning`
7. the repo-local router wins over any global fallback

## Artifact Contract

Deterministic stage artifacts should continue to live under:

- `.aw_docs/features/<feature_slug>/`

with stage-specific outputs such as:

- `prd.md`
- `design.md`
- `spec.md`
- `tasks.md`
- `execution.md`
- `verification.md`
- `state.json`
