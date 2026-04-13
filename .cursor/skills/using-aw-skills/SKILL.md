---
name: using-aw-skills
description: Session-start skill-first routing for the AW SDLC surface. Select the smallest correct AW skill stack before any substantive response, then load deeper stage, domain, and org-standard detail on demand.
trigger: Every session start. Loaded automatically via session-start hook.
---

# Using AW Skills

## Overview

This skill is the thin router for the AW SDLC surface.
Its job is to:

- choose the smallest correct public route
- choose the smallest correct AW skill stack
- stop generic commentary until the stage is clear
- load deeper references only when they materially change the decision

Keep this file small.
Stage behavior belongs in stage skills.
Long examples, checklists, and loading guidance belong in shared references.

This means the file should optimize for one thing first:

- make the right next skill obvious

## When to Use

- at session start
- before any substantive response
- whenever the request might map to planning, building, investigating, testing, reviewing, deploying, or shipping work
- whenever the user gives a vague request and the right stage still has to be selected

Do not skip this skill just because the work looks small.

## Skill Discovery

When a task arrives, identify the current delivery phase and load the smallest correct route:

```text
Task arrives
    │
    ├── Vague idea, spec, or task breakdown? ───────→ /aw-plan
    ├── Approved change to implement? ──────────────→ /aw-build
    ├── Bug, alert, or unclear runtime failure? ────→ /aw-investigate
    ├── Need QA proof or regression evidence? ──────→ /aw-test
    ├── Need findings or readiness decision? ───────→ /aw-review
    ├── Need one concrete release action? ──────────→ /aw-deploy
    ├── Need launch or rollout closeout? ───────────→ /aw-ship
    └── Need one-run end-to-end automation? ───────→ aw-yolo
```

Then load the supporting craft and domain skills that sharpen that route.
If the work is in a real GHL domain, load `using-platform-skills` next.

## Public Surface

The public surface stays intentionally small.
The canonical routes are the stages shown in the discovery flow above:

- `/aw-plan`, `/aw-build`, `/aw-test`, `/aw-review`, `/aw-deploy`, `/aw-ship`
- `/aw-investigate`

Default delivery flow:

- `/aw-plan` -> `/aw-build` -> `/aw-test` -> `/aw-review` -> `/aw-deploy` -> `/aw-ship`

Conditional route:

- `/aw-investigate`

`/aw-investigate` is a first-class route for bugs, alerts, regressions, and unclear root cause.
It should not be treated as a mandatory phase in every request.

Compatibility entrypoints remain available during migration:

- `/aw-execute` -> `/aw-build`
- `/aw-verify` -> `/aw-test`, `/aw-review`, or the smallest correct combined verification flow

There is also one explicit internal power workflow:

- `aw-yolo`

`aw-yolo` is for clearly end-to-end requests where the user wants one-run automation.
It should not become the default route for normal stage-specific work.
When it is selected, begin at the first unsatisfied stage rather than restarting the lifecycle from the top.

## Core Operating Behaviors

These behaviors apply across every route.

### 1. Surface Assumptions

Name assumptions that materially change scope, architecture, rollout, or verification.
If an assumption could change the selected route, say it early.

### 2. Manage Confusion Actively

If the request, spec, code, or baseline disagree:

1. stop
2. name the contradiction
3. state the tradeoff or blocking question
4. do not guess through it

### 3. Push Back With Concrete Tradeoffs

If an approach creates obvious risk, complexity, or rollout danger:

- say so directly
- name the downside
- propose the smallest safer alternative

### 4. Enforce Simplicity

Prefer the smallest route and the smallest supporting skill stack.
Do not turn a single-stage task into a hidden multi-stage workflow.

### 5. Maintain Scope Discipline

Touch only the stage and supporting context required for the current request.
Do not reopen planning, implementation, or release work without a reason.

### 6. Verify, Don't Assume

Every route must eventually produce evidence, not just confidence.
Proof belongs in the right stage artifact, not only in narration.

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
3. domain and cross-cutting skills third

The selected public route should reflect the primary stage skill, not hide it.

## Route Selection

