---
name: documentation-and-adrs
description: Captures the why behind code, interfaces, and decisions. Use when architectural choices, public behavior, release notes, or recurring explanations need durable documentation.
origin: ECC
---

# Documentation and ADRs

## Overview

Document the reason, not just the result.
Code tells future readers what exists. Documentation and ADRs tell them why it exists, what alternatives were rejected, and what constraints still matter.

## When to Use

- making or revisiting an architectural decision
- changing a public API, contract, or user-facing behavior
- shipping a feature that needs release notes or onboarding context
- writing or refreshing README, runbooks, rules, or design notes
- when the same explanation keeps getting repeated in reviews or planning

**When NOT to use**

- the documentation would only restate obvious code
- the work is a throwaway experiment that will not be kept

## Workflow

1. Decide what documentation artifact is needed.
   Choose the smallest durable form:
   - README or quick-start note
   - API or contract docs
   - ADR
   - runbook or release note
   - inline gotcha or architectural comment
2. Capture the why before it evaporates.
   Write the context, constraints, alternatives, and consequences while the decision is fresh.
   Use `references/adr-and-docs.md`.
3. Keep docs close to the surface they explain.
   Public contracts should document behavior near the contract.
   Architecture decisions should link to the affected subsystem.
4. Use ADRs for decisions that are expensive to re-decide.
   For significant architectural or interface choices, coordinate with `architecture-decision-records`.
   Do not hide important rationale in ephemeral chat or PR comments only.
5. Update the surrounding system, not just one file.
   When behavior changes, refresh README notes, rules, specs, release notes, or runbooks that now teach the wrong thing.
6. Treat docs as part of readiness.
   In AW flows, make sure review, deploy, and ship can point to the updated documentation when it matters for operators, reviewers, or future agents.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting." | Code shows what, not the tradeoffs or rejected alternatives. |
| "We'll write docs once things settle." | The rationale is easiest to capture while the decision is current. |
| "Nobody reads ADRs." | Future engineers and agents read them when the original context is gone. |
| "A PR comment is enough documentation." | PR comments are not a reliable long-term knowledge system. |

## Red Flags

- important architectural decisions have no written rationale
- README or runbook still reflects old behavior after a release
- docs repeat obvious code but omit the real gotchas
- the team explains the same tradeoff repeatedly because nothing durable exists
- commented-out code is kept instead of proper history or docs

## Verification

After documentation work, confirm:

- [ ] the correct artifact type was chosen
- [ ] the why, constraints, and alternatives are captured
- [ ] docs live near the behavior or decision they explain
- [ ] ADR-worthy decisions are recorded durably
- [ ] surrounding docs, rules, or release notes are updated when behavior changes
