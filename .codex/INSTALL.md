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

## Codex Skill Discovery

Codex auto-discovers repo-local skills from:

- `.agents/skills/<skill_name>/SKILL.md`
- `.agents/skills/<skill_name>/agents/openai.yaml`

This repo keeps the canonical AW skill content in:

- `skills/`

Sync the Codex-facing wrappers with:

```bash
python3 scripts/sync-aw-skills-to-agents.py
```

Run that sync after adding or renaming repo-local AW skills.

## Runtime Rule

At session start, prefer the repo-local router:

- `skills/using-aw-skills/SKILL.md`

Only fall back to an external `.aw_registry` when the repo does not provide its own AW SDLC routing layer.

## Public Commands

The canonical public surface must remain:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

Internal helpers such as `aw-brainstorm`, `aw-prepare`, `aw-review-loop`, `aw-systematic-debugging`, and `aw-finish` should stay behind the public stage boundary.

## Smoke Test

A minimal Codex install is healthy when all of the following are true:

1. a planning request resolves to `/aw:plan`
2. an implementation request resolves to `/aw:execute`
3. a review request resolves to `/aw:verify`
4. a release request resolves to `/aw:deploy`
5. the repo-local router wins over any global fallback

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
