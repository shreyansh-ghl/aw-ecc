---
name: ponytail-review
description: Review changes for over-engineering, what can be deleted
command: true
---

# Ponytail Review

Load and follow the `ponytail-review` skill, then carry out the instruction below.

The instruction text is vendored verbatim from upstream ponytail
(`commands/ponytail-review.toml`, MIT, DietrichGebert/ponytail) so behavior matches the
original. See `skills/ponytail/references/aw-integration.md` for how this fits
the AW SDLC and which AW rules outrank the ladder.

## Instruction

Review the current code changes for over-engineering only, not correctness. One line per finding: L<line>: <tag> <what to cut>. <replacement>. Tags: delete (dead code/speculative feature), stdlib (reinvented standard library), native (dependency doing what the platform does), yagni (abstraction with one implementation), shrink (same logic, fewer lines). End with the net lines removable. If nothing to cut: 'Lean already. Ship.'
