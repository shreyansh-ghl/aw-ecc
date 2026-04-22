---
name: eval-type-redirect
target: skill/aw-adk
category: behavioral
difficulty: advanced
---

# Eval: Type Redirect — Command Request That Should Be a Skill

## Task

Test that the ADK's type classifier catches misclassifications. The prompt asks to "create a command" but the subject matter (static knowledge, best practices) is actually a skill. The ADK should redirect or at minimum flag the mismatch during the interview.

### Prompt

```
Create a command for React best practices in the platform/frontend namespace. It should cover component patterns, hooks usage, state management, and performance optimization tips.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/frontend` |
| **Domain** | `frontend` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `skill` (despite user saying "command") |

## Expected Outcomes

- [ ] **Type redirect detected** — the ADK recognizes "React best practices" is static knowledge (skill), not a multi-phase workflow (command)
- [ ] **User informed of redirect** — explains why this is a skill, not a command (commands automate workflows with agents and phases; skills encode knowledge)
- [ ] **Proceeds as skill** — after redirect, follows the skill create flow
- [ ] **OR asks user to confirm** — "This sounds like a skill (knowledge reference) rather than a command (workflow). Should I create it as a skill?"
- [ ] **Does NOT blindly create a command** — a "React best practices command" with forced phases and agent roster would be the wrong artifact type

## Grading Criteria

### PASS

- Redirect detected and communicated to user
- Proceeds with correct type (skill) after confirmation

### PARTIAL

- Creates the artifact but notes during interview that it might be a skill
- OR creates a skill without explaining the redirect

### FAIL

- Creates a command with forced multi-phase structure for static knowledge
- No mention of type mismatch

## Evaluation Method

**Type:** model-based

### Model-Based Checks

- Did the executor question the "command" classification?
- Did it explain the difference between commands (workflow) and skills (knowledge)?
- Did it ultimately create a skill (or ask user to choose)?

## Baseline Expectations

- Without ADK: Creates whatever the user asked for literally — a forced "command" with fake phases.
- With ADK: Type classifier catches the mismatch and redirects.
- **Expected delta:** correct type 90%+ with ADK vs. literal compliance without
