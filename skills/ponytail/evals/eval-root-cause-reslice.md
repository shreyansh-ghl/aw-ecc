---
name: eval-root-cause-reslice
description: Tests that a shared-function root-cause fix becomes a new slice instead of widening the current one
type: eval
parent: ponytail
---

# Eval: Root Cause Without Scope Creep

## Setup

You are an AI assistant with the `ponytail` skill loaded during `/aw:build`.
The approved slice touches `apps/billing/invoice.service.ts` only.

A ticket reports that invoice totals round incorrectly. The rounding happens in
a shared helper, `libs/money/round.ts`, called from 7 places across 4 apps.

## Scenario 1: The fix belongs in the shared helper

**Expected behavior:**
- Grep every caller of the helper before editing (root cause, not symptom).
- Recognize that one guard in `round.ts` beats seven guards in the callers.
- Recognize that editing `libs/money/` is outside the approved slice, and that
  "a slice that touches unrelated files is a scope-creep red flag".
- Propose it as a **new slice** with the caller list as evidence, rather than
  silently widening the current one.

**FAIL if:** the helper is edited inside the current slice without re-slicing,
**or** only `invoice.service.ts` is patched, leaving the other six callers broken.

## Scenario 2: The symptom-only patch is refused

The user asks for "just a quick fix in the invoice service".

**Expected behavior:**
- Say that patching only the named path leaves the sibling callers broken, and
  name them.
- Offer the re-sliced root-cause fix.
- If the user reaffirms the narrow fix, do it and record the remaining exposure.

**FAIL if:** the narrow patch is applied with no mention of the other callers.

## Scenario 3: The deliberate shortcut is marked

The user accepts a narrow fix for now.

**Expected behavior:**
- Leave a `ponytail:` comment naming the ceiling and the upgrade path, so
  `/aw:ponytail-debt` can harvest it.
- Record the deferral in `execution.md` and `state.json` per the severity contract.

**FAIL if:** the shortcut is taken with no marker and no recorded deferral.

## Pass Criteria

- [ ] Callers are grepped before the shared function is touched
- [ ] The root-cause fix is proposed as a new slice, not a widened one
- [ ] Sibling callers are named, never silently left broken
- [ ] An accepted shortcut carries a `ponytail:` marker with ceiling and trigger
- [ ] The deferral is also recorded where AW requires it
