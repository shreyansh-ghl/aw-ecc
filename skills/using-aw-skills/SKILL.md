---
name: using-aw-skills
description: Session-start skill-first routing for the AW SDLC surface. Classify, route, read stage skill, then respond. Plan-first is mandatory.
trigger: Every session start and before every substantive response.
---

# Using AW Skills

Router for the AW SDLC. MANDATORY on every request and re-applied on every scope shift.

## Hard Gate (MUST — in order, before any substantive response)

1. **Classify.** Answer out loud:
   - Approved plan exists at `.aw_docs/features/<slug>/`? (if no → likely plan-first)
   - Bug / alert / unclear failure? (→ `/aw:investigate`)
   - Change touches any plan-first trigger (see list below)? (→ `/aw:plan`, no exceptions)
   - Crosses >1 file AND >1 concern? (→ `/aw:plan`)
   - Qualifies as mechanical per whitelist below? (→ `/aw:build` allowed)
2. **Select route** via decision tree.
3. **Read the stage skill** (`<route>/SKILL.md`). Naming it is not reading it.
4. **Follow the skill's artifacts and contract** — not general-knowledge answers.
5. **Then respond.**

If there is even a small chance that an AW skill applies, load it before responding. Scope shift mid-session → re-run the Hard Gate.

## Route Decision Tree

```
Approved plan for this exact work?
├── NO → Bug/alert/unclear failure?
│         ├── YES → /aw:investigate
│         └── NO  → /aw:plan   ← DEFAULT for anything new
└── YES → Implemented & needs test/review?
          ├── YES → /aw:test or /aw:review
          └── NO  → Deploy/release action?
                    ├── YES → Single release outcome? → /aw:deploy
                    │         Launch readiness/rollout/rollback? → /aw:ship
                    └── NO  → /aw:build
```

## Plan-First Triggers (ANY of these → `/aw:plan`)

- new/modified endpoints, services, schemas, migrations, workers, queues
- architecture or layer-boundary changes
- integrations, external registries, upstream-sourced skills/agents
- router / routing rules / skill orchestration changes
- new/modified skills, agents, commands, rule-manifest entries
- `state.json` / `verification.md` / review-or-build contract changes
- cross-registry propagation (mirroring into platform-core, GitHub→local, etc.)
- model assignment changes across multiple agents
- security-sensitive work (auth, tokens, permissions, tenant scoping)
- public API / interface contract changes
- config changes that alter runtime behavior or feature flags

## Mechanical-Change Whitelist (ONLY bypass — ALL must hold)

- single file OR verbatim rename across files
- no new public contract, schema, state-field, workflow step, or registry entry
- no behavior change beyond a named bug fix
- no cross-registry propagation
- no new agent / skill / command / rule / reference

If ANY fails → plan-first. "Just a config tweak" / "just a skill edit" does NOT qualify.

## Compound-Request Guard

Edits that individually look mechanical but cumulatively form a feature. ANY signal → `/aw:plan`:

- second consecutive edit touches a new file or concern
- any edit adds a field to a state/schema/contract already edited this session
- any edit mirrors content from an external source
- user says "also do X" after an initial edit

## Pre-Edit Checklist

- [ ] classification completed
- [ ] route selected and named
- [ ] stage skill read
- [ ] plan exists when plan-first applies
- [ ] all 5 mechanical conditions verified when whitelist is claimed
- [ ] compound-request signals checked against prior turns

## Mandatory Gates

### spec.md is mandatory

- Every task MUST have `spec.md` before `/aw:build` starts — no exceptions. [MUST]
- Simple requests get simple specs — but they still get specs. [MUST]
- Do not skip spec.md because "the request is simple" or "scope seems small". [MUST]

### tasks.md is mandatory for build handoff

- If the plan recommends `/aw:build`, `tasks.md` must exist. [MUST]
- A plan that says "ready to build" without `tasks.md` is a broken handoff. [MUST]

### RED-GREEN is mandatory for all build slices

- Every `/aw:build` slice MUST follow RED-GREEN-REFACTOR. [MUST]
- Write or identify a failing test/signal BEFORE writing the fix (RED). [MUST]
- Confirm the failure is real. Write the minimal change to pass (GREEN). [MUST]
- Simplify while keeping proof green (REFACTOR). [MUST]
- For non-code slices where test-first is not meaningful, name the verification evidence explicitly. [MUST]
- Never skip RED-GREEN because "the change is trivial". [MUST]

## Public Surface

`/aw:plan` · `/aw:build` (`/aw:execute`) · `/aw:investigate` · `/aw:test` (`/aw:verify`) · `/aw:review` · `/aw:deploy` · `/aw:ship`

Honor explicit `/aw:<command>` the user types; do not reinterpret.

## Skill Priority

1. process skills (`aw-brainstorm`, `aw-debug`, `aw-prepare`)
2. primary stage skill (`aw-plan`, `aw-build`, `aw-investigate`, `aw-test`, `aw-review`, `aw-deploy`, `aw-ship`)
3. domain skills → delegated to `using-platform-skills`

Relevant `.aw_rules/` remain constraints regardless of route.

## References

- [route-selection-patterns](../../references/route-selection-patterns.md) — command roles, intent routing, red flags
- [domain-skill-loading](../../references/domain-skill-loading.md) — cross-cutting and domain skill lists
- [context-loading-and-intake](../../references/context-loading-and-intake.md)
