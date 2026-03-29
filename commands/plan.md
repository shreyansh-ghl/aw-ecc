---
description: Compatibility alias that routes legacy planning requests into the new AW brainstorm-first workflow.
status: alias
replacement: /aw:brainstorm
forwardMode: silent
legacyBehavior: Legacy planning requests now enter the AW brainstorm/spec flow before detailed planning.
---

# /aw:plan

Use the AW brainstorm-first workflow for this request.

## Alias Contract

- Treat this command as a silent compatibility alias.
- Route the request to `/aw:brainstorm`.
- Load `platform-core-aw-brainstorm` first.
- Produce approaches, trade-offs, and an approved spec before detailed implementation planning.
- Once the spec is approved, continue into `platform-core-aw-plan`.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: plan
AW_SMOKE_COMMAND: /aw:brainstorm
AW_SMOKE_SKILL: platform-core-aw-brainstorm
AW_SMOKE_ALIAS_SOURCE: /aw:plan
```
