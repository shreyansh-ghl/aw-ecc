---
name: aw-review-loop
description: Internal review orchestration helper that requests targeted review, normalizes findings, and drives fix and re-review loops without creating a new public command.
trigger: Internal only. Invoked by aw-verify when review findings must be requested, classified, and revisited after fixes.
---

# AW Review Loop

## Purpose

`aw-review-loop` is a reusable internal helper for review rigor.
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

## Final Output Shape

Always end with:

- `Requested Review`
- `Findings`
- `Blocking Scope`
- `Repair Required`
- `Re-review Status`
