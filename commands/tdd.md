---
description: Compatibility alias that routes legacy TDD implementation requests into the AW execution stage.
status: alias
replacement: /aw:execute
forwardMode: silent
legacyBehavior: Legacy TDD requests now execute through the AW execution stage in code/TDD mode.
---

# /aw:tdd

Use the `/aw:execute` workflow for this request.

## Alias Contract

- Treat this command as a silent compatibility alias.
- Load `platform-core-aw-execute`.
- Execute the approved plan in code/TDD mode.
- Preserve RED -> GREEN -> REFACTOR behavior during implementation.
- Hand off to `/aw:verify` after execution.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: execute
AW_SMOKE_COMMAND: /aw:execute
AW_SMOKE_SKILL: platform-core-aw-execute
AW_SMOKE_ALIAS_SOURCE: /aw:tdd
```
