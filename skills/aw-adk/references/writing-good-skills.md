# Writing Good Skills

A skill is a reusable knowledge package that teaches an AI agent *how* to do something specific. Skills are not agents (they don't have identity or autonomy) and they are not rules (they don't enforce constraints). They are reference material loaded on demand.

## Key Principles

1. **Structure over length.** A well-organized 200-line skill outperforms a rambling 800-line one. Use consistent headings, scannable lists, and code examples.
2. **Conciseness.** Every sentence should earn its place. If a paragraph can be a bullet, make it a bullet.
3. **Naming signals scope.** `vue3-composables` is better than `frontend-patterns`. The name should tell the agent whether to load it.
4. **Explain the why.** Reasoning sticks better than rigid MUST/NEVER lists. When an agent understands *why* a pattern exists, it generalizes correctly to novel situations.
5. **Multi-model testing.** Test your skill with Opus, Sonnet, and Haiku. If Haiku can't follow it, the skill needs simplification.

## Before / After: "When to Use"

### Bad — vague, single-line trigger

```yaml
# SKILL.md
name: api-error-handling
when_to_use: "When working with API errors"
```

Problems: Every backend task touches API errors. The agent loads this skill too often or not at the right time. No specificity about *which* scenarios benefit.

### Good — multiple concrete trigger scenarios

```yaml
# SKILL.md
name: api-error-handling
when_to_use:
  - "Adding a new NestJS controller endpoint that returns errors to clients"
  - "Implementing retry logic for outbound HTTP calls to third-party APIs"
  - "Converting thrown exceptions to structured ErrorResponse DTOs"
  - "Debugging 5xx errors that lack sufficient context in logs"
```

Why this works: Each scenario is specific enough that the agent (or router) can match it against the current task. The skill loads only when relevant.

## Before / After: Instruction Quality

### Bad — vague instructions, no examples

```markdown
## Error Handling
Handle errors properly. Make sure to catch all exceptions and return
appropriate responses. Use the right status codes.
```

### Good — concrete patterns with code

```markdown
## Error Handling Pattern

Wrap controller actions in a try/catch that maps domain errors to HTTP responses:

```typescript
// WRONG: leaks internal details, no structure
catch (error) {
  res.status(500).json({ message: error.message });
}

// RIGHT: maps to domain error, structured response
catch (error) {
  if (error instanceof EntityNotFoundError) {
    throw new NotFoundException(error.userMessage);
  }
  if (error instanceof ValidationError) {
    throw new BadRequestException(error.toResponse());
  }
  logger.error('Unhandled error in createOrder', { error, orderId });
  throw new InternalServerErrorException('Something went wrong');
}
```

**Why:** Structured error mapping prevents information leakage, gives clients actionable responses, and ensures every error is logged with context for debugging.
```

## Anti-Pattern Catalog

### 1. Too Broad Scope

**Symptom:** Skill named `backend-development` covering routing, ORM, caching, auth, and deployment.

**Fix:** Split into focused skills: `nestjs-routing`, `mongoose-queries`, `redis-caching`. Each skill should cover one coherent concern.

**Test:** If your skill's table of contents has more than 5 unrelated sections, it's too broad.

### 2. Missing Trigger Scenarios

**Symptom:** `when_to_use` is empty or says "when relevant."

**Fix:** Write 3-5 concrete task descriptions that would benefit from this skill. If you can't name 3 distinct scenarios, the skill may be too narrow or should merge into another.

### 3. Vague Instructions

**Symptom:** Instructions say "follow best practices" or "use the right approach" without specifying what those are.

**Fix:** Replace every vague directive with a concrete pattern. Show the code. Show the file path. Show the command.

### 4. No Code Examples

**Symptom:** Pure prose with no WRONG/RIGHT code blocks.

**Fix:** Every non-trivial instruction needs a code example. Prefer paired WRONG/RIGHT examples that show the contrast.

### 5. Everything in SKILL.md (No Progressive Disclosure)

**Symptom:** SKILL.md is 1500 lines because every detail is inlined.

**Fix:** Use progressive disclosure:
- `SKILL.md` — overview, when-to-use, key principles (under 100 lines)
- `references/` — detailed guides, examples, edge cases
- `templates/` — starter code, boilerplate

The agent reads SKILL.md first and loads references only when needed. This saves context window.

### 6. Generic Rather Than Domain-Specific

**Symptom:** Skill says "validate input" without specifying *your* platform's validation stack (class-validator DTOs, specific decorators, your error response shape).

**Fix:** Skills should encode *your team's* patterns, not generic programming advice. The agent already knows generic advice. Your skill adds the specifics: which libraries, which patterns, which file locations, which naming conventions.

## Scope Boundaries

### Skill vs Rule vs Agent

| Dimension | Skill | Rule | Agent |
|-----------|-------|------|-------|
| **Purpose** | Teaches how to do something | Enforces a constraint | Performs a task autonomously |
| **Loaded when** | On demand, for a specific task | Always active for matching files | Invoked by command or coordinator |
| **Format** | Reference docs, examples, templates | Short constraint + WRONG/RIGHT + severity | Identity, mission, tools, workflow |
| **Example** | "How to write Mongoose migrations" | "No bare `any` type" | "Security reviewer agent" |
| **Autonomy** | None — it's passive knowledge | None — it's a check | Full — it reasons and acts |

### Decision Flowchart

1. **Is it a constraint that should always be checked?** → Write a **rule**.
2. **Is it knowledge needed for specific tasks?** → Write a **skill**.
3. **Does it need to reason, decide, and act independently?** → Write an **agent**.
4. **Does it orchestrate multiple agents through phases?** → Write a **command**.

### Gray Areas

- "Always use platform logger" — This is a **rule** (enforceable constraint), not a skill.
- "How to set up structured logging with correlation IDs" — This is a **skill** (teaches a technique).
- "Review all log statements for PII leakage" — This is an **agent** (requires judgment and autonomous action).

## Skill Quality Checklist

Before publishing a skill:

- [ ] Name clearly signals scope and domain
- [ ] `when_to_use` has 3+ concrete trigger scenarios
- [ ] Every instruction has a code example or concrete reference
- [ ] WRONG/RIGHT pairs for non-obvious patterns
- [ ] Progressive disclosure: SKILL.md is under 100 lines, details in references/
- [ ] Domain-specific: encodes *your* team's patterns, not generic advice
- [ ] Tested with at least 2 model tiers (Sonnet + Haiku minimum)
- [ ] "Why" explained for non-obvious decisions
