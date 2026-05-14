---
name: grill-with-docs
description: Grilling session that challenges your plan against the existing domain model, AW planning context, sharpens terminology, and updates documentation (CONTEXT.md, ADRs) inline as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
---

## When To Use

Use this inside every `/aw:plan` as the Decision Confidence Gate.
Its default job is to classify planning intake as `clear`, `confirm`, or `grill`, not to force a long interview every time.

High-impact requests should be grilled even when they sound clear on the surface if they hide decisions about staging vs production, rollout scope, ownership, Auth/DNS/CI/CD/permissions, tenant isolation, rollback, deadlines, or what counts as "live" or "done".
For low-risk, single-scope technical work, return `clear` with assumptions and proceed. If exactly one assumption controls the outcome, return `confirm` and ask one question with a recommended answer. If the problem is fuzzy, high-impact, domain language is overloaded, acceptance criteria are under-specified, or existing AW docs, repo docs, or code may contradict the user's mental model, return `grill` and run the full interview.

<what-to-do>

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

In `grill` depth, ask questions one at a time, waiting for feedback on each question before continuing.

If a question can be answered by exploring the codebase, explore the codebase instead.

</what-to-do>

<supporting-info>

## Domain awareness

During codebase exploration, also look for AW planning context and existing documentation.

### AW feature context

If `.aw_docs/` exists, resolve the active AW context before assuming the repo has no glossary or ADRs.

1. Look for an explicit feature slug in the prompt, current branch, PR title, current files, or conversation. If present, inspect `.aw_docs/features/<slug>/`.
2. If no explicit slug is present, search `.aw_docs/features/` for likely matches using the user's terms. Prefer folders with fresh `state.json`, `prd.md`, `design.md`, `spec.md`, `tasks.md`, `execution.md`, or `verification.md`.
3. If multiple feature folders plausibly match, name the candidates and ask one short selection question before continuing.
4. Read relevant AW feature files as planning memory. Markdown files remain the canonical agent-readable source; HTML sidecars are human-facing companions.
5. Use `state.json`, plan files, PR links, git remotes, and changed paths to identify the target implementation repo or repos. In a workspace that contains multiple repos, do not treat the workspace container root as the domain root.

AW docs do not replace domain docs. They tell you which feature and target repos to inspect. After resolving the AW feature context, inspect the target repo or bounded domain for `CONTEXT.md`, `CONTEXT-MAP.md`, and ADR folders.

### File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily — only when you have something to write. If no `CONTEXT.md` exists in the resolved target repo or bounded context, create one when the first term is resolved. If no `docs/adr/` or `docs/adrs/` exists in that target context, create it when the first ADR is needed.

Do not create `CONTEXT.md` or `docs/adr/` at a workspace container root just because they are missing there. If the root contains `.aw_docs/` plus multiple nested repos, first resolve the AW feature folder and target repo, then create or update docs in the target context.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen. Use the format in [context-format.md](./context-format.md).

Don't couple `CONTEXT.md` to implementation details. Only include terms that are meaningful to domain experts.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [adr-format.md](./adr-format.md).

</supporting-info>
