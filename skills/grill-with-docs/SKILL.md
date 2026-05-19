---
name: grill-with-docs
description: Grilling session that challenges your plan against existing AW feature context, the domain model, sharpens terminology, and updates feature-scoped context.md plus selective domain docs as decisions crystallise. Use when user wants to stress-test a plan against their project's language and documented decisions.
---

## When To Use

Use this inside every `/aw:plan` as the Decision Confidence Gate.
Its default job is to classify planning intake as `clear`, `confirm`, or `grill`, not to force a long interview every time.

High-impact requests should be grilled even when they sound clear on the surface if they hide decisions about staging vs production, rollout scope, ownership, Auth/DNS/CI/CD/permissions, tenant isolation, rollback, deadlines, or what counts as "live" or "done".
For low-risk, single-scope technical work, return `clear` with assumptions and proceed. If exactly one assumption controls the outcome, return `confirm` and ask one question with a recommended answer. If the problem is fuzzy, high-impact, domain language is overloaded, acceptance criteria are under-specified, or existing AW docs, repo docs, or code may contradict the user's mental model, return `grill` and show the numbered grill mode picker instead of immediately starting a long interview.

## Grill Mode Picker

When depth resolves to `grill`, first present this numbered menu and wait for the user's choice:

```text
I found decisions worth grilling. Choose depth:
1. Auto-answer with recommended defaults (Recommended) — I fill the answers from my recommendations, record them as assumptions, and proceed.
2. Quick grill — ask only the top 1-2 highest-leverage questions, each with a recommended answer.
3. Deep grill — run the full one-question-at-a-time interview.
```

Selection rules:

- `1`, `auto`, `recommended`, `accept recommended`, or `auto-answer remaining` means auto-answer all open grill questions from recommendations and continue.
- `2`, `quick`, or `quick grill` means ask at most two questions unless the user explicitly asks for more.
- `3`, `deep`, `deep grill`, or `grill me deeply` means run the full one-question-at-a-time interview.
- If the user says "proceed", "yes", or gives no clear depth but accepts the recommendation, use option `1`.
- Do not select option `3` implicitly just because the request is high-impact. High-impact work may require the picker, but the user must choose deep grill by number or explicit wording.

In option `1`, write the auto-answered decisions into the planning assumptions or feature `context.md` with `source: agent_recommended_default` and flag only genuinely irreversible, security-sensitive, or contradictory decisions for user review.

In option `2`, each question should be short and formatted as:

```text
Question N: <decision>
Recommended: <answer>
Reply with:
1. Accept recommended
2. Answer manually
3. Auto-answer remaining
4. Switch to deep grill
```

<what-to-do>

For option `3` only, interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

In deep grill, ask questions one at a time, waiting for feedback on each question before continuing.

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

### Feature context artifact

For `/aw:plan`, write planning-specific language to the active feature folder first.

Default artifact:

```text
.aw_docs/features/<feature_slug>/context.md
```

Create `context.md` lazily once the first term, ambiguity, relationship, or planning decision is resolved.
Do not create `CONTEXT.md` at the workspace or target repo root just because a feature-level term was clarified.
Treat root or bounded-context `CONTEXT.md` as a promotion target only when the term is stable domain vocabulary that applies beyond the current feature.

When `context.md` is created or materially updated, create or refresh the colocated human companion after the grill completes:

```text
.aw_docs/features/<feature_slug>/context.html
```

Use `platform-core:human-collaboration-artifacts` for the HTML companion. When the harness can spawn it, the skill may delegate to `aw:echo`.
Invoking `/aw:plan` in default `dual` mode is already explicit authorization to run `platform-core:human-collaboration-artifacts` for this human-facing companion. When the harness can spawn subagents, the skill may delegate to `aw:echo`; do not skip `context.html` only because `aw:echo` is not a slash command or direct tool.
If the tool layer cannot spawn `aw:echo`, continue in-process with the HCA skill and keep `context.md` canonical for agents. Do not create stage-local fallback HTML. Record `status: generated`, `owner: platform-core:human-collaboration-artifacts`, `execution_mode: skill`, and the Echo availability reason when HCA generates directly. If HCA itself cannot safely generate, record `status: blocked`, `publish_status: blocked`, and the exact blocker in the feature `state.json` when present.

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

Create files lazily — only when you have something to write. During AW planning, create or update feature-scoped `context.md` first. If no `CONTEXT.md` exists in the resolved target repo or bounded context, create one only when promoting durable domain vocabulary beyond the current feature. If no `docs/adr/` or `docs/adrs/` exists in that target context, create it when the first ADR is needed.

Do not create `CONTEXT.md` or `docs/adr/` at a workspace container root just because they are missing there. If the root contains `.aw_docs/` plus multiple nested repos, first resolve the AW feature folder and target repo, then write feature-scoped context to `.aw_docs/features/<feature_slug>/context.md`; update target-domain docs only for promoted durable vocabulary or ADR-worthy decisions.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in feature `context.md` or target-domain `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y — which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account' — do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible — which is right?"

### Update context.md inline

When a term is resolved during AW planning, update `.aw_docs/features/<feature_slug>/context.md` right there. Don't batch these up — capture them as they happen. Use the format in [context-format.md](./context-format.md).

Do not couple feature `context.md` to implementation details. Only include terms, relationships, decisions, and flagged ambiguities that help humans review the plan.
After the grill is complete, refresh `.aw_docs/features/<feature_slug>/context.html` so the clarified language is readable and shareable for humans.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse** — the cost of changing your mind later is meaningful
2. **Surprising without context** — a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the ADR. Use the format in [adr-format.md](./adr-format.md).

</supporting-info>
