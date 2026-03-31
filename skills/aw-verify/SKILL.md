---
name: aw-verify
description: Run evidence-based verification, PR governance checks, and release-readiness checks, then write `verification.md` and update `state.json`.
trigger: User requests review or validation, implementation is complete, or `/aw:ship` needs release readiness evidence.
---

# AW Verify

## Hard Gate

No verification claim is valid without evidence.
Run real commands where the repo supports them and capture the output in the verification artifact.
No completion claim survives stale evidence after the code has changed.

## Purpose

`aw-verify` owns evidence, review, governance, and readiness.
It uses `aw-review-loop` for findings rigor and may invoke `aw-systematic-debugging` when root cause is still unclear.
It must not write new implementation code unless the user explicitly switches back to execution.
A `FAIL` result still counts as a completed verify stage only after the failure artifact is written to disk.

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
5. request the smallest correct review scope through `aw-review-loop`
6. classify findings explicitly as blocking or non-blocking
7. when blocking findings exist, produce a repair-focused handoff back to `aw-execute`
8. require re-review after repair instead of carrying prior evidence forward
9. write `.aw_docs/features/<feature_slug>/verification.md`
10. update `.aw_docs/features/<feature_slug>/state.json`
11. route to `aw-deploy` only when overall status passes
12. treat a failing verify run as incomplete until the failure evidence, repair loop, and next-step recommendation are persisted to disk
13. require fresh evidence after repair before any prior failure can be considered cleared

## Local Validation

Run the smallest correct set of available commands and record output:

- unit or integration tests, typically `npm run test`
- type-check, typically `npm run type-check`
- lint, typically `npm run lint`
- build, typically `npm run build`

If a repo does not provide one of these commands, record that it was unavailable instead of inventing a pass.

## Findings and Re-Review Loop

Verification owns the findings loop:

1. capture findings with severity and evidence
2. decide whether the outcome is `PASS`, `PASS_WITH_NOTES`, or `FAIL`
3. when the outcome is `FAIL`, emit a repair loop handoff to `aw-execute`
4. require re-review after fixes before release readiness can pass
5. mark prior findings as resolved, partially resolved, or unresolved during re-review

Do not treat a bare findings list as complete verification unless the next action is explicit.
Failing command output is still evidence, and verification is not complete until that failure is captured in `verification.md` and `state.json`.

## Fresh Evidence Rule

After implementation changes, prior validation output becomes stale for the affected scope.

Verification must:

- rerun the relevant checks
- request re-review when blocking findings were fixed
- avoid success claims based on pre-fix evidence

## TDD and Debugging Expectations

For bug fixes and behavioral changes, verify should check whether execution respected the smallest correct test-first or failure-first discipline.

When the work is still inconclusive or bug-oriented, include a debugging trace:

- reproduction signal
- suspected root cause
- confirming evidence
- next probe if the result is still uncertain

If the cause is still uncertain, invoke `aw-systematic-debugging` before closing the verify outcome.

## Review Request and Reception

Verification uses `aw-review-loop` to both request and receive review:

- request the narrowest correct review scope
- classify findings by severity and evidence
- avoid treating reviewer acknowledgment as proof
- require fresh evidence before findings move to resolved

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
- resolved deploy provider or mechanism context when known
- evidence links or explicit `NOT_AVAILABLE` / `BLOCKED` status for build and testing automation

## Hard Gates

- do not claim success from intuition alone
- do not skip command output when checks can be run
- do not deploy from `aw-verify`
- do not return early on failure before writing `verification.md` and `state.json`
- do not clear blocking findings on stale validation output

## Verification Report

`verification.md` should capture:

- selected verify mode
- layer-by-layer result table
- command output evidence
- review findings
- review scope requested
- finding resolution state during re-review
- repair loop status
- TDD or debugging notes when applicable
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
- blocking findings
- repair required: true/false
- recommended next commands

## Final Output Shape

Always end with:

- `Selected Mode`
- `Evidence`
- `Findings`
- `Repair Loop`
- `Governance`
- `Readiness`
- `Outcome`
- `Recommended Next`
