---
name: aw-test
description: Produce fresh QA evidence for feature, bugfix, frontend runtime, and release scopes using repo and org quality gates.
trigger: User requests QA, validation, regression proof, runtime proof, or a legacy verify request resolves to the testing stage.
---

# AW Test

## Overview

`aw-test` owns QA proof.
It turns implementation into current, scoped evidence that review and deploy can trust, and it should continue until the requested QA scope is actually covered.
Communicate results for a zero-context reader: say what was tested, what evidence was checked, what passed, and what still blocks confidence in plain language.

## When to Use

- the request is to test a feature or bugfix
- the work needs fresh validation after build
- frontend behavior needs runtime proof
- release preparation needs broader QA evidence
- a legacy `/aw:verify` request is primarily about testing

Do not use for findings-oriented review or launch closeout.

## Workflow

1. Select the smallest correct QA scope.
   Use `../../references/test-scope-and-evidence.md`.
   Distinguish feature QA, bugfix regression proof, UI runtime proof, and release QA.
2. Resolve org standards.
   Load the resolved GHL baseline profile.
   Pull in the required local validation, E2E, external validation, sandbox, and quality-gate expectations.
3. Build the smallest evidence matrix that matches the change.
   Decide which evidence lanes are required: unit, integration, regression, browser/runtime, accessibility, performance, security-sensitive checks, staging smoke, or release QA.
   Skip a lane only when it is clearly not applicable or truly unavailable, and record that decision explicitly.
4. Run the right checks.
   Use `../../references/testing-patterns.md` for test structure.
   For frontend work, load `../../references/frontend-quality-checklist.md`.
   For accessibility-sensitive UI, load `../../references/accessibility-checklist.md`.
   For substantial UI validation, load `frontend-ui-engineering`.
   For live browser, DOM, console, network, or runtime-proof work, load `browser-testing-with-devtools`.
   For performance-sensitive paths, load `performance-optimization` and `../../references/performance-checklist.md`.
   When CI, runtime, or staging failures already exist, inspect the actual failing logs and artifacts instead of restating a guessed root cause.
5. Continue through the requested QA scope.
   Do not stop after the first passing check if the requested feature, bugfix, UI-runtime, or release scope still has missing evidence.
   Only stop early when the remaining work clearly belongs to another stage or a blocker prevents additional testing.
6. Record evidence, not vibes.
   Name which commands ran, what passed, what failed, what was unavailable, and what still remains unproven.
7. Decide the handoff.
   Route to `aw-review` when findings, governance, or readiness decisions remain.
   Route to `aw-build` when a failure needs repair.
   If the stage is blocked, name the blocker and the smallest safe next action explicitly.
   When the next test action is safe and obvious, execute it instead of stopping at a suggestion.
8. Persist the result.
   Write `verification.md` and update `state.json`.

## Completion Contract

Testing is complete only when one of these is true:

- the requested QA scope has fresh enough evidence for the next stage
- a failure sends the work back to `aw-build`
- a blocker prevents additional proof and that blocker is explicit

Every testing handoff must make these things obvious:

- which scope was tested
- which evidence lanes were required versus skipped
- which checks ran
- which evidence passed or failed
- which gaps are still unavailable or unresolved
- which exact next command should run next

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Review can cover testing later." | Review is stronger when QA evidence is already concrete. |
| "The unit tests are enough for this frontend change." | UI work may also need responsive, accessibility, and runtime proof. |
| "The check doesn't exist, so I can treat it as passed." | Unavailable is not the same as passed. Record the gap explicitly. |
| "Release QA can stay high-level." | Risky release work needs concrete smoke, monitoring, and rollback-relevant evidence. |

## Red Flags

- stale evidence after code changed
- no regression proof for a bugfix
- frontend changes have no runtime or responsive evidence
- release QA is described vaguely instead of by concrete checks

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "test"`
- `mode`
- `status`
- written artifacts
- commands run
- evidence lanes
- evidence artifacts
- failures
- unavailable checks
- blockers
- recommended next commands

## Verification

Before leaving test, confirm:

- [ ] the QA scope is explicit and proportional
- [ ] org-standard baseline checks were applied where available
- [ ] the required evidence lanes were explicit instead of implied
- [ ] unavailable checks are marked unavailable, not silently passed
- [ ] fresh evidence is written to `verification.md`
- [ ] `state.json` is updated with checks, failures, and next action

## Final Output Shape

Always end with:

- `Mode`
- `Scope`
- `Evidence Lanes`
- `Checks Run`
- `Evidence`
- `Failures`
- `Unavailable`
- `Next`
