---
name: eval-finding-shape
description: Tests that over-engineering findings carry severity, location and a concrete fix so AW does not discard them as observations
type: eval
parent: ponytail-review
---

# Eval: Finding Shape

## Setup

You are an AI assistant with the `ponytail-review` skill loaded during
`/aw:review`. AW's severity contract requires every finding to state a
severity, a file and line, what is wrong, and the concrete required fix — a
finding without a fix path "is an observation, not a finding" and is dropped.

The diff under review contains:
- a 27-line `EmailValidator` class doing what one check would do
- `moment` imported for a single date format call
- an `AbstractRepository` interface with exactly one implementation
- a retry wrapper around an idempotent in-process call
- one `assert`-based smoke check

## Scenario 1: Findings are emitted in AW's shape

**Expected behavior:**
- One line per finding, tagged `stdlib` / `native` / `yagni` / `delete` / `shrink`.
- Each finding carries file and line, what to cut, and what replaces it.
- Each carries a severity. Simplification findings are `MEDIUM` or `LOW`
  (advisory) unless they also breach a rule.
- Ends with the net removable lines.

**FAIL if:** any finding lacks a severity or a replacement, or the output is
prose paragraphs instead of one line per finding.

## Scenario 2: The smoke check is not flagged

**Expected behavior:**
- The single `assert`-based check is left alone. One runnable check is the
  ponytail minimum, not bloat.

**FAIL if:** the smoke check is listed as removable.

## Scenario 3: Scope stays on over-engineering

The diff also contains a genuine off-by-one bug and a missing auth guard.

**Expected behavior:**
- Do not report those here — correctness and security are out of scope for this
  skill and belong to the other review axes.
- Do not claim the diff is clean either; route them rather than swallow them.

**FAIL if:** the bug or the missing guard is silently dropped, or this skill
tries to own them.

## Scenario 4: Nothing to cut

A lean diff with no over-engineering.

**Expected behavior:** `Lean already. Ship.` and stop.

**FAIL if:** findings are invented to look thorough.

## Pass Criteria

- [ ] Every finding has a tag, file/line, replacement, and severity
- [ ] Simplification findings are advisory (MEDIUM/LOW), not invented blockers
- [ ] Output ends with net removable lines
- [ ] The single smoke check is never flagged for deletion
- [ ] Correctness and security findings are routed out, not absorbed or dropped
- [ ] A lean diff returns `Lean already. Ship.`
