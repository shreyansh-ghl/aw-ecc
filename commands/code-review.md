---
description: Compatibility alias that routes legacy code review requests into the AW verification stage.
status: alias
replacement: /aw:verify
forwardMode: silent
legacyBehavior: Legacy code review requests now execute the AW verification workflow.
---

# /aw:code-review

Use the `/aw:verify` workflow for this request.

## Alias Contract

- Treat this command as a silent compatibility alias.
- Load `platform-core-aw-verify`.
- Perform verification-oriented review, not the older standalone review routine.
- Preserve review intent by emphasizing findings, risks, and evidence.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: review
AW_SMOKE_COMMAND: /aw:verify
AW_SMOKE_SKILL: platform-core-aw-verify
```
