# Skill Quality Review Rubric

Use this rubric when a review needs more than a quick sanity pass.

## 1. Correctness

Check whether the skill is factually and operationally correct.

- `name` and `description` match the actual behavior
- referenced files, scripts, and relative paths exist
- commands can plausibly run in the target environment
- tool names, CLI flags, and API names are current
- steps do not contradict one another
- validation guidance matches the claimed workflow

Common failures:

- dead file references
- stale install commands
- missing bundled resources
- hidden assumptions about tools or directory layout

## 2. Clarity

Check whether a cold reader can understand when and how to use the skill.

- trigger conditions are explicit
- the skill says when not to use it
- the main workflow is ordered clearly
- output expectations are visible
- important terms are concrete rather than vague
- detail lives in references when it would otherwise bloat `SKILL.md`

Common failures:

- rambling overview sections
- multiple unrelated goals in one skill
- missing stop conditions
- buried output shapes

## 3. Effectiveness

Check whether the skill is likely to change behavior in the intended way.

- the first action after loading the skill is obvious
- fragile or safety-critical steps are constrained enough
- flexible tasks keep the right degree of freedom
- examples or templates are present where ambiguity would otherwise be high
- the skill does not require hidden knowledge from another doc to be usable

Common failures:

- generic advice disguised as workflow
- no concrete ordering for multi-step tasks
- overfitted scripts for work that needs judgment
- under-specified steps for brittle operations

## 4. Maintainability

Check whether the skill can stay healthy as the catalog evolves.

- baseline policy is not duplicated unnecessarily
- overlap with existing skills is minimal and intentional
- long detail is pushed into references or scripts
- the body is concise enough to justify its context cost
- external dependencies are limited and clearly named
- verdicts can be acted on without rereading the whole skill

Common failures:

- copy-pasted policy from root docs
- large monolithic `SKILL.md` files
- hidden dependency on another skill without naming it
- outdated product or tool specifics embedded in core workflow text

## Anti-Patterns

- `Promise Drift`: frontmatter says one thing, workflow does another
- `Catalog Overlap`: two skills solve the same problem with only wording changes
- `Reference Rot`: links or commands look real but were never verified
- `Context Hoarding`: long sections that belong in references or scripts
- `Hidden Handoff`: the skill assumes another skill or doc without saying so
- `Taste Review`: feedback describes preference, not an operational problem

## Verdict Guidance

| Verdict | Use when |
|---|---|
| `Keep` | The skill is current, distinct, and operationally sound |
| `Improve` | The core idea is worth keeping, but wording, structure, or scope needs targeted fixes |
| `Update` | The workflow is still useful, but references or technical details are stale |
| `Retire` | The skill is broken, redundant, or cost-asymmetric to maintain |
| `Merge into <skill>` | Another existing skill already owns the workflow and this one should fold into it |

## Feedback Template

Use this shape when the review needs a compact written summary:

```text
Mode: focused-review | portfolio-review
Scope: <skill path or PR slice>
Skill Promise: <one sentence>

Blocking Findings:
- <finding with evidence>

Advisory Improvements:
- <small, non-blocking improvement>

Verdict: Keep | Improve | Update | Retire | Merge into <skill>
Next: <smallest corrective action>
```
