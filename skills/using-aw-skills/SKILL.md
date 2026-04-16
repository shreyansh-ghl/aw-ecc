---
name: using-aw-skills
description: Session-start skill-first routing for the AW SDLC surface. Classify, route, read stage skill, then respond. Plan-first is mandatory.
trigger: Every session start and before every substantive response.
---

# Using AW Skills

Router for the AW SDLC. MANDATORY on every non-trivial request and re-applied on every scope shift.

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

## Plan-First Triggers (exhaustive — ANY of these → `/aw:plan`)

- new/modified endpoints, services, schemas, migrations, workers, queues
- architecture or layer-boundary changes
- integrations (third-party APIs, external registries, upstream-sourced skills/agents)
- **router / routing rules / skill orchestration** changes
- **new/modified skills, agents, commands, rule-manifest entries**
- **`state.json` / `verification.md` / review-or-build contract** changes
- **cross-registry propagation** (mirroring into platform-core, GitHub→local, etc.)
- **model assignment changes across multiple agents**
- security-sensitive work (auth, tokens, permissions, tenant scoping)
- public API / interface contract changes
- config changes that alter runtime behavior or feature flags

## Mechanical-Change Whitelist (ONLY bypass of plan-first — ALL must hold)

- single file OR verbatim rename across files
- no new public contract, schema, state-field, workflow step, or registry entry
- no behavior change beyond a named bug fix
- no cross-registry propagation
- no new agent / skill / command / rule / reference

If ANY condition fails → plan-first. "Just a config tweak" / "just a skill edit" does NOT qualify.

## Compound-Request Guard

Per-turn edits that *individually* look mechanical but *cumulatively* form a feature. ANY signal → pause, route to `/aw:plan`, retro-capture under `.aw_docs/features/<slug>/`:

- second consecutive edit touches a new file or concern
- any edit adds a field to a state/schema/contract already edited this session
- any edit mirrors content from an external source
- user says "also do X" after an initial edit

## Pre-Edit Checklist (before the first `Edit`/`Write`/side-effecting `Bash` of a logical change)

- [ ] classification completed
- [ ] route selected and named
- [ ] stage skill read
- [ ] plan exists when plan-first applies
- [ ] all 5 mechanical conditions verified when whitelist is claimed
- [ ] compound-request signals checked against prior turns

## Re-Route Mid-Session

If a follow-up changes the nature of the work (e.g. review session becomes "patch this skill too"), **re-run the Hard Gate for the new scope**. Do not carry old route forward by inertia.

## Public Surface

`/aw:plan` · `/aw:build` (alias: `/aw:execute`) · `/aw:investigate` · `/aw:test` (alias: `/aw:verify`) · `/aw:review` · `/aw:deploy` · `/aw:ship` (launch readiness, rollout, rollback, closeout — NOT end-to-end orchestration)

Honor explicit `/aw:<command>` the user types; do not reinterpret.

## Public Command Roles

| Command | Role | Primary artifacts |
|---|---|---|
| `/aw:plan` | Minimum correct planning | `prd.md`, `design.md`, `spec.md`, `tasks.md`, `state.json` |
| `/aw:build` | Implement approved work in reversible slices | `execution.md`, `state.json`, code/config |
| `/aw:investigate` | Reproduce, localize, confirm failure | `investigation.md`, `state.json` |
| `/aw:test` | Produce fresh QA evidence | `verification.md`, `state.json` |
| `/aw:review` | Findings, governance, readiness | `verification.md`, `state.json` |
| `/aw:deploy` | One release outcome for verified work | `release.md`, `state.json` |
| `/aw:ship` | Launch readiness, rollout safety, rollback, closeout | `release.md`, `state.json`, rollback notes |

## Intent Routing (quick map)

