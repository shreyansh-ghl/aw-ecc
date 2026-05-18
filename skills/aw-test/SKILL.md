---
name: aw-test
description: Produce fresh QA evidence for feature, bugfix, frontend runtime, and release scopes using repo and org quality gates.
trigger: User requests QA, validation, regression proof, runtime proof, or a legacy verify request resolves to the testing stage.
---

# AW Test

## Overview

`aw-test` owns QA proof.
It turns implementation into current, scoped evidence that review and deploy can trust, and it should continue until the requested QA scope is actually covered.

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
3. Run the right checks.
   Use `../../references/testing-patterns.md` for test structure.
   For frontend work, load `../../references/frontend-quality-checklist.md`.
   For accessibility-sensitive UI, load `../../references/accessibility-checklist.md`.
   For substantial UI validation, load `frontend-ui-engineering`.
   For live browser, DOM, console, network, or runtime-proof work, load `browser-testing-with-devtools`.
   For performance-sensitive paths, load `performance-optimization` and `../../references/performance-checklist.md`.
4. Continue through the requested QA scope.
   Do not stop after the first passing check if the requested feature, bugfix, UI-runtime, or release scope still has missing evidence.
   Only stop early when the remaining work clearly belongs to another stage or a blocker prevents additional testing.
5. Record evidence, not vibes.
   Name which commands ran, what passed, what failed, what was unavailable, and what still remains unproven.
6. Decide the handoff.
   Route to `aw-review` when findings, governance, or readiness decisions remain.
   Route to `aw-build` when a failure needs repair.
   If the stage is blocked, name the blocker and the smallest safe next action explicitly.
7. Persist the result.
   Write `verification.md` and update `state.json`.

## Completion Contract

Testing is complete only when one of these is true:

- the requested QA scope has fresh enough evidence for the next stage
- a failure sends the work back to `aw-build`
- a blocker prevents additional proof and that blocker is explicit

Every testing handoff must make these things obvious:

- which scope was tested
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
- evidence artifacts
- failures
- unavailable checks
- `html_companion_artifacts`
- blockers
- recommended next commands

## Human HTML Companion

Markdown `verification.md` remains canonical for agents.
When test writes or materially updates `verification.md`, also create or refresh `.aw_docs/features/<feature_slug>/verification.html`. HTML sidecars are required stage outputs, not advisory metadata.

Delegate to the `aw:echo` subagent with the `verification-report` profile.
Invoking `/aw:test` in default `dual` mode is explicit authorization to spawn exactly one `aw:echo` subagent for HTML companion generation; do not skip HTML only because no direct command is available.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass QA scope, checks run, pass/fail/unavailable lanes, runtime evidence, screenshots or links when safe, failures, confidence, and next command as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip or Echo-blocked reason.
Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar before the final handoff unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, do not hand-roll or command-generate HTML. Record the companion as `blocked` with the exact Echo availability blocker, keep Markdown canonical, and stop the stage handoff with `HTML Companion: blocked`.

## Verification

Before leaving test, confirm:

- [ ] the QA scope is explicit and proportional
- [ ] org-standard baseline checks were applied where available
- [ ] unavailable checks are marked unavailable, not silently passed
- [ ] fresh evidence is written to `verification.md`
- [ ] `state.json` is updated with checks, failures, and next action
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Scope`
- `Checks Run`
- `Evidence`
- `Failures`
- `Unavailable`
- `HTML Companion`
- `Remote Docs`
- `Next`
