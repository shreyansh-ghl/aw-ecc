---
name: idea-refine
description: Refines raw ideas into sharper, build-worthy directions. Use when a request starts as an idea, concept, or vague opportunity rather than an implementation-ready plan.
origin: ECC
---

# Idea Refine

## Overview

Refine ideas before turning them into specs.
This skill takes a raw concept, pressure-tests it, and turns it into a concrete direction with explicit assumptions, MVP scope, and a clear "not doing" list.

## When to Use

- the user has a raw product, feature, or workflow idea
- the request is still more concept than plan
- multiple possible directions exist and the tradeoffs are not obvious
- the team needs a sharper problem statement before `aw-plan`

**When NOT to use**

- the technical direction is already approved and the work is ready for `aw-plan`
- the task is really implementation, testing, or review rather than idea shaping

## Workflow

1. Restate the idea as a sharp problem.
   Convert the raw concept into a crisp problem statement or "How Might We" framing.
   The goal is to name who the work is for and what better outcome it creates.
2. Ask only the questions that change the direction.
   Focus on:
   - target user or operator
   - success criteria
   - real constraints
   - timing or urgency
   - what has already been tried
3. Generate a small set of meaningful directions.
   Explore 3-5 distinct options instead of polishing the first instinct.
   Use lenses like simplification, inversion, audience shift, or "what would make this 10x more valuable?"
4. Converge with pressure, not vibes.
   Compare directions on:
   - user value
   - feasibility
   - org fit and platform constraints
   - differentiation
   - rollout or maintenance risk
5. Surface the bet explicitly.
   Name:
   - key assumptions
   - what could kill the idea
   - MVP scope
   - what we are intentionally not doing
6. Produce a one-pager that can move into planning.
   The output should be easy to hand to `aw-plan` or `aw-brainstorm` without redoing the ideation.
   In AW repos, keep this outcome inside planning artifacts or `state.json` instead of inventing a second artifact system.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We already know what to build." | If the problem statement and user are fuzzy, the plan will be fuzzy too. |
| "More ideas is always better." | A few meaningful directions beat a long list of shallow variants. |
| "We'll decide scope once we start building." | Scope discovered too late becomes rework and churn. |
| "Not doing lists are negative." | Explicitly saying no is what makes a direction buildable. |

## Red Flags

- the output jumps to implementation without clarifying user value
- only one direction is considered when real alternatives exist
- no assumptions or risks are surfaced
- the final direction has no MVP boundary or "not doing" list
- ideation silently turns into coding or detailed task planning

## Verification

After refining an idea, confirm:

- [ ] the problem statement is explicit
- [ ] the target user or operator and success criteria are named
- [ ] multiple viable directions were considered
- [ ] key assumptions and failure risks are visible
- [ ] MVP scope and "not doing" boundaries are clear
- [ ] the output is ready to feed `aw-plan` without restarting discovery
