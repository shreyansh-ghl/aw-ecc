# Skill Template

Copy the scaffold below as your starting point. Replace all `<placeholder>` tokens.

---

## Scaffold

````markdown
---
name: <namespace>-<skill-slug>
description: "<1-2 sentences. State primary capability first, then 'Use when <trigger scenario>'.>"
trigger: when the user <trigger condition>
---

# <Skill Display Name>

<1-2 sentence purpose statement. What does this skill teach, and why does it matter?>

## When to Use

- <Trigger scenario 1 — specific user intent or request pattern>
- <Trigger scenario 2 — a different angle or adjacent need>
- <Trigger scenario 3 — an edge case that should still match>

## Quick Start

<Minimal example showing the skill in action. This is the "show, don't tell" section.
Give a concrete, copy-pasteable example — not a description of what to do.>

```bash
# Example: a concrete invocation or code snippet
<command or code>
```

## Detailed Guide

### <Topic 1>

<Step-by-step instructions with concrete actions. Each step should be:
1. Numbered
2. Actionable (starts with a verb)
3. Specific (includes file paths, commands, or code)>

### <Topic 2>

<More guidance. Add as many topic sections as needed, but each should
earn its place — if a section doesn't change behavior, remove it.>

### <Topic 3 — Common Pitfalls>

<What goes wrong and how to fix it. Real failure modes, not hypothetical ones.>

## Checklist

- [ ] <Check item 1> — <pass/fail criteria: what to look for and what "done" means>
- [ ] <Check item 2> — <pass/fail criteria>
- [ ] <Check item 3> — <pass/fail criteria>

## Output Format

<Show the exact structure of what this skill produces. If it produces a file,
show the file. If it produces a checklist, show the checklist. Be concrete.>

```
<output structure>
```

## References

- [<reference-name>](references/<file>.md) — <what it covers>
- [<external-link>](<url>) — <why it's relevant>
````

---

## Section-by-Section Guide

### Frontmatter

The three fields (`name`, `description`, `trigger`) control discoverability. The description is what the model reads to decide whether to load this skill. Front-load the capability; put the trigger scenario second.

**Good:** `"MongoDB query optimization patterns for Mongoose and native driver. Use when debugging slow queries, reviewing aggregation pipelines, or designing indexes."`

**Bad:** `"This skill helps with MongoDB."` (too vague, no trigger signals)

### Purpose Statement

One to two sentences below the H1. This is the first thing a reader sees. It should answer: "Why does this skill exist?" and "What outcome does it produce?"

### When to Use

Three or more trigger scenarios. These help the model (and human readers) decide if this skill matches their situation. Be specific about user intent, not about the skill's internal mechanics.

### Quick Start

The most important section for adoption. A developer should be able to copy-paste this and get a working result. If your Quick Start requires reading the Detailed Guide first, it's too complex.

### Detailed Guide

Progressive disclosure. Only readers who need depth will reach here. Organize by task or topic, not by internal architecture. Each subsection should be independently useful.

### Checklist

Actionable verification items. Each item must have clear pass/fail criteria — "looks good" is not a criterion. These are used by graders and reviewers to validate the skill was applied correctly.

### Output Format

Show, don't describe. If the skill produces JSON, show JSON. If it produces a markdown report, show the markdown. The model uses this section to format its output correctly.

### References

Link to deeper material. Reference files for detailed patterns, external docs for vendor APIs. Keep the skill itself lean; push depth into references.

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| 5000+ word SKILL.md | Model wastes context loading it | Split into SKILL.md (overview) + references/ (depth) |
| No Quick Start | Low adoption — readers leave before learning | Add a copy-pasteable example |
| Vague trigger description | Model loads the skill for wrong requests | Add 3+ specific trigger scenarios |
| Checklist without criteria | Unverifiable — "did I do this?" has no answer | Add pass/fail criteria to every item |
| Generic examples | Model produces generic output | Use real domain examples, not `foo`/`bar` |
