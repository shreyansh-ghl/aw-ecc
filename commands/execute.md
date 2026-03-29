---
description: Continue the AW SDLC workflow by executing an approved plan through the AW execution stage.
status: active
---

# /aw:execute

Primary AW SDLC execution entrypoint.

## Stage Contract

- **AW_SDLC_STAGE:** `execute`
- **Primary skill:** `platform-core-aw-execute`
- **Expected output:** task execution, stage-specific implementation behavior, and a verification handoff

## Instructions

When this command is invoked:

1. Load the `platform-core-aw-execute` skill.
2. Require an approved spec or plan as context.
3. Execute only the implementation stage.
4. Follow mode-specific behavior for code, infra, docs, config, or migration tasks.
5. Stop and report blockers instead of guessing.
6. Hand off to `/aw:verify` when execution is complete.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: execute
AW_SMOKE_COMMAND: /aw:execute
AW_SMOKE_SKILL: platform-core-aw-execute
```
