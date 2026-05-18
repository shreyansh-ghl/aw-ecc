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
When `/aw:investigate` writes or materially updates investigation evidence, delegate to the `aw:echo` subagent with the `investigation-report` profile. Markdown-only is allowed only when the user explicitly requests it for this run.
Subagent authorization: invoking `/aw:investigate` in `dual` or `html` output mode is an explicit user request to delegate the human-facing HTML companion to exactly one background `aw:echo` subagent. This authorization is scoped only to HTML companion generation; do not spawn unrelated subagents.
HTML sidecars are required before the final handoff. Spawn exactly one `aw:echo` subagent and wait for the colocated `.html` sidecar unless the user explicitly asks not to wait. If the harness still cannot spawn `aw:echo`, load `platform-core:human-collaboration-artifacts` and generate the colocated `.html` sidecar in the same turn as a controlled HCA fallback. Do not freehand or command-template HTML outside that skill contract. Record the companion as `generated_hca_fallback` with the exact Echo availability blocker, keep Markdown canonical, and include the fallback note in the final handoff.

Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, status, `run_ref` when available, publish status, and any explicit Markdown-only skip, HCA fallback reason, or blocked reason.

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

## Echo Human Docs Handoff

After canonical Markdown and `state.json` are current, delegate human docs generation and remote sharing to exactly one `aw:echo` companion job unless the user explicitly requested local-only or Markdown-only docs. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent.

Do not run docs publish commands in this stage. Add Echo's returned links to the final `Remote Docs` section. If Echo cannot generate or publish, record `publish_status: blocked` and Echo's blocker in `state.json`; do not invent links.

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