Use one primary route unless the user explicitly asks for end-to-end orchestration.

For route examples, explicit routing priority, and scope guardrails, see [`../../references/route-selection-patterns.md`](../../references/route-selection-patterns.md).

## Failure Modes to Avoid

These patterns look productive, but they create routing drift:

1. answering quickly before selecting a route
2. treating exploration as exempt from routing
3. choosing `/aw-investigate` for every bug, even when the fix is already known
4. treating `aw-yolo` as the default because it feels convenient
5. reopening planning during `build` without a real blocker
6. silently implementing during `test` or `review`
7. loading every domain skill "just in case"
8. giving a confident answer without evidence or stage artifacts

## Cross-Cutting Engineering Skills

After the primary stage is selected, load the portable craft skill that best sharpens the work:

- `idea-refine`
- `context-engineering`
- `incremental-implementation`
- `frontend-ui-engineering`
- `api-and-interface-design`
- `browser-testing-with-devtools`
- `code-simplification`
- `security-and-hardening`
- `performance-optimization`
- `git-workflow-and-versioning`
- `ci-cd-and-automation`
- `deprecation-and-migration`
- `documentation-and-adrs`

Load them because they improve the selected stage, not because they create a new public route.
For domain families, cross-cutting guidance, and org-standard loading, see [`../../references/domain-skill-loading.md`](../../references/domain-skill-loading.md).

## Platform Skill Loading

After the primary AW route is known, use `using-platform-skills` when GHL platform behavior materially affects the stage.

- backend and worker work -> `platform-services:*`
- frontend and design-system work -> `platform-frontend:*` plus `platform-design:*`
- data and migrations -> `platform-data:*`
- infra and deploy paths -> `platform-infra:*`
- test systems and QA governance -> `platform-sdet:*`
- review depth and readiness -> `platform-review:*`
- product context and business behavior -> `platform-product:*`

Use `using-platform-skills` to decide the first supporting platform skills for the selected stage.

## Context Loading

Load context in the smallest order that reduces uncertainty without flooding the session.
Start with repo-local contracts and approved AW artifacts before broad code search or domain docs.

See [`../../references/context-loading-and-intake.md`](../../references/context-loading-and-intake.md).

## Org Standards Always On

When the selected stage falls inside a resolved baseline profile, the stage must honor:

- `defaults/aw-sdlc/baseline-profiles.yml`
- relevant platform playbooks
- relevant `.aw_rules`

Frontend work should still inherit HighRise, accessibility, responsive, and review expectations.
Release work should still inherit governance, rollback, and evidence expectations.
See [`../../references/domain-skill-loading.md`](../../references/domain-skill-loading.md).

## Skill Rules

1. Check for an applicable AW route before starting real work.
2. Use one primary route unless the user explicitly asks for end-to-end orchestration.
3. Load process skills before stage skills when the process itself changes the right path.
4. Load domain and craft skills only after the primary route is clear.
5. Load `using-platform-skills` when a GHL platform family materially changes the work.
6. When in doubt between diagnosis and implementation, choose `/aw-investigate` only if root cause is still unclear.
7. When in doubt between a normal route and `aw-yolo`, prefer the normal route.

## Typical Sequences

For a normal feature:

```text
/aw-plan -> /aw-build -> /aw-test -> /aw-review -> /aw-deploy -> /aw-ship
```

For a bug with unclear root cause:

```text
/aw-investigate -> /aw-build -> /aw-test -> /aw-review
```

For a release-ready change that only needs rollout work:

```text
/aw-deploy -> /aw-ship
```

For explicit one-run automation:

```text
aw-yolo -> [smallest correct internal stage sequence]
```

## Verification

Before moving past routing, confirm:

- [ ] the smallest correct AW skill stack was selected first
- [ ] the public route matches the actual stage intent
- [ ] `/aw-investigate` was only chosen when diagnosis is actually required
- [ ] org-standard playbooks and `.aw_rules` are loaded when the baseline requires them
- [ ] the task is not being silently broadened into extra stages
- [ ] `aw-yolo` is used only when the user explicitly asked for end-to-end automation
