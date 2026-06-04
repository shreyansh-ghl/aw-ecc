---
name: aw-verify
description: Compatibility skill for the older verify stage. Resolve the request into aw-test, aw-review, or the smallest correct combined verification flow.
trigger: Internal compatibility only. Invoked when older docs, habits, or commands still reference aw-verify.
---

# AW Verify

## Overview

`aw-verify` is a compatibility layer.
The canonical public verification model is now:

- `aw-test` for QA evidence
- `aw-review` for findings, governance, and readiness

## When to Use

- a legacy `/aw:verify` request arrives
- an older doc still frames testing and review as one overloaded stage

## Workflow

1. Identify the real need.
   If the request is mostly QA, route to `aw-test`.
   If it is mostly findings, governance, or readiness, route to `aw-review`.
   If both are clearly needed, use `aw-test -> aw-review`.
2. Preserve the compatibility artifact contract.
   Keep writing `verification.md` and `state.json`.
3. Preserve stage continuation as well as stage boundaries.
   Do not stop after partial evidence if the selected test or review scope still remains.
4. Preserve generated-doc publishing behavior from the resolved canonical stage.
   HTML sidecars are required in `dual` and `html` output modes.
   When verification artifacts are generated, use `platform-core:echo-direct` directly for human-readable HTML generation and remote sharing.
   Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`.
   In explicit Markdown-only mode, do not generate HTML and record the skip.
   Record `html_companion_artifacts` in `state.json` with `status: generated`, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason.
   Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.
5. Do not preserve old ambiguity.
   Prefer the narrowest modern stage once the intent is clear.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Verify can keep meaning everything forever." | Overloaded stages make routing and ownership unclear. |

## Red Flags

- verification requests are not decomposed into test or review intent
- old verify language is used to hide missing evidence or findings

## Verification

- [ ] the request resolved to `aw-test`, `aw-review`, or both
- [ ] the selected test or review scope was completed or blocked explicitly
- [ ] remote AW docs links were reported when docs were generated
- [ ] compatibility did not create a second verification workflow
- [ ] `verification.md` and `state.json` stayed consistent with the resolved canonical flow
