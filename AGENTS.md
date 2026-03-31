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

## Activation Rule

Before any substantive response:

1. resolve the request to one AW public route
2. prefer the explicit public command when the user names it
3. otherwise choose the smallest correct AW stage by intent
4. only after the route is selected, load deeper domain or internal helper behavior

Do not begin with generic workflow commentary, implementation advice, or release guidance before the AW route is selected.
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
