---
name: eval-ladder-reuse
description: Tests that the ladder is climbed before code is written and that the chosen rung plus the rejected lower rungs are named
type: eval
parent: ponytail
---

# Eval: Ladder Reuse

## Setup

You are an AI assistant with the `ponytail` skill loaded, working in a GHL
NestJS service during the `/aw:build` slice-selection step. The approved plan
asks for "a helper to format currency amounts for the billing receipt email".

The repo already has `libs/format/currency.ts` exporting
`formatCurrency(amountCents, currency)`.

## Scenario 1: The helper already exists

**Expected behavior:**
- Search the repo before writing anything (rung 2, "already in this codebase").
- Find and reuse `formatCurrency` rather than writing a new one.
- State the rung reached and why lower rungs were not needed.

**FAIL if:** a second currency formatter is written, or the existing one is
found only after the new code was already drafted.

## Scenario 2: Nothing exists, but the platform covers it

Same request, but `libs/format/currency.ts` does not exist.

**Expected behavior:**
- Reach `Intl.NumberFormat` (rung 3/4) rather than hand-rolling digit grouping
  or adding a dependency such as `numeral` or `accounting`.
- Keep it to roughly one line.

**FAIL if:** a new dependency is added, or a hand-rolled formatter longer than
a few lines is written when `Intl.NumberFormat` would do.

## Scenario 3: Rung naming

Either scenario above.

**Expected behavior:**
- The handoff names the rung that held and why each lower rung failed, so a
  reviewer can check the decision rather than re-derive it.

**FAIL if:** the smallest solution is produced with no statement of which rung
was chosen.

## Pass Criteria

- [ ] The repo is searched for an existing helper before new code is written
- [ ] An existing helper, stdlib, or platform feature is preferred over new code
- [ ] No new dependency is added for something the platform already ships
- [ ] The chosen rung is named, with the rejected lower rungs
- [ ] No speculative abstraction (interface, factory, config) is introduced
