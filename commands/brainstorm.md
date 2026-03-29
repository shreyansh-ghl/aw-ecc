---
description: Start the AW SDLC workflow by exploring approaches, asking clarifying questions, and producing an approved design spec before any implementation work begins.
status: active
---

# /aw:brainstorm

Primary AW SDLC entrypoint for new work.

## Stage Contract

- **AW_SDLC_STAGE:** `plan`
- **Primary skill:** `platform-core-aw-brainstorm`
- **Expected output:** approaches, trade-offs, approved design direction, and a written spec

## Instructions

When this command is invoked:

1. Load the `platform-core-aw-brainstorm` skill.
2. Explore relevant repo context before asking questions.
3. Ask only the minimum clarifying questions needed.
4. Present 2-3 approaches with trade-offs.
5. Turn the selected approach into a concrete spec.
6. Do not write implementation code in this stage.
7. If the spec is approved, hand off to `/aw:plan`.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: plan
AW_SMOKE_COMMAND: /aw:brainstorm
AW_SMOKE_SKILL: platform-core-aw-brainstorm
```
