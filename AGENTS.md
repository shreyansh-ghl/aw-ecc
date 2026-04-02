# AW SDLC Repo Instructions

Use the repo-local AW SDLC files as the source of truth for routing and stage behavior.

## Catalog Snapshot

Catalog snapshot: providing 28 specialized agents, 139 skills, 65 commands for repo-local AW SDLC routing.

agents/ — 28 specialized subagents
skills/ — 139 workflow skills and domain knowledge
commands/ — 65 slash commands

## Public Surface

Keep the public interface intentionally small:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

Do not introduce new public commands for preparation, review-loop, debugging, or finish behavior.
Those stay internal behind the AW stage boundary.

## Migration Note

This repo intentionally replaced the older monolithic ECC-style `AGENTS.md` checklist with a repo-local AW SDLC routing contract.
If you were relying on the removed baseline guidance, use these files instead:

- `defaults/aw-sdlc/baseline-profiles.yml` for verify and deploy policy defaults
- `docs/aw-sdlc-command-skill-architecture.md` for command/skill ownership and compatibility rules
- `commands/*.md` for public command contracts and final output shapes
- `skills/aw-*/SKILL.md` for stage behavior, review loops, finish compatibility, and internal helpers

Treat this as a repo-local behavior change.
Prefer the AW SDLC files above over inherited global ECC workflow guidance when they conflict.

## Routing

- Prefer `skills/using-aw-skills/SKILL.md` for repo-local routing.
- Route by intent when the request is clear.
- Use `/aw:ship` only for explicit end-to-end or multi-release requests.
- Keep the public route at `/aw:plan` even when planning internally uses `aw-brainstorm`, `aw-spec`, and `aw-tasks`.

## Activation Rule

Before any substantive response:

1. select the smallest correct AW skill stack first
2. prefer the explicit public command and its mapped stage skill when the user names it
3. otherwise choose the needed process skill, primary stage skill, and matching public route by intent
4. only after the skill stack is selected, load deeper domain behavior or ask clarifying questions

Do not begin with generic workflow commentary, implementation advice, or release guidance before the AW skill stack is selected.
Do not bypass repo-local AW routing just because a global or parent workspace instruction layer also exists.

## Fast Path

When `.aw_docs/features/<feature_slug>/spec.md` and concrete approved execution inputs already exist:

- do not reopen planning only because richer artifacts are absent
- prefer the smallest correct ship sequence
- for approved implementation work to staging, use `prepare -> execute -> verify -> deploy`

## Artifact Contract

Write deterministic outputs under:

- `.aw_docs/features/<feature_slug>/`

Stage artifact expectations:

- execute -> `execution.md`, `state.json`
- verify -> `verification.md`, `state.json`
- deploy -> `release.md`, `state.json`

Do not treat an internal stage as complete until its required artifacts are written to disk.
A code diff, console summary, or verbal handoff is not a valid substitute for the required stage artifact files.

## Guardrails

- never skip verify before deploy
- fail closed for unknown deploy configuration
- prefer repo-local commands, skills, defaults, and docs over global fallback behavior
