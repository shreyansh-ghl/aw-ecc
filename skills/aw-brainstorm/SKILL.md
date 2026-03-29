---
name: platform-core-aw-brainstorm
description: Use before any creative work — explores context, proposes approaches, and produces an approved design spec before code is written.
trigger: User asks to build, create, add, implement, or design something new.
---

# AW Brainstorm

## HARD-GATE

> **No code may be written until the design spec is approved by the user.**
> This skill produces a spec document. Implementation happens in `aw-plan` and `aw-execute`.

## Checklist

1. **Explore Context** — Read the user's request carefully. Identify the domain, scope, and constraints. Scan relevant files in the repo to understand current state.
2. **Load Platform Context** — Use the Platform Context table below to load relevant platform skills based on domain signals in the request.
3. **Ask Questions (1 at a time)** — Ask clarifying questions one at a time. Do not batch questions. Wait for a response before asking the next. Stop when you have enough to propose approaches.
4. **Propose 2-3 Approaches** — Present 2-3 distinct approaches with trade-offs. Each approach should include: summary, pros, cons, effort estimate, and risk level.
5. **Present Design** — Once the user selects an approach, expand it into a full design with: architecture, data flow, component breakdown, edge cases, and constraints.
6. **Write Spec** — Save the approved design to `docs/specs/YYYY-MM-DD-<topic>.md` with:
   - Problem statement
   - Chosen approach with rationale
   - Architecture / component design
   - Data model changes (if any)
   - API changes (if any)
   - Edge cases and error handling
   - Acceptance criteria
   - Out of scope
7. **Self-Review** — Review the spec for completeness, feasibility, and alignment with platform rules. Flag any gaps.
8. **User Reviews** — Present the spec to the user for final approval. Incorporate feedback.
9. **Transition to aw-plan** — Once approved, invoke `aw-plan` to create the implementation plan.

## Platform Context

| Domain Signal | Platform Skills to Load |
|---|---|
| API, controller, endpoint | `platform-services-api-design`, `platform-services-rate-limiting` |
| Vue, component, UI | `platform-frontend-vue-development`, `platform-frontend-highrise-design-system` |
| Database, schema, collection | `platform-data-mongodb-patterns`, `platform-data-firestore-patterns` |
| Auth, IAM, permissions | `platform-services-authentication-authorization` |
| Deploy, k8s, helm | `platform-infra-kubernetes-workloads`, `platform-infra-ci-cd-pipelines` |
| Worker, queue, pub/sub | `platform-services-worker-patterns` |
| Mobile, Flutter, dart | `platform-mobile-flutter-development` |
| Multi-tenant, locationId | `platform-services-multi-tenancy` |

## Anti-Patterns

- **Jumping to code** — Writing implementation before the spec is approved violates the HARD-GATE.
- **Batching questions** — Asking 5 questions at once overwhelms the user. Ask one, wait, repeat.
- **Single approach** — Always present at least 2 options so the user can make an informed choice.
- **Vague spec** — A spec without acceptance criteria is not a spec. Be specific and testable.
- **Ignoring platform rules** — The spec must align with `.aw_rules` and platform conventions. Load and check them.

## Next Skill

> After the spec is approved, invoke **`aw-plan`** to create the implementation plan.
