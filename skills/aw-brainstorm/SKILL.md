---
name: aw-brainstorm
description: Internal discovery helper that deepens pre-code exploration, compares approaches, and hands an approved direction to aw-plan without expanding the public command surface.
trigger: Internal only. Invoked by aw-plan or aw-ship when discovery is still too fuzzy for direct planning.
---

# AW Brainstorm

## Purpose

`aw-brainstorm` is an internal depth skill.
It should make the planning input sharper, not create a parallel public workflow or a second artifact system.

The canonical public route for planning remains `/aw:plan`.

## Hard Gate

No implementation code may be written while discovery is still open.
This skill stops at an approved direction and hands that direction to `aw-spec` through `aw-plan`.
In other words, the public handoff is still: invoke `aw-plan`.

## Discovery Loop

Use this loop only when direct planning would otherwise guess:

1. explore project context first:
   - current files
   - docs
   - recent commits or adjacent artifacts when useful
2. decide whether the request is actually one feature or multiple independent subsystems
3. if the scope is too large for one spec, decompose it before detailed design work
4. identify the unknowns, assumptions, and decision points
5. ask at most one clarifying question at a time when a real decision is blocked
6. propose 2-3 distinct approaches with trade-offs
7. recommend one approach explicitly
8. present the proposed direction in a way the user can approve or correct
9. confirm the chosen direction or record the current best default
10. run a quick self-review for placeholders, contradictions, ambiguity, and overscope
11. hand the approved direction to `aw-spec` through `aw-plan`

## Scope Check

Before deepening the design, decide whether the request needs decomposition.

If the request spans multiple independent subsystems, do not force one giant planning artifact.
Break it into smaller spec-worthy scopes and continue with the smallest correct slice.
If the request is too large for one spec, decompose it before moving on.

## Design Expectations

Discovery should be concrete enough that the next planning step does not need to rediscover the core shape of the work.

Capture:

- problem framing
- purpose and success criteria
- constraints
- compared approaches
- chosen approach with rationale
- major risks
- non-goals
- the next planning artifact that should be written

If the topic is visual and the active harness supports it, a browser-based visual companion may be offered as its own message before visual questions.

## Required Output

Produce a discovery summary that `aw-plan` and `aw-spec` can consume without redoing the ideation step.

The summary should capture:

- problem framing
- assumptions and open questions
- compared approaches
- chosen approach with rationale
- major risks
- constraints and non-goals
- what planning artifact should come next

## Artifact Rule

`aw-brainstorm` should not create a second planning file system or revive any legacy non-deterministic planning path.

If it needs to persist discovery context, keep it inside:

- `.aw_docs/features/<feature_slug>/state.json`

or pass it directly into `aw-plan`.

`aw-plan` remains responsible for canonical planning artifacts such as `prd.md`, `design.md`, `spec.md`, and `tasks.md`.

## Platform Context

| Domain Signal | Platform Skills to Load |
|---|---|
| API, controller, endpoint | `api-design`, `platform-services:development`, `platform-services:rate-limiting` |
| Vue, component, UI | `platform-frontend:vue-development`, `platform-frontend:highrise-compliance`, `platform-design:system` |
| Database, schema, collection | `platform-data:mongodb-patterns`, `platform-data:firestore-patterns` |
| Auth, IAM, permissions | `platform-services:authentication-authorization` |
| Deploy, k8s, helm | `platform-infra:kubernetes-workloads`, `platform-infra:jenkins-pipelines` |
| Worker, queue, pub/sub | `platform-services:worker-patterns`, `platform-infra:pubsub-messaging` |
| Multi-tenant, locationId | `platform-services:multi-tenancy` |

## Anti-Patterns

- jumping straight to code or implementation planning without resolving the real decision
- batching many questions at once
- presenting only one approach when meaningful alternatives exist
- writing final planning artifacts directly instead of routing through `aw-plan`
- reopening brainstorming after the direction is already clear
- ignoring platform rules, repo context, or known constraints

## Next Skill

After the direction is approved, invoke `aw-plan`, which should then invoke `aw-spec`.
