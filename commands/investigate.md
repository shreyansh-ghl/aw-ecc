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
- reproduction, expected-vs-actual, hypothesis, and next probe or build handoff

## Investigation Rules

1. Reproduce first.
2. Capture expected vs actual behavior.
3. Use the smallest confirming probe before patching.
4. Load org-standard observability and platform playbooks when the baseline requires them.
5. For frontend issues, include runtime and responsive evidence when relevant.
6. Do not broaden into implementation until the fault surface is concrete enough.

## Must Not Do

- must not guess through an unclear root cause
- must not stack speculative fixes without new evidence
- must not claim a fix without handing off to `/aw:build` or proving it directly

## Recommended Next Commands

- `/aw:build`
- `/aw:test`

## Final Output Shape

Always end with:

- `Mode`
- `Reproduction`
- `Expected vs Actual`
- `Evidence`
- `Likely Fault Surface`
- `Next`
