---
name: aw:verify
description: Prove quality and staging readiness with structured review, real validation, and PR governance checks.
argument-hint: "<branch, PR, diff, artifact, or readiness request>"
status: active
stage: verify
internal_skill: aw-verify
---

# Verify

Use `/aw:verify` to prove the work is correct, compliant, and ready for the next handoff.

This is the public verification command. It intentionally includes review, testing, PR governance, and readiness inside one stage.

## Role

Produce objective evidence that the work is correct, compliant, and ready for release.
`FAIL` is a valid verify outcome, but the stage is incomplete until `verification.md` and `state.json` are written.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `quality` | general implementation validation | `verification.md`, `state.json` |
| `review` | findings-oriented review is requested | `verification.md`, `state.json` |
| `readiness` | staging or production readiness is the goal | `verification.md`, `state.json` |

## Required Inputs

- completed implementation or change set
- relevant planning artifacts
- repo context
- relevant platform docs
- relevant `.aw_rules`
- resolved verify profile when present

## Optional Inputs

- branch, PR, diff, or staging URL
- prior concerns from execute

## Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- explicit overall status: `PASS`, `PASS_WITH_NOTES`, or `FAIL`

## Verify Layers

| Layer | Responsibility |
|---|---|
| `code_review` | run specialist review playbooks |
| `local_validation` | run unit tests, integration tests, lint, typecheck, and build |
| `e2e_validation` | run E2E coverage in-repo or via mapped test repo |
| `external_validation` | run sandbox or downstream validation where configured |
| `pr_governance` | validate PR description checklist, required statuses, approvals, and quality gates |
| `release_readiness` | produce a go/no-go recommendation |

## Hard Gates

- no pass claim without evidence
- no completion claim survives stale evidence after code changes
- unit testing belongs in `local_validation`
- PR governance cannot pass if the PR checklist says verification is incomplete
- deploy must not happen before verify succeeds
- blocking findings require an explicit repair loop recommendation
- repaired work must be re-reviewed before release readiness can pass
- failing validation is not a reason to skip `verification.md` or `state.json`; the failed verify artifact is the evidence

## Must Not Do

- must not claim success from intuition alone
- must not hide blocking findings inside summary prose
- must not implement code while verifying
- must not treat debugging as optional when a bug fix remains inconclusive

## Repair Loop

When findings block release:

1. list the blocking findings with evidence
2. name the required repair scope
3. recommend `/aw:execute` as the next stage
4. require re-review after the repair
5. rerun the affected checks instead of reusing pre-fix evidence
6. persist the failing verification artifact before returning

Verification should preserve the distinction between:

- `PASS`
- `PASS_WITH_NOTES`
- `FAIL`

## TDD and Debugging Checks

For bug fixes and behavioral changes, verify should check whether execution used the smallest correct test-first or failure-first discipline.

When the result is still uncertain, include a debugging trace covering:

- reproduction
- root-cause hypothesis
- confirming evidence
- next probe

## Recommended Next Commands

- `/aw:deploy`
- `/aw:execute` if fixes are required

## Internal Routing

Verification should use `aw-verify` and load repo/baseline-specific playbooks as configured.
It may emit a repair loop back to `aw-execute`, but `/aw:verify` remains the public stage boundary.

## Final Output Shape

Always end with:

- `Layer Results`
- `Evidence`
- `Findings`
- `Repair Loop`
- `PR Readiness`
- `Release Readiness`
- `Overall Status`
- `Recommended Next`
