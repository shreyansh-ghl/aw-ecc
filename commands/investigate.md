---
name: aw:investigate
description: Reproduce, localize, and confirm bugs, alerts, and failing behavior before broad fixes are attempted.
argument-hint: "<bug, alert, failing behavior, log signal, or incident scope>"
status: active
stage: investigate
internal_skill: aw-investigate
---

# Investigate

Use `/aw:investigate` when the problem is real but the cause is not yet clear.

## Role

Turn vague breakage into a concrete reproduction, localized fault surface, and next-action recommendation.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `bug` | product behavior is wrong | `investigation.md`, `state.json`, repro and fault-surface notes |
| `alert` | monitoring or runtime alert fired | `investigation.md`, `state.json`, signal triage and likely cause |
| `regression` | a previously working flow broke | `investigation.md`, `state.json`, diff and regression notes |
| `incident` | failure may span services or environments | `investigation.md`, `state.json`, scoped blast-radius and next probes |

## Outputs

- `.aw_docs/features/<feature_slug>/investigation.md`
- updated `.aw_docs/features/<feature_slug>/state.json`
- `.aw_docs/features/<feature_slug>/investigation.html` when docs output mode is `dual` or `html`
- reproduction, expected-vs-actual, hypothesis, and next probe or build handoff

## Human HTML Companion

Markdown `investigation.md` remains canonical for agents.
When `/aw:investigate` writes or materially updates investigation evidence, run `platform-core:echo-direct` with the `investigation-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Echo Direct is the default SDLC HTML path. Do not spawn `aw:echo` for this stage unless the user explicitly asks for a background/agent comparison; run `platform-core:echo-direct` in-process instead.
HTML sidecars are required before the final handoff. Load `platform-core:echo-direct`, let it invoke `platform-core:human-collaboration-artifacts`, and wait for the colocated `.html` sidecar. Do not freehand or command-template HTML outside that skill contract. Record successful Echo Direct execution as `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, `runner: platform-core:echo-direct`, and `echo_agent_status: in_process_fast_path`; do not record successful Echo Direct output as `generated_fallback` or `generated_hca_fallback`. Keep Markdown canonical and include Echo Direct/HCA provenance in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `owner`, `execution_mode`, `runner`, `echo_agent_status`, publish status, remote links, and any explicit Markdown-only skip, Echo Direct/HCA provenance, or blocked reason.

## Investigation Rules

1. Reproduce first.
2. Capture expected vs actual behavior.
3. Load `diagnose` for unclear bugs, regressions, performance problems, repeated failed fixes, or any case where a reliable feedback loop is not already established.
4. Use the smallest confirming probe before patching.
5. Load org-standard observability and platform playbooks when the baseline requires them.
6. For frontend issues, include runtime and responsive evidence when relevant.
7. Name the exact next probe or next command before stopping.
8. Do not broaden into implementation until the fault surface is concrete enough.
9. Generate or explicitly record the HTML companion status before handoff.

## Must Not Do

- must not guess through an unclear root cause
- must not stack speculative fixes without new evidence
- must not claim a fix without handing off to `/aw:build` or proving it directly

## Recommended Next Commands

- `/aw:build`
- `/aw:test`

## Echo Direct/HCA Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for human docs generation and remote sharing unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not duplicate docs publish commands or publish configuration in this stage. The Echo Direct/HCA handoff owns HTML generation and remote sharing. Before the final response, inspect the Echo Direct/HCA handoff result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` (or another short artifact label) when Echo Direct/HCA returns or records both; never collapse them to bare `TeamOfOne` and `GitHub` labels, hide the TeamOfOne URL behind Markdown-only links, or print long GitHub URLs inline when a compact label can point to the same URL. If Echo Direct/HCA cannot generate or publish, record `publish_status: blocked` and the concrete blocker in `state.json`; do not invent links.

## Final Output Shape

Always end with:

- `Mode`
- `Reproduction`
- `Expected vs Actual`
- `Evidence`
- `Likely Fault Surface`
- `HTML Companion`
- `Remote Docs`
- `Next`
