---
name: incremental-implementation
description: Delivers multi-file work in thin, reversible slices. Use when a change spans more than one file, when a task feels too large to land safely in one pass, or when rollback clarity matters.
origin: ECC
---

# Incremental Implementation

## Overview

Build in thin vertical slices.
Each slice should leave the system in a working, testable, reviewable state before the next one begins.

## When to Use

- a change touches more than one file
- a feature is large enough to tempt one big patch
- a migration, UI change, or rollout-sensitive task needs safe checkpoints
- you want commit boundaries that reflect real progress

**When NOT to use**

- the work is already truly minimal and single-scope
- the next step is still unclear and needs planning or investigation first

## Workflow

1. Select the next smallest slice.
   Start from approved scope.
   Choose one user-visible behavior, one boundary change, or one safe infrastructure increment.
2. Define the proof for that slice.
   Name the failing signal, acceptance check, or runtime evidence that will prove the slice is real.
3. Implement only that slice.
   Avoid adjacent cleanup and hidden follow-on work.
   Use `references/build-increments.md` when sizing or rollback shape is fuzzy.
4. Verify immediately.
   Run the smallest relevant check:
   - targeted test
   - build or typecheck
   - runtime/browser proof
   - migration validation
5. Save the progress cleanly.
   Use `references/git-save-points.md` when the work benefits from explicit commit discipline.
   A good save point is small, passing, and easy to explain.
6. Decide whether to continue or hand off.
   If the slice is complete and the request now needs QA, review, or release work, stop and hand off.
   Do not keep building just because more work is possible.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll do the whole feature first, then test it." | Large unverified batches hide regressions and make rollback harder. |
| "This extra cleanup is basically free." | Scope creep weakens slice boundaries and review quality. |
| "I don't need a save point yet." | Save points matter most before the diff becomes hard to reason about. |
| "The slice is too small to be worth validating." | Small slices are exactly what make validation cheap and reliable. |

## Red Flags

- one slice changes multiple unrelated behaviors
- rollback is unclear after the latest patch
- tests are deferred instead of attached to the slice
- commit/save-point boundaries no longer match meaningful progress

## Verification

After each increment, confirm:

- [ ] the slice has one clear purpose
- [ ] the slice has current proof, not assumed proof
- [ ] the diff is still reversible and reviewable
- [ ] the next slice is optional, not entangled
- [ ] save points reflect meaningful progress
