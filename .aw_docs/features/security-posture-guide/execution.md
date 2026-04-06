# Execution: Security Posture Guide

## Goal

Make `aw-ecc` feel secure-by-default by adding a concise product-facing security posture guide and surfacing safe defaults directly in onboarding.

## Approved Input

- direct user request to implement the next `P0` improvement from the detailed thread reading
- thread interpretation that the third source is a security guide, not only a general ECC explainer
- existing repo assets already include `SECURITY.md`, `the-security-guide.md`, token guidance, and AgentShield references

## Selected Mode

- `docs`

## Task Loop

1. Inspect current repo security and trust docs.
2. Add a focused `aw-ecc` security posture guide that explains safe defaults and operating boundaries.
3. Surface those defaults in the README and core onboarding path.
4. Connect the new guide to the proof-surface docs.
5. Record deterministic execution evidence.

## Worker Roles

- `implementer`: wrote the product-facing security posture guide and onboarding bridges
- `spec_reviewer`: checked the guidance against the existing security guide, token optimization doc, and repo security policy
- `quality_reviewer`: kept the change narrow, actionable, and aligned with the small-surface onboarding model

## Files Changed

- [README.md](../../../README.md)
- [docs/aw-ecc-core-bundle.md](../../../docs/aw-ecc-core-bundle.md)
- [docs/aw-ecc-proof-surface.md](../../../docs/aw-ecc-proof-surface.md)
- [docs/aw-ecc-security-posture.md](../../../docs/aw-ecc-security-posture.md)

## What Changed

1. Added a README safe-defaults section that treats trust as part of onboarding.
2. Added a focused security posture guide that translates the broader security essay into a concrete `aw-ecc` operating model.
3. Added onboarding bridges from the core bundle and proof-surface docs into the new trust guidance.
4. Made `security-scan` more visible as an early supporting workflow.

## What Did Not Change

- vulnerability disclosure policy
- stage behavior
- installer behavior
- permission enforcement code
- deploy or verify implementation

## Validation

- `node scripts/ci/catalog.js --text`
- `npx markdownlint README.md docs/aw-ecc-core-bundle.md docs/aw-ecc-proof-surface.md docs/aw-ecc-security-posture.md .aw_docs/features/security-posture-guide/execution.md`
- `git diff --check`

## Handoff

The onboarding path now includes a concrete trust layer alongside install shape, workflow leverage, and proof.

Recommended next:

- `/aw:review` for a findings-oriented pass across the combined onboarding and trust story
- `/aw:execute` if you want to turn safe defaults into stronger repo-local enforcement or example demos
