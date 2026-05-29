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
When `aw-test` writes or materially updates `verification.md`, HTML sidecars are required in `dual` and `html` output modes, not advisory metadata. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/verification.html` with the `verification-report` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Pass QA scope, checks run, pass/fail/unavailable lanes, runtime evidence, screenshots or links when safe, failures, confidence, and next command as the source bundle.
Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Verification

Before leaving test, confirm:

- [ ] the QA scope is explicit and proportional
- [ ] org-standard baseline checks were applied where available
- [ ] unavailable checks are marked unavailable, not silently passed
- [ ] fresh evidence is written to `verification.md`
- [ ] `state.json` is updated with checks, failures, and next action
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned Devtools/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as plain-text absolute Devtools URLs rooted at `https://devtools.servers.stg.msgsndr.net/` (no Markdown link syntax around the Devtools URL) with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `Devtools: <absolute remote URL>` as raw visible text and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never render Devtools as `[Devtools](...)`, `[Spec Devtools](...)`, or any other Markdown link label; never hide the Devtools URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

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
