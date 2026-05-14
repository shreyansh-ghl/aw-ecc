---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

## When To Use

Use this when the user explicitly wants a plan, design, proposal, or decision to be challenged through questions before it becomes an artifact or implementation direction.

## Workflow

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

## Guardrails

- Keep questions concrete and decision-oriented.
- Do not ask questions that local repo exploration can answer cheaply.
- Stop once the important decisions are clear enough for the next AW stage.
