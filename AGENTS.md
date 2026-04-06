# AW SDLC Repo Instructions

Use the repo-local AW SDLC files as the source of truth for routing and stage behavior.

## Catalog Snapshot

Catalog snapshot: providing 28 specialized agents, 156 skills, 69 commands for repo-local AW SDLC routing.

agents/ - 28 specialized subagents
skills/ - 156 workflow skills and domain knowledge
commands/ - 69 slash commands

## Public Surface

Keep the public interface intentionally small, but make each stage legible:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

Compatibility entrypoints may remain during migration:

- `/aw:execute` -> compatibility alias to `/aw:build`
- `/aw:verify` -> compatibility entry that routes to `/aw:test`, `/aw:review`, or the smallest correct combined verification flow

Do not introduce public commands for preparation, hidden review-loop helpers, debugging internals, or finish compatibility behavior.
Those stay internal behind the AW stage boundary.

`aw-yolo` is an explicit internal orchestration skill for end-to-end automation.
It is opt-in, not the default public mental model.

## Migration Note

This repo intentionally replaced the older monolithic ECC-style `AGENTS.md` checklist with a repo-local AW SDLC routing contract.
If you were relying on the removed baseline guidance, use these files instead:

- `defaults/aw-sdlc/baseline-profiles.yml` for GHL review, QA, governance, and deploy policy defaults
- `docs/aw-sdlc-command-skill-architecture.md` for command/skill ownership and compatibility rules
- `commands/*.md` for public command contracts and final output shapes
- `skills/aw-*/SKILL.md` for stage behavior, review loops, launch discipline, and internal helpers
- `references/*.md` for reusable checklists, examples, and org-standard guardrails loaded on demand

Treat this as a repo-local behavior change.
Prefer the AW SDLC files above over inherited global ECC workflow guidance when they conflict.

## Routing

- Prefer `skills/using-aw-skills/SKILL.md` for repo-local routing.
- Route by intent when the request is clear.
- Use `/aw:ship` for launch, rollout, rollback readiness, and release closeout work.
- Use `aw-yolo` only when the user explicitly asks for one-run end-to-end automation.
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
- prefer the smallest correct execution sequence
- for approved implementation work, use `prepare -> build`
- for proving quality, use `test -> review`
- for verified release work, use `deploy -> ship` only when rollout or closeout is actually requested
- use `aw-yolo` only when the user explicitly wants the whole flow automated in one pass

## Artifact Contract

Write deterministic outputs under:

- `.aw_docs/features/<feature_slug>/`

Stage artifact expectations:

- build -> `execution.md`, `state.json`
- investigate -> `investigation.md`, `state.json`
- test -> `verification.md`, `state.json`
- review -> `verification.md`, `state.json`
- deploy -> `release.md`, `state.json`
- ship -> `release.md`, `state.json`

Do not treat an internal stage as complete until its required artifacts are written to disk.
A code diff, console summary, or verbal handoff is not a valid substitute for the required stage artifact files.

## Org Standards

Relevant GHL baseline profiles, platform playbooks, and `.aw_rules` remain active across every stage.
That means:

- frontend work should inherit HighRise, design review, accessibility review, and responsive verification expectations
- review should inherit platform review playbooks and PR governance
- test should inherit repo-local validation, E2E, sandbox, and quality-gate expectations from the resolved baseline
- deploy and ship should inherit staging evidence, rollback, and release-safety expectations from the resolved baseline

## Guardrails

- never skip test and review before deploy when the selected baseline requires them
- fail closed for unknown deploy configuration
- prefer repo-local commands, skills, defaults, references, and docs over global fallback behavior
