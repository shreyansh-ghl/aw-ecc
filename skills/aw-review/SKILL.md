---
name: aw-review
description: Internal review helper that requests targeted review, normalizes findings, and drives fix and re-review loops without creating a new public command.
trigger: Internal only. Invoked by aw-verify when review findings must be requested, classified, and revisited after fixes.
---

# AW Review

## Purpose

`aw-review` is a reusable internal helper for review rigor.
It turns broad review requests into explicit findings, repair scope, and re-review outcomes.

The public review surface remains `/aw:verify`.

## Required Behavior

1. define the review scope explicitly:
   - spec compliance
   - code quality
   - security / reliability / performance concerns
   - release-readiness concerns
2. request only the smallest correct review for the current stage
3. normalize findings by severity and evidence
4. separate blocking findings from advisory notes
5. translate blocking findings into a repair scope for `aw-execute`
6. after fixes, compare the updated work against the original findings
7. mark findings as resolved, partially resolved, or unresolved
8. require re-review before prior blocking findings can be considered cleared

## Requested Review Pattern

Every review request should name:

- what is being reviewed
- why it is being reviewed now
- which findings would block release or handoff
- what evidence already exists

Request the smallest correct review for the current stage instead of asking for an unfocused "look over everything."

## Receiving Findings

When findings come back:

- do not collapse them into performative agreement
- acknowledge the technical issue or ask for the smallest needed clarification
- translate blocking findings into a repair scope for `aw-execute`
- keep advisory findings visible without pretending they were blockers

## Re-review Discipline

After repairs:

- compare against the original finding, not against a vague memory
- require fresh evidence for any claimed resolution
- keep findings `partially resolved` when only part of the issue moved

## Findings Format

Every finding should include:

- severity
- scope
- evidence
- why it matters
- required fix or follow-up

## Hard Gates

- do not collapse multiple findings into vague summary prose
- do not treat “looks good” as a complete review result
- do not mark a blocking finding resolved without comparing it to the updated work
- do not create a new public review command
- do not treat review acknowledgment as equivalent to review resolution

## Final Output Shape

Always end with:

- `Requested Review`
- `Findings`
- `Blocking Scope`
- `Repair Required`
- `Re-review Status`