| Intent signals | Route |
|---|---|
| PRD, design, spec, task breakdown, architecture, "build-ready" | `/aw:plan` |
| "implement", "apply", "fix", "continue" w/ approved scope | `/aw:build` |
| "reproduce", "why is X failing", alert, incident | `/aw:investigate` |
| "run tests", "produce evidence", QA proof | `/aw:test` |
| "review", "is this ready", PR checks, findings, readiness | `/aw:review` |
| "create PR", "deploy to staging/prod" (single outcome) | `/aw:deploy` |
| "is this ready to launch", rollout, rollback plan, release closeout | `/aw:ship` |
| "idea → production", "do the whole flow", "PR AND deploy" | `aw-yolo` (internal, not a public route — user should stage explicitly) |

## Scope Guardrails

- code request ≠ design/product work; design ≠ coding
- deploy does not reopen planning; review does not silently implement
- planning request already well-defined does not need a forced PRD
- do not produce substantive non-routing output before skill selection
- local repo AW routing is not skipped because a parent workspace has rules
- every first destructive tool call in a turn re-confirms the route

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
- For config, docs, or non-code slices where test-first is not meaningful, name the verification evidence explicitly. [MUST]
- Never skip RED-GREEN because "the change is trivial". [MUST]

## Red Flags (stop and re-classify)

| Thought | Reality |
|---|---|
| "I can answer quickly first" | Quick answers still need skill context. |
| "Just exploring a little" | Exploration is work — load the skill first. |
| "Just a clarifying question" | Clarify after skill selection. |
| "I know the route" | Knowing ≠ loading. |
| "User said 'yes do it' — I can skip plan" | Approval for an edit ≠ approval to skip routing. |
| "It's just a skill/config tweak" | Skills/routers/agents/registries are plan-first. |
| "Each turn was small" | Compound guard triggers on accumulation. |
| "Planning now is late" | Retro-plan before the next edit. |
| "Entered under /aw:review so route is locked" | Scope shift → re-route. |
| "Just mirroring upstream" | Cross-registry propagation is plan-first. |

## Always-On Activation

Before any substantive response, this router must select the smallest correct AW skill stack and matching public route.

- explicit user command → honor and load the mapped stage skill first
- clear process need → load the needed internal process skill first
- otherwise choose the smallest correct AW primary stage skill by intent
- only after the required AW skills are selected, load deeper domain skills or ask clarifying questions

Do not start with generic implementation, review, or deploy advice before skill selection.

## The Rule

If there is even a small chance that an AW process skill, stage skill, or required domain skill applies, load it before responding.

## Skill Priority

1. process skills (`aw-brainstorm`, `aw-debug`, `aw-review`, `aw-prepare`)
2. primary stage skill (`aw-plan`, `aw-build`, `aw-test`, `aw-review`, `aw-deploy`, `aw-ship`)
3. domain skills (`platform-services/frontend/data/infra/sdet/review/design/mobile:*`) — delegated to `using-platform-skills`

## Cross-Cutting Engineering Skills

Load across stages when context applies: `incremental-implementation`, `context-engineering`, `api-and-interface-design`, `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `frontend-ui-engineering`, `browser-testing-with-devtools`, `idea-refine`

## Internal Helpers (not public routes)

`aw:brainstorm` (discovery only) · `aw:finish` (legacy) · `aw:code-review` → alias of `/aw:review` · `aw:tdd` → alias of `/aw:build` · `aw-yolo` (internal power workflow for autonomous end-to-end orchestration — never advertise as public route)

## Rules Always Active

Relevant `.aw_rules/` and platform docs remain constraints regardless of route — never a reason to broaden scope.

## Harness Activation (one line per harness)

- Claude / hook-capable plugins → global plugin install
- Cursor native / headless → `~/.cursor/hooks.json`
- Cursor plugin → `hooks/hooks-cursor.json`
- Codex → global `~/.codex/` install (launcher fallback)
- Cursor repo without plugin → `.cursor/rules/aw-sdlc-router.mdc`

## References

- [context-loading-and-intake](../../references/context-loading-and-intake.md)
- [route-selection-patterns](../../references/route-selection-patterns.md)
- [domain-skill-loading](../../references/domain-skill-loading.md)
