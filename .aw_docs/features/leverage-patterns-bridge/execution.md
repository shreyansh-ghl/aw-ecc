# Execution: Leverage Patterns Bridge

## Goal

Make the longform leverage patterns easier to discover from the main onboarding path without forcing new users to read the full longform guide first.

## Approved Input

- direct user request to continue the onboarding improvements in the separate worktree
- current onboarding slice already completed through `aw-ecc-core-bundle.md`

## Selected Mode

- `docs`

## Files Changed

- [README.md](../../../README.md)
- [docs/aw-ecc-core-bundle.md](../../../docs/aw-ecc-core-bundle.md)
- [docs/aw-ecc-leverage-patterns.md](../../../docs/aw-ecc-leverage-patterns.md)

## What Changed

1. Added a bridge from the README onboarding path into a focused leverage-patterns guide.
2. Added the same next-step bridge from the core bundle doc.
3. Created a concise AW-facing guide that pulls together context management, verification, learning, and context-budgeting patterns from existing repo assets.

## What Did Not Change

- command routing
- install profiles
- longform source content
- skill implementation details

## Validation

- `node scripts/ci/catalog.js --text`
- `npx markdownlint README.md docs/aw-ecc-core-bundle.md docs/aw-ecc-leverage-patterns.md`
- `git diff --check`

## Handoff

The stage flow and the compounding patterns are now connected by one obvious docs path.

Recommended next:

- `/aw:review` for a findings-oriented pass on the combined onboarding story
- `/aw:execute` if you want to keep tightening first-run install and setup guidance
