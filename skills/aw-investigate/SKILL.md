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

Invoke `platform-core:human-collaboration-artifacts` with the `investigation-report` profile. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` subagent.
Invoking `/aw:investigate` in default `dual` mode is explicit authorization to run `platform-core:human-collaboration-artifacts` for HTML companion generation. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` subagent; do not skip HTML only because no direct command is available.
Resolve output mode as: explicit user request for Markdown-only -> otherwise `dual`. `.aw_docs/config.json` and `AW_DOCS_OUTPUT_MODE` may request `dual` or `html`, but must not silently suppress required SDLC HTML sidecars.

Pass expected vs actual behavior, probes, evidence, fault surface, confidence, blockers, and next probe or repair path as the source bundle.
Record the colocated sidecar in `state.json` `html_companion_artifacts` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `run_ref` when available, publish status, any Echo availability reason, explicit Markdown-only skip, or blocked reason.
Run `platform-core:human-collaboration-artifacts` and wait for the colocated `.html` sidecar before the final handoff unless the user explicitly asks not to wait. Record the companion as `queued` or `generating` while an optional Echo subagent runs. If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill; do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in `state.json`.

## Verification

Before leaving investigate, confirm:

- [ ] reproduction or equivalent failure signal is captured
- [ ] expected vs actual behavior is explicit
- [ ] the likely fault surface is concrete enough to guide build
- [ ] the next stage is clear: build, more investigation, or blocked
- [ ] `investigation.md` and `state.json` are updated
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, invoke `platform-core:human-collaboration-artifacts` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. When the harness can spawn subagents, the skill may delegate to exactly one `aw:echo` companion job. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish config or publisher internals in this stage. Add HCA/Echo returned links to the final `Remote Docs` section. If HCA/Echo cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

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
