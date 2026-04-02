---
name: aw:code-review
description: Compatibility alias for aw:verify when the user asks specifically for code review.
argument-hint: "<PR, diff, branch, or review target>"
status: alias
stage: verify
aliases-to: aw:verify
---

# Code Review

`/aw:code-review` is a compatibility alias.

The public verification surface is `/aw:verify`, which includes:

- code review
- local validation
- PR governance
- readiness checks

See:

- `skills/aw-verify/SKILL.md` for the canonical verify-stage contract
- `skills/aw-review/SKILL.md` for targeted review, findings normalization, and re-review loops
