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
   For browser-visible issues, load `browser-testing-with-devtools`.
   Prefer the smallest confirming probe over speculative patching.
3. Load the right org-standard context.
   Pull in relevant platform services, frontend, data, or infra playbooks.
   For incident-style problems, load observability or log-analysis helpers as needed.
4. Narrow the fault surface.
   Identify the smallest plausible layer, file set, or dependency boundary.
5. Decide the next stage.
   If the cause is concrete enough, hand off to `aw-build`.
   If the work still needs proof, stay in investigation and name the next probe.
6. Persist the evidence.
   Write `investigation.md` and update `state.json`.

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

## Verification

Before leaving investigate, confirm:

- [ ] reproduction or equivalent failure signal is captured
- [ ] expected vs actual behavior is explicit
- [ ] the likely fault surface is concrete enough to guide build
- [ ] the next stage is clear: build, more investigation, or blocked
- [ ] `investigation.md` and `state.json` are updated
