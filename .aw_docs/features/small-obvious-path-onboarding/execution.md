# Execution: Small Obvious Path Onboarding

## Goal

Make the first-run `aw-ecc` onboarding experience smaller and more legible by giving newcomers one default workflow and one obvious follow-up doc.

## Approved Input

- direct user approval to continue with the next ranked improvement
- selected `P1`: make the small obvious path the default onboarding experience

## Selected Mode

- `docs`

## Files Changed

- [README.md](../../../README.md)
- [docs/aw-ecc-core-bundle.md](../../../docs/aw-ecc-core-bundle.md)

## What Changed

1. Added a `Start Here` section to the README that gives one default AW workflow instead of forcing the whole catalog up front.
2. Created a dedicated `docs/aw-ecc-core-bundle.md` guide that explains the smallest public stage flow and the few supporting skills worth learning early.
3. Kept the onboarding improvement narrow: this slice does not change routing, install behavior, or the deeper command system.

## What Did Not Change

- command contracts
- install manifests and profiles
- stage behavior
- validation rules
- launch copy

## Validation

- `node scripts/ci/catalog.js --text`
- `npx markdownlint README.md docs/aw-ecc-core-bundle.md`

## Handoff

This slice improves first-touch onboarding without expanding the public surface.

Recommended next:

- `/aw:review` for a findings-oriented pass on onboarding clarity
- `/aw:execute` if you want to continue with the longform pattern productization work
