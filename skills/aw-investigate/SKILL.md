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
When `aw-investigate` writes or materially updates `investigation.md`, HTML sidecars are required in `dual` and `html` output modes, not advisory metadata. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/investigation.html` with the `investigation-report` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Pass expected vs actual behavior, probes, evidence, fault surface, confidence, blockers, and next probe or repair path as the source bundle.
Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Verification

Before leaving investigate, confirm:

- [ ] reproduction or equivalent failure signal is captured
- [ ] expected vs actual behavior is explicit
- [ ] the likely fault surface is concrete enough to guide build
- [ ] the next stage is clear: build, more investigation, or blocked
- [ ] `investigation.md` and `state.json` are updated
- [ ] the HTML companion file exists, or the user explicitly requested Markdown-only

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned TeamOfOne/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never hide the TeamOfOne URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

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
