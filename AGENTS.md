# AW SDLC Repo Instructions

Use the repo-local AW SDLC files as the source of truth for routing and stage behavior.

## Public Surface

Keep the public interface intentionally small:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

Do not introduce new public commands for preparation, review-loop, debugging, or finish behavior.
Those stay internal behind the AW stage boundary.

## Routing

- Prefer `skills/using-aw-skills/SKILL.md` for repo-local routing.
- Route by intent when the request is clear.
- Use `/aw:ship` only for explicit end-to-end or multi-release requests.

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
