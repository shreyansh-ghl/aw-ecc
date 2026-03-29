---
description: Finish the AW SDLC workflow by integrating verified work into a PR, branch, or deploy handoff.
status: active
---

# /aw:finish

Primary AW SDLC integration and completion entrypoint.

## Stage Contract

- **AW_SDLC_STAGE:** `finish`
- **Primary skill:** `platform-core-aw-finish`
- **Expected output:** verified integration outcome, summary, and next-step artifact

## Instructions

When this command is invoked:

1. Load the `platform-core-aw-finish` skill.
2. Require verification to have passed first.
3. Create the correct completion outcome for the user's chosen path:
   - PR
   - merge
   - staging
   - branch handoff
4. Save learnings and summarize final status.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: finish
AW_SMOKE_COMMAND: /aw:finish
AW_SMOKE_SKILL: platform-core-aw-finish
```
