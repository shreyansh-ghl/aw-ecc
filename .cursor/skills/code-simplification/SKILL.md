---
name: code-simplification
description: Simplifies working code without changing behavior. Use when code is harder to read, maintain, or review than it should be, especially after a feature is already working.
origin: ECC
---

# Code Simplification

## Overview

Simplify code after it works.
The goal is not fewer lines. The goal is lower complexity, clearer intent, safer change review, and easier maintenance without changing behavior.

## When to Use

- a feature works but the implementation feels heavier than necessary
- review feedback points to confusing control flow, duplication, or naming
- a hotfix or rushed implementation needs cleanup after the behavior is stable
- multiple helpers or branches now express the same idea in slightly different ways

**When NOT to use**

- the current behavior is not yet understood or protected
- there is no reliable safety net for the touched behavior
- the work is really a redesign or rewrite rather than simplification

## Workflow

1. Freeze the behavior surface.
   Confirm what must stay exactly the same: tests, runtime behavior, error semantics, side effects, and ordering.
   If the behavior is not clear, stop and add the smallest safety net first.
2. Identify the highest-leverage simplification.
   Prefer:
   - flattening nested control flow
   - removing duplication
   - improving names
   - shrinking long functions
   - collapsing scattered logic into one obvious boundary
3. Check the fence before removing structure.
   Apply Chesterton's Fence: understand why complexity exists before deleting it.
   If a branch, helper, or guard exists for a reason you cannot explain, investigate first.
4. Simplify one move at a time.
   Make one readable change, rerun the smallest relevant checks, then continue.
   Do not stack multiple conceptual refactors into one unverified jump.
5. Keep the external contract stable.
   Preserve API shape, user-visible behavior, logs that operators depend on, and failure modes unless a separate change explicitly approves that behavior change.
6. Record what became simpler.
   Name what got easier to understand and what was intentionally left alone.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It works, so the messy shape is fine." | Working code still carries long-term maintenance cost. |
| "I'll just rewrite the whole thing cleanly." | Big rewrites increase regression risk and hide the value of each simplification. |
| "This helper is ugly, but I don't know why it's there." | Unknown intent is a reason to pause, not delete. |
| "Reviewers can mentally simplify it." | If reviewers must mentally rewrite the code, the code is still too complex. |

## Red Flags

- a simplification changes behavior and readability at the same time
- multiple abstractions are introduced while claiming to reduce complexity
- the diff deletes complexity but also deletes important guards
- no before/after reasoning is given for why the code is actually simpler

## Verification

After simplifying, confirm:

- [ ] the behavior surface stayed unchanged
- [ ] the smallest relevant tests or checks still pass
- [ ] complexity actually decreased in a way a reviewer can explain quickly
- [ ] removed code was understood before deletion
- [ ] the final diff is easier to review than the original shape
