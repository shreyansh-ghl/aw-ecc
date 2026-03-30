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
- unit testing belongs in `local_validation`
- PR governance cannot pass if the PR checklist says verification is incomplete
- deploy must not happen before verify succeeds

## Must Not Do

- must not claim success from intuition alone
- must not hide blocking findings inside summary prose
- must not implement code while verifying

## Recommended Next Commands

- `/aw:deploy`
- `/aw:execute` if fixes are required

## Internal Routing

Verification should use `aw-verify` and load repo/baseline-specific playbooks as configured.

## Final Output Shape

Always end with:

- `Layer Results`
- `Evidence`
- `Findings`
- `PR Readiness`
- `Release Readiness`
- `Overall Status`
- `Recommended Next`
