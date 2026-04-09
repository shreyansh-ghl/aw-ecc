---
name: aw-investigate
description: Reproduce, localize, and confirm bugs, alerts, and regressions before broad fixes are attempted.
trigger: User requests bug investigation, alert triage, root-cause analysis, or a legacy fix request arrives without a trustworthy cause.
---

# AW Investigate

## Overview

`aw-investigate` is the public debugging and triage stage.
It turns vague failure into concrete evidence, a likely fault surface, and a clear next step.
It must prefer real logs, failing commands, screenshots, traces, and other artifacts over memory or intuition.
Explain the situation so a new reader can understand it quickly: what failed, where it failed, what evidence proves it, and what action is already in motion.

## When to Use

- root cause is unclear
- the request starts from an alert, failure, log, or regression report
- repeated fix attempts have already happened
- the right next step might be "gather more evidence," not "change code"

Do not use once the cause is already clear and implementation is ready.

## Workflow

1. Capture the failure signal.
   Record the trigger, expected behavior, actual behavior, and current blast radius.
   Check the actual logs, artifacts, CI output, screenshots, or traces before forming a theory.
2. Resolve the impacted surface before guessing.
   Name the repo, module, service, route, worker, or UI surface that is most likely involved.
   If multiple candidates exist, record the candidate list and current confidence instead of pretending the surface is settled.
3. Reproduce or isolate.
   Use `aw-debug` and `../../references/debug-triage.md`.
   For browser-visible issues, load `browser-testing-with-devtools`.
   Prefer the smallest confirming probe over speculative patching.
   If a real log or artifact exists, inspect it before inventing a new hypothesis.
4. Load the right org-standard context.
   Pull in relevant platform services, frontend, data, or infra playbooks.
   For incident-style problems, load observability or log-analysis helpers as needed.
5. Classify the urgency and blast radius.
   Name whether the issue is critical, important, or advisory for the current context, and whether the blast radius is single-file, module, or system-wide.
6. Narrow the fault surface.
   Identify the smallest plausible layer, file set, or dependency boundary.
7. Decide the next stage.
   If the cause is concrete enough, hand off to `aw-build` and name the exact starting slice or repair surface.
   If the work still needs proof, stay in investigation and name the next probe explicitly instead of pausing with a vague "needs more digging" note.
8. Persist the evidence.
   Write `investigation.md` and update `state.json` with completed probes, open questions, and the recommended next command.

## Completion Contract

Investigation is complete only when one of these is true:

- the likely fault surface is concrete enough for `aw-build`
- the next probe is explicit enough for another investigation pass to continue without rediscovery
- the work is blocked and the blocker is named clearly

Every investigation handoff must make these things obvious:

- what was reproduced
- which surface is implicated and with what confidence
- how severe the issue is and how broad the blast radius looks right now
- which probes were completed
- what remains uncertain
- which exact next command or next probe should run next

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I already know the likely fix." | Likely is not the same as confirmed. |
| "The third patch will probably work." | Repeated speculative fixes are a debugging failure. |
| "I don't need logs or runtime evidence for this." | Alerts and regressions need concrete signals, not memory. |
| "The summary is enough; I do not need the raw artifact." | Summaries are weaker than the actual failing log, trace, or screenshot. |

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
- impacted surfaces
- candidate repos or modules when not yet settled
- severity
- blast radius
- likely fault surface
- open questions
- blockers
- recommended next commands

## Verification

Before leaving investigate, confirm:

- [ ] reproduction or equivalent failure signal is captured
- [ ] expected vs actual behavior is explicit
- [ ] the likely fault surface is concrete enough to guide build
- [ ] the next stage is clear: build, more investigation, or blocked
- [ ] `investigation.md` and `state.json` are updated

## Final Output Shape

Always end with:

- `Mode`
- `Reproduction`
- `Expected vs Actual`
- `Impacted Surface`
- `Severity / Blast Radius`
- `Evidence`
- `Completed Probes`
- `Likely Fault Surface`
- `Open Questions`
- `Next`
