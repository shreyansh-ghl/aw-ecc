# Rule Template

Copy the scaffold below as your starting point. Replace all `<placeholder>` tokens. Rules are intentionally shorter than other artifact types — a rule that needs 1000 words to explain is probably a skill.

---

## Scaffold

````markdown
---
id: <domain>/<rule-slug>
severity: <MUST | SHOULD | MAY>
domains: [<domain-1>, <domain-2>]
paths: ["<glob-pattern-1>", "<glob-pattern-2>"]
---

# <Rule Title>

## Rule

<requirement-statement> [<MUST|SHOULD|MAY>]

**Why:** <1-2 sentences explaining the consequence of violating this rule. What breaks, degrades, or becomes vulnerable? This is the most important part — a model that understands "why" handles edge cases better than one following a directive.>

## WRONG

<Real violation — not a toy example. Show code or config that a developer would actually write.>

```<language>
// <Brief comment explaining what's wrong>
<violating code>
```

**Impact:** <What happens if this ships — runtime error, security vulnerability, data corruption, etc.>

## RIGHT

<Verified fix — the correct way to write the same code. Must compile/run.>

```<language>
// <Brief comment explaining why this is correct>
<correct code>
```

## Exceptions

<When this rule does NOT apply. Be specific — vague exceptions become loopholes.>

- <Exception 1>: <specific condition and why the rule doesn't apply>
- <Exception 2>: <specific condition>

If no exceptions exist, write: "No exceptions. This rule applies universally."

## Enforcement

- **Automated:** <How this can be caught automatically — linter rule, CI check, grep pattern>
- **Manual:** <What a reviewer should look for during code review>

## Severity Justification

**<MUST|SHOULD|MAY>** because <reason tied to impact>:

- **MUST** — Violation causes correctness failures, security vulnerabilities, or data loss
- **SHOULD** — Violation degrades quality, maintainability, or developer experience
- **MAY** — Violation is suboptimal but acceptable in some contexts

## References

- [<skill-name>](../skills/<slug>/SKILL.md) — <deeper guidance on the practice>
- [<external-doc>](<url>) — <authoritative source>
````

---

## Section-by-Section Guide

### Frontmatter

- `id` — Unique identifier in `<domain>/<slug>` format. Used in rule-manifest.json and AGENTS.md references.
- `severity` — One of MUST (violation = defect), SHOULD (violation = code smell), MAY (recommendation).
- `domains` — Which platform domains this applies to. Use `["universal"]` for cross-cutting rules.
- `paths` — Glob patterns for files this rule applies to. Enables automated scoping.

### Rule Statement

One sentence. Active voice. Ends with the severity tag in brackets. The model reads this as the primary constraint.

**Good:** `All database queries must be scoped by locationId from auth context. [MUST]`
**Bad:** `It is recommended that queries should generally include location scoping when possible. [SHOULD]`

### Why

The single most important section. Models follow rules more reliably when they understand consequences. "Because the style guide says so" is not a reason. "Because unscoped queries return data from other tenants, creating a data leak" is.

### WRONG / RIGHT Examples

Real code, not pseudocode. The WRONG example should be something a developer would plausibly write — not a strawman. The RIGHT example must be a direct fix of the WRONG example, not a different scenario.

### Exceptions

Explicit exceptions prevent false positives and reduce rule fatigue. If a rule has no exceptions, say so explicitly — ambiguity about exceptions leads to inconsistent enforcement.

### Enforcement

Split into automated (CI/linter) and manual (code review). Every rule should have at least one enforcement path. Rules that can only be enforced manually are expensive — prioritize automatable rules.

### Severity Justification

Explains why this severity level was chosen, not what the levels mean. "MUST because unscoped queries create cross-tenant data leaks in production" connects the severity to the specific consequence.

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| No "Why" section | Model follows rule mechanically, fails on edge cases | Add consequence-driven explanation |
| Pseudocode examples | Developer can't map to real code | Use real language, real patterns |
| WRONG example is a strawman | Nobody would write that; rule feels patronizing | Use a plausible violation from real code |
| Vague exceptions | "Sometimes this doesn't apply" — when? | List specific conditions or write "No exceptions" |
| MUST severity without justification | Everything feels critical; severity loses meaning | Justify with specific impact |
