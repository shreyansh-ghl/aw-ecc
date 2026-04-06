---
name: aw-debug
description: Internal debugging helper that drives reproduction, root-cause isolation, confirming probes, and guarded repair.
trigger: Internal only. Invoked by aw-investigate, aw-build, aw-test, or aw-review when failure remains uncertain.
---

# AW Debug

## Overview

`aw-debug` is the internal debugging playbook.
It keeps bug work from devolving into guess-and-patch behavior.

## When to Use

- the failure is real but the cause is still uncertain
- multiple fix attempts already happened
- alerts or regressions need a concrete next probe

## Workflow

1. Capture a reproduction or equivalent failure signal.
2. Define expected vs actual behavior.
3. Identify the smallest plausible fault surface.
4. Run the next confirming probe.
5. Update the hypothesis based on evidence, not intuition.
6. Only then hand back to investigation, build, test, or review.

Use `references/debug-triage.md` for the stable checklist.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I already know the likely fix." | Likely is not confirmed. |
| "Another patch is faster than another probe." | Repeated speculative fixes usually waste more time. |

## Red Flags

- third fix attempt without new evidence
- patch size grows while root cause stays vague
- reproduction disappears and the team starts guessing from memory

## Verification

- [ ] a reproduction or equivalent failure signal exists
- [ ] expected vs actual behavior is explicit
- [ ] the next probe or likely cause is evidence-backed
- [ ] no speculative repair is treated as root-cause understanding
