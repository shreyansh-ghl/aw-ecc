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

- a legacy `/aw:execute` request arrives
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
4. Preserve generated-doc publishing behavior from `aw-build`.
   HTML sidecars are required in `dual` and `html` output modes.
   Use `platform-core:echo-direct` directly for human-readable HTML generation and remote sharing whenever `execution.md` or another canonical stage artifact is written or materially updated.
   Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`.
   In explicit Markdown-only mode, do not generate HTML and record the skip.
   Record `html_companion_artifacts` in `state.json` with `status: generated`, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason.
   Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

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
- [ ] remote AW docs links were reported when docs were generated
- [ ] artifact and handoff behavior stayed consistent with the canonical build stage
