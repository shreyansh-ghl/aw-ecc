---
description: Run the AW verification stage with evidence-based checks, review findings, and workflow readiness reporting.
status: active
---

# /aw:verify

Primary AW SDLC verification entrypoint.

## Stage Contract

- **AW_SDLC_STAGE:** `verify`
- **Primary skill:** `platform-core-aw-verify`
- **Expected output:** evidence-based verification with review findings and readiness status

## Instructions

When this command is invoked:

1. Load `platform-core-aw-verify`.
2. Run actual verification commands where possible.
3. Present review findings first when issues exist.
4. Confirm spec compliance and workflow readiness.
5. Hand off to `/aw:finish` only after verification passes.

## Smoke Test Marker

For aw-ecc smoke tests, include:

```text
AW_SMOKE_STAGE: verify
AW_SMOKE_COMMAND: /aw:verify
AW_SMOKE_SKILL: platform-core-aw-verify
```
