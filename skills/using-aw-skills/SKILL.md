---
name: using-aw-skills
description: Session-start skill-first routing for the AW SDLC surface. Check the smallest correct AW skill stack before any substantive response, then load GHL-specific standards and references only as needed.
trigger: Every session start. Loaded automatically via session-start hook.
---

# Using AW Skills

## Overview

This skill defines the public AW SDLC interface and how requests should be routed.
It keeps the user-facing surface small while importing stronger operating discipline from Addy-style skill routing and GHL-specific standards.

## When to Use

- at session start
- before any substantive response
- whenever a request could map to planning, building, investigating, testing, reviewing, deploying, or shipping work
- whenever the user gives a vague request and the right stage still has to be selected

Do not skip this skill just because the work seems small.

## Public Surface

The public surface should stay intentionally small, but each phase should be obvious:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

Default delivery flow:

- `/aw:plan` -> `/aw:build` -> `/aw:test` -> `/aw:review` -> `/aw:deploy` -> `/aw:ship`

Conditional route:

- `/aw:investigate`

`/aw:investigate` is a first-class route for bugs, alerts, regressions, and unclear root cause.
It should not be treated as a mandatory phase in every request.

Compatibility entrypoints remain available during migration:

- `/aw:execute` -> `/aw:build`
- `/aw:verify` -> `/aw:test`, `/aw:review`, or the smallest correct combined verification flow

Users should not be required to remember commands.
When the request is clear, route by intent automatically and keep the scope narrow.

There is also one explicit internal power workflow:

- `aw-yolo`

`aw-yolo` is for clearly end-to-end requests where the user wants one-run automation.
It should not become the default route for normal stage-specific work.

## Always-On Activation

Before any substantive response, this router must select the smallest correct AW skill stack and matching public route.

- explicit user command -> honor that command and load the mapped AW stage skill first
- clear process need -> load the needed internal process skill first
- otherwise choose the smallest correct AW primary stage skill and matching public route by intent
- only after the required AW skills are selected, load deeper domain skills or ask clarifying questions

Do not start with generic implementation, review, or deploy advice before skill selection.
Do not leave the active skill stack or matching route implicit for non-trivial work.

## The Rule

If there is even a small chance that an AW process skill, stage skill, or required domain skill applies, load it before responding.

Questions count.
Clarifying questions count.
Quick exploration counts.

The AW public command is the user-facing projection of the selected primary stage skill.
That means AW remains command-simple for users while staying skill-first internally.

## Core Operating Behaviors

These behaviors apply across every AW stage.

### 1. Surface Assumptions

Before non-trivial work, name the assumptions that materially affect scope, architecture, rollout, or verification.
If an assumption could change the selected stage or safety posture, make it explicit.

### 2. Manage Confusion Actively

If the spec, code, platform docs, `.aw_rules`, or user request conflict:

1. stop
2. name the specific contradiction
3. state the tradeoff or blocking question
4. do not guess through it

### 3. Push Back With Concrete Tradeoffs

When an approach creates obvious risk, complexity, rollout danger, or org-standard drift:

- say so directly
- name the concrete downside
- propose the smallest safer alternative

### 4. Enforce Simplicity

Prefer the smallest change that satisfies the stage.
Do not let a task silently expand into framework churn, broad cleanup, or speculative architecture.

### 5. Maintain Scope Discipline

Touch only the code, config, docs, and workflows required for the current stage.
Unrelated cleanup, comment removal, or silent refactors are out of scope unless explicitly requested.

### 6. Verify, Don't Assume

Every stage must produce evidence, not vibes.
Tests, review findings, rollout checks, PR governance, and deploy outcomes must all be backed by current evidence.

## Context Hierarchy

Load context in this order unless the task proves a different order is necessary:

1. repo-local rules and stage contracts
2. approved planning artifacts and stage outputs
3. platform docs, baseline profiles, and `.aw_rules`
4. source files and diffs
5. failing commands, logs, screenshots, traces, and runtime evidence
6. conversation history

Prefer selective loading over flooding.
See `references/context-loading-and-intake.md` when a task is complex or multi-stage.

## Red Flags

These thoughts mean stop and load the right AW skill stack first:

