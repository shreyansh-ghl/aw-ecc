# Writing Good Rules

A rule is an enforceable constraint that is always active for matching files. Rules are not skills (they don't teach techniques) and they are not agents (they don't reason autonomously). They are checks: clear, binary, and ideally automatable.

## Before / After: Rule Definition

### Bad — vague, unenforceable

```markdown
## Code Quality
Write good code. Follow best practices. Make sure everything is clean and well-organized.
```

Problems: "Good code" is subjective. No agent or linter can enforce "clean." No WRONG/RIGHT examples. No severity. This rule will be ignored because it provides no actionable constraint.

### Good — specific, enforceable, with examples

```markdown
## no-bare-any

**Severity:** MUST

Do not use bare `any` type in TypeScript. Use `unknown` for external data and narrow with type guards, or use a specific interface/type.

### WRONG
```typescript
function processPayload(data: any) {
  return data.items.map((item: any) => item.name);
}
```

### RIGHT
```typescript
interface OrderPayload {
  items: Array<{ name: string; quantity: number }>;
}

function processPayload(data: unknown): string[] {
  const payload = validateOrderPayload(data);
  return payload.items.map((item) => item.name);
}
```

### Why
Bare `any` disables TypeScript's type system at the boundary where it matters most — external data. Bugs from unvalidated external data are the #1 source of production incidents in our services.

### Automation
- **ESLint:** `@typescript-eslint/no-explicit-any` (error)
- **CI gate:** Fails PR if new `any` introduced in changed files
```

## Before / After: Severity

### Bad — no severity, everything feels optional

```markdown
- Use structured logging
- Don't use console.log
- Add tests for new files
- Use kebab-case for file names
```

### Good — explicit severity with rationale

```markdown
- **MUST:** No `console.log` in production code — use `@platform-core/logger`. [Security/Observability risk: console.log bypasses structured logging, correlation IDs, and log level controls]
- **MUST:** Add test file for every new source file. [Quality gate: untested code is a regression waiting to happen]
- **SHOULD:** Use kebab-case for file names. [Consistency: cross-platform path issues with mixed case]
- **MAY:** Prefer `readonly` modifier on properties that shouldn't change after construction. [Style: helps communicate intent]
```

## Anti-Pattern Catalog

### 1. No WRONG/RIGHT Examples

**Symptom:** Rule says "don't do X" but never shows what X looks like or what to do instead.

**Fix:** Every rule needs at minimum one WRONG example (so the agent recognizes the pattern) and one RIGHT example (so the agent knows the fix).

### 2. Unclear Severity

**Symptom:** All rules read the same. Agent can't distinguish "will cause a security breach" from "slightly less readable."

**Fix:** Use three tiers consistently:

| Severity | Meaning | Consequence of Violation |
|----------|---------|--------------------------|
| **MUST** | Security risk, data loss, or correctness issue | Blocks PR / commit |
| **SHOULD** | Quality, maintainability, or reliability issue | Flagged in review, should fix |
| **MAY** | Style preference or optimization opportunity | Suggestion only |

### 3. No Automation Path

**Symptom:** Rule exists only as prose. No linter, no CI check, no automated detection.

**Fix:** Every MUST rule should have an automation path documented:

```markdown
### Automation
- **Linter rule:** `rule-name` in `.eslintrc` / `pyproject.toml` / etc.
- **CI check:** Describe the CI step that enforces this
- **Manual review:** If no automation exists, document the review checklist
```

If a MUST rule can't be automated today, note it as a gap and track it.

### 4. Too Broad Scope

**Symptom:** Rule applies to "all code" but is really about a specific domain (e.g., "always use transactions" applies to database code, not utility functions).

**Fix:** Specify the scope explicitly:

```markdown
**Scope:** NestJS service classes that perform database writes
**Does not apply to:** Utility functions, test files, scripts
```

### 5. Unverifiable Claims

**Symptom:** Rule says "ensure high performance" or "maintain code quality" — neither can be checked by reading code.

**Fix:** Rules must be verifiable by examining the code (or running a tool). Ask: "Can I look at a file and determine yes/no whether this rule is followed?" If not, it's not a rule — it's an aspiration.

### 6. Missing "Why"

**Symptom:** Rule says MUST but never explains the consequence of violation. Agent follows it mechanically but can't generalize to novel situations.

**Fix:** Every rule needs a "Why" section. One or two sentences explaining the real-world consequence:

```markdown
### Why
Empty catch blocks hide failures. In production, a swallowed database error means
the user sees success while their data was never saved. The bug surfaces hours later
when the missing data causes downstream failures that are nearly impossible to trace.
```

## Writing Deterministic Rules

The best rules can be checked by a script or linter, not just by human judgment.

### Characteristics of Deterministic Rules

1. **Pattern-matchable:** The violation can be detected by searching for a specific code pattern.
2. **Binary outcome:** Code either violates the rule or it doesn't. No "it depends."
3. **Context-free (ideally):** The rule can be checked per-file without understanding the whole system.

### Examples

| Deterministic (Good) | Non-Deterministic (Rewrite) |
|---|---|
| "No `console.log` in `src/` directories" | "Use appropriate logging" |
| "Every `@Body()` parameter must use a class-validator DTO" | "Validate input properly" |
| "No `any` type in TypeScript files" | "Use good types" |
| "Every new `.ts` file in `src/` must have a `.spec.ts` file" | "Write tests for new code" |

### When Rules Can't Be Fully Deterministic

Some rules require judgment (e.g., "error messages must be actionable"). For these:
1. Provide 3+ WRONG/RIGHT examples spanning different scenarios.
2. Document the judgment criteria explicitly.
3. Assign to agent review rather than automated linting.

## Verification Chain

When an agent checks a rule, it should follow this chain:

```
1. Read the rule definition (constraint + severity + examples)
      ↓
2. Read the linked skill (if the rule references one, for deeper context)
      ↓
3. Read platform docs (if the rule references platform APIs or libraries)
      ↓
4. Search the codebase (find existing patterns that match WRONG or RIGHT)
      ↓
5. Verdict: PASS / FAIL with evidence (file path, line number, pattern matched)
```

The verification chain ensures the agent doesn't just pattern-match superficially but understands the full context.

## Severity Selection Guide

### MUST — Security, Data Loss, Correctness

Use MUST when violation can cause:
- Security vulnerabilities (hardcoded secrets, auth bypass, injection)
- Data loss or corruption (missing transactions, wrong tenant scoping)
- Incorrect behavior visible to users (wrong calculations, missing validations)

### SHOULD — Quality, Maintainability, Reliability

Use SHOULD when violation causes:
- Technical debt that slows future development
- Reduced observability (missing logs, metrics)
- Inconsistency that confuses developers
- Test gaps that increase regression risk

### MAY — Preference, Style, Optimization

Use MAY when:
- Multiple valid approaches exist and yours is a preference
- The benefit is marginal and context-dependent
- Experienced developers might reasonably disagree

## Rule Quality Checklist

- [ ] One constraint per rule (not a bundle)
- [ ] Explicit severity: MUST, SHOULD, or MAY
- [ ] At least one WRONG and one RIGHT code example
- [ ] "Why" section explaining real-world consequence
- [ ] Scope defined (which files/domains it applies to)
- [ ] Automation path documented (linter rule, CI check, or manual review process)
- [ ] Verifiable: can determine pass/fail by examining code
- [ ] Linked to relevant skill (if deeper context exists)
