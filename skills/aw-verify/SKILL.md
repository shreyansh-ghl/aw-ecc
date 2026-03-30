---
name: aw-verify
description: Run evidence-based verification, PR governance checks, and release-readiness checks, then write `verification.md` and update `state.json`.
trigger: User requests review or validation, implementation is complete, or `/aw:ship` needs release readiness evidence.
---

# AW Verify

## Hard Gate

No verification claim is valid without evidence.
Run real commands where the repo supports them and capture the output in the verification artifact.

## Purpose

`aw-verify` owns evidence, review, governance, and readiness.
It must not write new implementation code unless the user explicitly switches back to execution.

## Verification Layers

Run the fixed verify layers in order:

1. `code_review`
2. `local_validation`
3. `e2e_validation`
4. `external_validation`
5. `pr_governance`
6. `release_readiness`

## Required Behavior

Always:

1. load the relevant implementation context
2. compare the work against `.aw_docs/features/<feature_slug>/spec.md` when present
3. run local validation commands when available
4. inspect `PR_DESCRIPTION.md` or equivalent PR checklist when present
5. write `.aw_docs/features/<feature_slug>/verification.md`
6. update `.aw_docs/features/<feature_slug>/state.json`
7. route to `aw-deploy` only when overall status passes

## Local Validation

Run the smallest correct set of available commands and record output:

- unit or integration tests, typically `npm run test`
- type-check, typically `npm run type-check`
- lint, typically `npm run lint`
- build, typically `npm run build`

If a repo does not provide one of these commands, record that it was unavailable instead of inventing a pass.

## PR Governance

When a PR description or checklist is present, verify:

- the checklist reflects what was actually run
- required verification items are marked
- the summary matches the implemented change

## Release Readiness

Confirm at least:

- overall verification status
- blocking findings, if any
- whether the work is ready for PR, branch handoff, or staging

## Hard Gates

- do not claim success from intuition alone
- do not skip command output when checks can be run
- do not deploy from `aw-verify`

## Verification Report

`verification.md` should capture:

- selected verify mode
- command output evidence
- review findings
- PR governance result
- release readiness result
- overall status: `PASS`, `PASS_WITH_NOTES`, or `FAIL`
- recommended next stage

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "verify"`
- `mode`
- `status`
- verification artifacts
- commands run
- recommended next commands

## Final Output Shape

Always end with:

- `Selected Mode`
- `Evidence`
- `Findings`
- `Governance`
- `Readiness`
- `Outcome`
- `Recommended Next`