| Thought | Reality |
|---|---|
| "I can answer this quickly first" | Quick answers still need the right AW skill context. |
| "I just need to explore a little" | Exploration is work. Load the right process or stage skill first. |
| "This is just a clarifying question" | Clarifying questions still happen after skill selection. |
| "I know which route this is" | Knowing the route is not the same as loading the right skill stack. |
| "The internal helper is overkill" | If the helper applies, use it. |
| "I'll just verify it mentally" | Evidence beats intuition every time. |

## Routing Priority

1. Explicit user instructions
2. Explicit public AW commands and their mapped primary stage skills
3. Process skills that determine how the work should be approached
4. Primary stage skill and matching minimal public command surface
5. Domain skills needed to do the selected work well
6. Explicit composite workflows when the user clearly asks for an end-to-end flow

## Skill Priority

When multiple AW skills could apply, use this order:

1. process skills first:
   - `aw-brainstorm`
   - `aw-debug`
   - `aw-prepare`
   - `aw-yolo`
2. primary stage skills second:
   - `aw-plan`
   - `aw-build`
   - `aw-investigate`
   - `aw-test`
   - `aw-review`
   - `aw-deploy`
   - `aw-ship`
3. domain skills third:
   - backend, frontend, data, infra, review, and test capability families

The selected public route should reflect the primary stage skill, not hide it.

If the user includes an explicit public AW command prefix such as `/aw:plan`, `/aw:build`, `/aw:investigate`, `/aw:test`, `/aw:review`, `/aw:deploy`, or `/aw:ship`, keep that public command unless the request is malformed.
If the user explicitly uses `/aw:execute` or `/aw:verify`, preserve the compatibility entrypoint while following the updated stage mapping under the hood.

## Public Command Roles

| Command | Role | Primary outcomes |
|---|---|---|
| `/aw:plan` | Create the minimum correct planning artifacts | `prd.md`, `design.md`, `designs/`, `spec.md`, `tasks.md`, `state.json` |
| `/aw:build` | Implement approved work without reopening planning | `execution.md`, `state.json`, code/docs/config/infra changes |
| `/aw:investigate` | Conditionally reproduce, localize, and confirm bugs or alerts before broad fixes | `investigation.md`, `state.json`, repro and root-cause evidence |
| `/aw:test` | Produce fresh QA evidence for the requested feature, bugfix, or release scope | `verification.md`, `state.json` |
| `/aw:review` | Produce findings, governance outcomes, and readiness decisions | `verification.md`, `state.json` |
| `/aw:deploy` | Create one requested release outcome | `release.md`, `state.json`, PR/branch/deploy evidence |
| `/aw:ship` | Own launch, rollout, rollback readiness, and release closeout | `release.md`, `state.json`, launch evidence and closeout notes |

## Intent Routing

Default to one primary route.
Only expand into multi-stage flow when the user explicitly asks for end-to-end work.

The normal delivery flow does not include `/aw:investigate` unless diagnosis is required first.

### Route to `/aw:plan`

Use when the request is about:

- PRD creation
- design planning
- technical specs
- architecture
- implementation task breakdown
- getting work to build-ready state

Examples:

- "Create a PRD for contact sync."
- "Design the onboarding flow."
- "Create the implementation spec."
- "Break this into execution tasks."

Internal planning should then use the smallest correct graph:

- `aw-brainstorm` for fuzzy or overscoped requests
- `aw-spec` for the technical contract
- `aw-tasks` for execution-ready `tasks.md`

### Route to `/aw:build`

Use when the request is about:

- implementing approved work
- applying infra or config changes
- writing docs from approved scope
- continuing partially implemented work
- executing an approved fix after investigation

Examples:

- "Implement the approved worker spec."
- "Apply the staging config changes."
- "Finish the approved migration slice."

### Route to `/aw:investigate`

Use when the request is about:

- a bug with unclear root cause
- an alert or failing runtime signal
- log-driven investigation
- regression analysis before a fix
- reproducing and localizing a failure

Examples:

- "Investigate this retry bug."
- "Look into this alert spike."
- "Find the root cause before changing code."

### Route to `/aw:test`

Use when the request is about:

- QA for a feature or fix
- proving behavior with fresh test evidence
- focused validation before review or release
- runtime verification for frontend work
- regression scope for a bugfix

Examples:

- "Test this feature."
- "Run the QA scope for this bugfix."
- "Prove this frontend change works on desktop and mobile."

### Route to `/aw:review`

Use when the request is about:

- findings-oriented review
- readiness
- PR governance
- release recommendation
- platform docs or `.aw_rules` compliance

