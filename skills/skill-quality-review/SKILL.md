---
name: skill-quality-review
description: Reviews skills for correctness, clarity, effectiveness, and maintainability. Use when auditing a new or updated skill, reviewing a skill PR, or troubleshooting an underperforming skill before shipping it.
origin: ECC
---

# Skill Quality Review

## Overview

`skill-quality-review` is the focused reviewer lens for one skill or one small batch of closely related skill changes.
It turns vague "this skill feels off" feedback into evidence-backed findings and small, actionable fixes.

Use `skill-stocktake` for full inventory audits across many skills.
That command may call this skill for its per-skill evaluation rubric.

## When to Use

- a new skill is being added and should be reviewed before merge
- an existing skill was updated and the PR needs structured feedback
- a skill feels ambiguous, inconsistent, or underperforming in practice
- `skill-stocktake` flagged a skill as `Improve`, `Update`, `Retire`, or `Merge`
- you want a reusable rubric instead of ad hoc taste-based comments

Do not use this as a full repo inventory workflow.
For broad catalog audits, use `skill-stocktake`.

## Workflow

1. Establish scope and the promised behavior.
   Read the target `SKILL.md`, the diff if this is a PR, and only the bundled scripts or references that materially affect the review.
   Restate the skill's promise from its `name`, `description`, trigger language, and body.
2. Review correctness first.
   Confirm commands, tool names, file paths, relative references, and workflow order are internally consistent.
   For unstable external details such as marketplace installs, CLI flags, or API names, verify them with current sources before approving the skill.
3. Review clarity.
   Check that entry conditions, scope boundaries, stop conditions, and output expectations are explicit.
   Prefer concise wording and progressive disclosure over long, duplicated explanation.
4. Review effectiveness.
   Ask whether a cold agent would reliably do the right thing after loading this skill.
   The workflow should make the next action obvious, avoid hidden prerequisites, and provide enough structure for fragile steps without over-constraining flexible work.
5. Review maintainability.
   Look for overlap with other skills, duplicated baseline policy, stale specifics, oversized bodies, fragile references, or bundled detail that should move into a reference file.
6. Use the detailed rubric when needed.
   Load `references/review-rubric.md` for the full checklist, anti-pattern list, and verdict guidance.
7. Produce findings and the smallest useful verdict.
   For a focused review, classify blocking findings separately from advisory improvements.
   For portfolio decisions, use `Keep`, `Improve`, `Update`, `Retire`, or `Merge into <skill>`.
8. Recommend the smallest corrective action.
   Prefer targeted edits, moved reference material, trimmed duplication, or explicit verification wording over broad rewrites.

## Review Priorities

Review in this order:

1. correctness
2. clarity
3. effectiveness
4. maintainability

If correctness is broken, do not spend time polishing prose first.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The skill sounds right, so it is probably fine." | Skill quality depends on whether the instructions can actually be followed. |
| "This section is long, but extra detail cannot hurt." | Bloated skills reduce trigger precision and make the workflow harder to follow. |
| "The command probably still works." | Unverified installs, CLI flags, and external tools are correctness issues. |
| "We can merge it and improve later." | Weak skills create bad behavior at load time, so review should happen before shipping. |

## Red Flags

- name, description, and body promise different things
- the workflow hides prerequisites or assumes unstated context
- examples, commands, or links are stale or unverifiable
- the body duplicates baseline rules or another skill with no clear added value
- the skill tries to cover portfolio audit, creation, and execution all at once
- the output shape is implicit, so reviewers cannot tell what "good" looks like

## Verification

Before leaving the review, confirm:

- [ ] the skill's promise was restated and checked against the body
- [ ] correctness issues were reviewed before style or wording improvements
- [ ] unstable external details were verified or explicitly flagged as unverified
- [ ] overlap with existing skills, rules, or baseline docs was considered
- [ ] blockers and advisories are separated clearly
- [ ] the recommended fixes are smaller than a rewrite unless a rewrite is truly necessary

## Final Output Shape

Always end with:

- `Mode`
- `Scope`
- `Skill Promise`
- `Blocking Findings`
- `Advisory Improvements`
- `Verdict`
- `Next`
