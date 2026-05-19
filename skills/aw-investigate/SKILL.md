---
name: aw-investigate
description: Reproduce, localize, and confirm bugs, alerts, and regressions before broad fixes are attempted.
trigger: User requests bug investigation, alert triage, root-cause analysis, or a legacy fix request arrives without a trustworthy cause.
---

# AW Investigate

## Overview

`aw-investigate` is the public debugging and triage stage.
It turns vague failure into concrete evidence, a likely fault surface, and a clear next step.

## When to Use

- root cause is unclear
- the request starts from an alert, failure, log, or regression report
- repeated fix attempts have already happened
- the right next step might be "gather more evidence," not "change code"

Do not use once the cause is already clear and implementation is ready.

## Workflow

1. Capture the failure signal.
   Record the trigger, expected behavior, actual behavior, and current blast radius.
2. Reproduce or isolate.
   Use `aw-debug` and `../../references/debug-triage.md`.
   Load `diagnose` when the failure is unclear, hard to reproduce, performance-related, or has already attracted speculative fixes.
   For browser-visible issues, load `browser-testing-with-devtools`.
   Prefer the smallest confirming probe over speculative patching.
3. Load the right org-standard context.
   Pull in relevant platform services, frontend, data, or infra playbooks.
   For incident-style problems, load observability or log-analysis helpers as needed.
4. Narrow the fault surface.
   Identify the smallest plausible layer, file set, or dependency boundary.
5. Decide the next stage.
   If the cause is concrete enough, hand off to `aw-build` and name the exact starting slice or repair surface.
   If the work still needs proof, stay in investigation and name the next probe explicitly instead of pausing with a vague "needs more digging" note.
6. Persist the evidence.
   Write `investigation.md` and update `state.json` with completed probes, open questions, and the recommended next command.

## Completion Contract

Investigation is complete only when one of these is true:

- the likely fault surface is concrete enough for `aw-build`
- the next probe is explicit enough for another investigation pass to continue without rediscovery
- the work is blocked and the blocker is named clearly

Every investigation handoff must make these things obvious:

- what was reproduced
- which probes were completed
- what remains uncertain
- which exact next command or next probe should run next

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I already know the likely fix." | Likely is not the same as confirmed. |
| "The third patch will probably work." | Repeated speculative fixes are a debugging failure. |
| "I don't need logs or runtime evidence for this." | Alerts and regressions need concrete signals, not memory. |

## Red Flags

- fix attempts outnumber confirming probes
- the failure is described only in prose, not evidence
- the blast radius is guessed instead of scoped
- the next action is "try another patch" instead of "run the next probe"

## State File

`state.json` should record at least:

- `feature_slug`
- `stage: "investigate"`
- `mode`
- `status`
- written artifacts
- completed probes
- commands run
- likely fault surface
- open questions
- `html_companion_artifacts`
- blockers
- recommended next commands

## Human HTML Companion

Markdown `investigation.md` remains canonical for agents.
When investigate writes or materially updates `investigation.md`, also create or refresh `.aw_docs/features/<feature_slug>/investigation.html`. HTML sidecars are required stage outputs, not advisory metadata.

Delegate to the `aw:echo` subagent with the `investigation-report` profile.
Invoking `/aw:investigate` in default `dual` mode is explicit authorization to spawn exactly one `aw:echo` subagent for HTML companion generation; do not skip HTML only because no direct command is available.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass expected vs actual behavior, probes, evidence, fault surface, confidence, blockers, and next probe or repair path as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip, HCA fallback reason, or blocked reason.
Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar before the final handoff unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and generate the colocated `.html` sidecar in the same turn as a controlled HCA fallback. Do not freehand or command-template HTML outside that skill contract. Record the companion as `generated_hca_fallback` with the exact Echo availability blocker, keep Markdown canonical, and include the fallback note in the final handoff.

## Verification

Before leaving investigate, confirm:

- [ ] reproduction or equivalent failure signal is captured
- [ ] expected vs actual behavior is explicit
- [ ] the likely fault surface is concrete enough to guide build
- [ ] the next stage is clear: build, more investigation, or blocked
- [ ] `investigation.md` and `state.json` are updated
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section as visible absolute URLs, not label-only text. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: <absolute repository URL>` when Echo returns both; never collapse them to bare `TeamOfOne` and `GitHub` labels, Markdown-only hidden links, or any other shorthand without visible URL strings. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Reproduction`
- `Expected vs Actual`
- `Evidence`
- `Completed Probes`
- `Likely Fault Surface`
- `HTML Companion`
- `Remote Docs`
- `Open Questions`
- `Next`