Examples:

- "Review this implementation."
- "Is this ready for staging?"
- "Check this PR against the guidelines."

### Route to `/aw:deploy`

Use when the request is about a single release outcome, such as:

- creating a PR
- branch handoff
- staging deployment
- production deployment

Examples:

- "Create a PR for this reviewed work."
- "Deploy this reviewed worker to staging."
- "Deploy this verified Communities feed MFA to staging."

If the user asks for release action plus launch or rollout management, prefer `/aw:deploy -> /aw:ship` or explicit `aw-yolo` automation instead of overloading `/aw:deploy`.

### Route to `/aw:ship`

Use when the request is about:

- launch readiness
- rollout planning
- rollback readiness
- monitoring and post-deploy checks
- release closeout after deploy

Treat `ship` as a real lifecycle stage, not as the unnamed composite label for "do everything."

Examples:

- "Prepare this for launch."
- "Do the rollout and closeout."
- "Make sure rollback and monitoring are ready."

### Route to `aw-yolo`

Use only when the user clearly wants one-run end-to-end automation:

- "Take this from idea to ship."
- "Do the whole flow."
- "Build and release this end to end."
- "Handle everything from approved plan to staging."

## Scope Guardrails

- A direct code request should not drift into design or product work.
- A design request should not drift into coding.
- A deploy request should not reopen planning.
- A test or review request should not silently implement code.
- A technical planning request must not force a PRD first when the request is already well defined.
- Do not produce a substantive non-routing response before the AW skill stack is selected.
- Do not skip repo-local AW routing because a parent workspace or global registry also has instructions.

## Internal Helpers

The public interface stays small even if internal helpers are still present.

- `aw:brainstorm` may be used internally for discovery-heavy ideation only
- `aw:finish` is legacy compatibility only and should not be advertised as a public stage
- `aw:code-review` is a compatibility alias under `/aw:review`
- `aw:tdd` is a compatibility alias under `/aw:build`
- `aw-yolo` is the explicit internal full-flow orchestration skill when a single end-to-end run is desired

## Domain Skills

After choosing the primary stage skill and public route, load the relevant domain skills for the actual work:

- backend and worker code -> `platform-services-*`, then the matching installed `platform-services:*` skills
- frontend and design-system work -> `platform-frontend-*`, then the matching installed `platform-frontend:*` and `platform-design:*` skills
- data and migrations -> `platform-data:*`
- infra and deployment -> `platform-infra:*`
- test and quality systems -> `platform-sdet:*`
- review depth -> `platform-review:*`

## Cross-Cutting Engineering Skills

These are portable engineering craft skills that complement the AW stage system:

- raw concept shaping before formal planning -> `idea-refine`
- session quality, task switching, or context drift -> `context-engineering`
- multi-file delivery discipline and safe slicing -> `incremental-implementation`
- production-quality UI work -> `frontend-ui-engineering`
- API, event, and module-boundary contract design -> `api-and-interface-design`
- live browser runtime inspection and UI proof -> `browser-testing-with-devtools`
- simplification after behavior is stable -> `code-simplification`
- trust-boundary and hardening work -> `security-and-hardening`
- measure-first performance work -> `performance-optimization`
- branch, worktree, and commit hygiene -> `git-workflow-and-versioning`
- pipeline gates, previews, and release automation -> `ci-cd-and-automation`
- replacement, sunset, and migration planning -> `deprecation-and-migration`
- ADRs, README updates, and durable decision capture -> `documentation-and-adrs`

## Org Standards Always On

When the work falls inside a GHL baseline profile, the selected stage must honor the platform standards already encoded in:

- `defaults/aw-sdlc/baseline-profiles.yml`
- platform review playbooks
- platform frontend and design review playbooks
- platform SDET quality-gate and test-repo playbooks
- relevant `.aw_rules`

Frontend work should inherit HighRise configuration, design review, accessibility review, and responsive verification.
Release work should inherit PR governance, rollback planning, and staging evidence expectations from the resolved baseline.

## Verification

Before moving past routing, confirm:

- [ ] the smallest correct AW skill stack was selected first
- [ ] the public route matches the actual stage intent
- [ ] org-standard playbooks and `.aw_rules` are loaded when the baseline requires them
- [ ] the task is not being silently broadened into extra stages
- [ ] end-to-end automation uses `aw-yolo` only when the user explicitly asked for it
