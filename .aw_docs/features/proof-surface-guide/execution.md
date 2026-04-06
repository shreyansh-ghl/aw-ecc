# Execution: Proof Surface Guide

## Goal

Make the AW proof story easy to inspect by turning the existing confidence, eval, and artifact-contract docs into one obvious onboarding guide.

## Approved Input

- direct user request to continue improving the onboarding path in the separate worktree
- existing repo docs already define the confidence ladder, real-eval checklist, and artifact contract

## Selected Mode

- `docs`

## Task Loop

1. Find the current confidence, eval, and artifact-contract docs in this older branch.
2. Create one focused proof-surface guide that explains what to inspect first.
3. Link that guide from the README so proof becomes part of onboarding, not hidden deep in the docs tree.
4. Record deterministic execution evidence for the slice.

## Worker Roles

- `implementer`: wrote the proof-surface guide and README bridge
- `spec_reviewer`: checked the guide against the existing confidence-plan, real-eval checklist, and e2e artifact docs
- `quality_reviewer`: kept the change user-facing, grounded in current repo assets, and narrow in scope

## Files Changed

- [README.md](../../../README.md)
- [docs/aw-ecc-proof-surface.md](../../../docs/aw-ecc-proof-surface.md)

## What Changed

1. Added a README section that frames AW trust in terms of evidence, artifacts, and demos instead of catalog size.
2. Created a focused proof-surface guide that links the existing confidence plan, real-eval checklist, and artifact-contract docs.
3. Added three user-facing demo paths for feature flow, repair-loop behavior, and ship readiness.
4. Clarified which layers this engine repo can prove locally and which require real target repos.

## What Did Not Change

- eval scripts
- confidence thresholds
- stage artifact contract
- deploy behavior
- target-repo integration behavior

## Validation

- `node scripts/ci/catalog.js --text`
- `test -f tests/evals/run-aw-sdlc-evals.sh && test -f tests/evals/run-aw-sdlc-real-parallel.sh`
- `npx markdownlint README.md docs/aw-ecc-proof-surface.md`
- `git diff --check`

## Handoff

The onboarding story now covers stage flow, install shape, leverage patterns, and the proof surface that makes the workflow credible.

Recommended next:

- `/aw:review` for a findings-oriented pass across the whole onboarding path
- `/aw:execute` if you want to turn the three demo paths into first-class example artifacts
