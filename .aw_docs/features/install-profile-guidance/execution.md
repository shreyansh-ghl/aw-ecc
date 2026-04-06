# Execution: Install Profile Guidance

## Goal

Make the install decision as legible as the onboarding stage-flow decision by showing the existing profile choices and direct installer path clearly.

## Approved Input

- direct user request to continue the onboarding improvements in the separate worktree
- prior onboarding slices already added the small stage path and leverage-pattern bridge
- existing repo assets already define install profiles and component composition

## Selected Mode

- `docs`

## Task Loop

1. Confirm that direct install already supports `--profile`, `--with`, and `--without`.
2. Add a README section that explains the current profile set with real examples.
3. Add a focused install-profile guide and link it from the core onboarding doc.
4. Record deterministic execution evidence for the docs slice.

## Worker Roles

- `implementer`: updated the onboarding docs and added the install-profile guide
- `spec_reviewer`: checked the new wording against the existing selective-install design and installer help output
- `quality_reviewer`: kept the change narrow, documentation-only, and aligned with the small-surface onboarding model

## Files Changed

- [README.md](../../../README.md)
- [docs/aw-ecc-core-bundle.md](../../../docs/aw-ecc-core-bundle.md)
- [docs/aw-ecc-install-profiles.md](../../../docs/aw-ecc-install-profiles.md)

## What Changed

1. Added a README section that introduces the built-in install profiles before users hit the bundled `full` install description.
2. Added a focused install-profile guide with profile recommendations, direct installer examples, and composition guidance.
3. Added a core-bundle link so the install choice becomes the next obvious onboarding decision after the AW stage flow.
4. Clarified that the README's `aw init` path is the current bundled default, not the only supported install shape.

## What Did Not Change

- install behavior
- manifest definitions
- profile names
- AW command routing
- platform integration behavior

## Validation

- `node scripts/ci/catalog.js --text`
- `node scripts/install-apply.js --help`
- `node scripts/install-apply.js --target codex --profile core --dry-run --json`
- `node scripts/install-apply.js --target cursor --profile developer --with lang:typescript --with framework:nextjs --dry-run --json`
- `node scripts/install-apply.js --target claude --profile research --with capability:content --dry-run --json`
- `npx markdownlint README.md docs/aw-ecc-core-bundle.md docs/aw-ecc-install-profiles.md`
- `git diff --check`

## Handoff

The onboarding story now covers both the smallest stage path and the smallest install path without adding new install personas.

Recommended next:

- `/aw:review` for a findings-oriented pass on the combined onboarding and install story
- `/aw:execute` if you want to keep tightening the proof, eval, or demo surface
