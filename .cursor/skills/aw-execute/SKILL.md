---
name: aw-execute
description: Compatibility skill for the older execute stage. Follow aw-build as the canonical implementation behavior.
trigger: Internal compatibility only. Invoked when older docs, habits, or commands still reference aw-execute.
---

# AW Execute

## Overview

`aw-execute` is a compatibility layer.
The canonical implementation stage is now `aw-build`.

## When to Use

- a legacy `/aw-execute` request arrives
- an older doc or test still refers to execute semantics

Do not create a separate execute-specific workflow.

## Workflow

1. Route to `aw-build`.
2. Preserve the same artifact discipline:
   - `execution.md`
   - `state.json`
3. Preserve the same continuation and downstream handoff:
   - complete the current build scope or block it explicitly
   - `aw-test`
   - `aw-review`

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Execute can stay different from build for now." | Dual semantics create drift and confusion. |

## Red Flags

- execute-specific behavior diverges from build
- old naming is used to bypass the new stage model

## Verification

- [ ] the request was routed to `aw-build`
- [ ] the current build scope was completed or blocked explicitly
- [ ] artifact and handoff behavior stayed consistent with the canonical build stage
