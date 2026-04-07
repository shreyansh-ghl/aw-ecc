# AW SDLC Command/Skill Architecture

## Purpose

This document defines how AW SDLC commands and skills should coexist without becoming duplicate workflow definitions.

The rule is simple:

- commands own the public contract
- stage skills own execution behavior
- process skills own cross-stage orchestration
- references own reusable examples, checklists, and org-standard detail

## Ownership Split

### Commands own the public contract

Each public command owns:

- user-facing name
- exact responsibility
- required and optional inputs
- deterministic outputs
- forbidden behavior
- final response shape

Commands should stay thin.
They define what the system promises, not every implementation step.

### Stage skills own execution behavior

Each public command maps to one primary stage skill.
That stage skill owns:

- workflow steps
- intra-stage continuation rules
- loading the right platform docs and `.aw_rules`
- composing smaller helper skills
- loading shared references on demand
- writing stage evidence and artifacts

Stage skills should not only say when to stop.
They should also say when to keep going inside the stage so the model does not stall after one successful substep.

### Process skills own multi-stage behavior

Process skills stay internal and reusable.
Examples:

- `aw-brainstorm`
- `aw-prepare`
- `aw-debug`
- `aw-yolo`

### References own reusable detail

References should capture:

- stable checklists
- org-standard quality gates
- review severity scales
- frontend expectations
- build increment rules
- rollout checklists

Keep examples and long checklists out of the core `SKILL.md` files unless they materially change behavior.

## Canonical Stack

The intended stack is:

`intent -> process skill(s) -> primary stage skill -> using-platform-skills when needed -> public command contract -> references and helper skills -> deterministic outputs`

This supports both:

- skill-first routing for default UX
- explicit command use for deterministic workflows

The stage handoff contract is the same in both paths:

- finish the current stage scope or record the blocker explicitly
- write the required stage artifact(s)
- summarize what was done, what remains, and the exact next command

## Naming Layers

Keep each layer named for one job only:

- `/aw:*` names are the public commands developers use
- `aw-*` names are repo-local stage or helper skills
- `references/*.md` are progressive-disclosure support files
- `baseline-profiles.yml` is the repo-local GHL policy snapshot for QA, review, governance, and deploy behavior

## Public Commands

The public interface stays intentionally small.
The default delivery lifecycle is:

- `/aw:plan`
- `/aw:build`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

There is also one conditional diagnostic route:

- `/aw:investigate`

`/aw:investigate` is first-class, but it is not part of the default happy path.
Use it for bugs, alerts, regressions, and unclear runtime failures before returning to the main flow.

Compatibility entrypoints may remain during migration:

- `/aw:execute` -> `/aw:build`
- `/aw:verify` -> `/aw:test`, `/aw:review`, or the smallest correct combined verification flow

## Primary Mapping

| Public command | Primary stage skill | Main job |
|---|---|---|
| `/aw:plan` | `aw-plan` | create the minimum correct planning artifacts |
| `/aw:build` | `aw-build` | implement approved work in thin, reversible slices |
| `/aw:investigate` | `aw-investigate` | reproduce, localize, and confirm bugs, alerts, and failing behavior |
| `/aw:test` | `aw-test` | produce fresh QA evidence for feature, bugfix, or release scope |
| `/aw:review` | `aw-review` | findings-oriented review, governance, and readiness decisions |
| `/aw:deploy` | `aw-deploy` | create one requested release outcome |
| `/aw:ship` | `aw-ship` | own launch, rollout safety, rollback readiness, and release closeout |

Default happy path:

`/aw:plan -> /aw:build -> /aw:test -> /aw:review -> /aw:deploy -> /aw:ship`

Conditional path:

`/aw:investigate -> /aw:build`

There is also one explicit internal composite workflow:

| Workflow skill | Status | Main job |
|---|---|---|
| `aw-yolo` | internal opt-in | orchestrate the smallest correct end-to-end sequence when the user explicitly asks for one-run automation |

## Legacy and Compatibility Commands

These may continue to exist, but they are not the primary public interface:

| Command | Status | Rule |
|---|---|---|
| `/aw:brainstorm` | internal | helper for discovery-heavy ideation only |
| `/aw:finish` | deprecated public entrypoint | legacy compatibility path replaced by `/aw:deploy`, while `aw-finish` remains internal until branch-completion behavior is fully absorbed |
| `/aw:code-review` | alias | compatibility alias to `/aw:review` |
| `/aw:tdd` | alias | compatibility alias to `/aw:build` |
| `/aw:execute` | alias | compatibility alias to `/aw:build` |
| `/aw:verify` | compatibility umbrella | routes to `/aw:test`, `/aw:review`, or both |

## Planning Artifact Policy

`.planning/<repo>/<owner>/<feature_slug>/` is a permanent repo artifact when it captures AW SDLC parity, rollout, or other gated implementation work that reviewers may need to audit later.

Keep these files together inside one feature folder:

- `.spec.md`
- `IMPLEMENTATION_PLAN.md`
- `.spec-iteration-N.md`

Use a stable feature slug, keep iteration files scoped to one effort, and avoid dropping scratch notes or disposable local experiments into `.planning/`.
If the material is not review evidence or does not need to survive the branch, keep it out of `.planning/`.

## Recommended Stage Skill Composition

### `/aw:plan`

Primary skill:

- `aw-plan`

Typical supporting skills:

- `aw-brainstorm`
- `aw-spec`
- `aw-tasks`
- product context skills
- design planning skills
- architecture/design skills
- platform docs and `.aw_rules`

### `/aw:build`

Primary skill:

- `aw-build`

Typical supporting skills:

- `fix-bug`
- `aw-debug`
- `platform-core:incremental-delivery`
- `platform-services:*`
- `platform-frontend:*`
- `platform-data:*`
- `platform-infra:*`
- test authoring skills
- frontend design and accessibility playbooks when UI is touched

### `/aw:investigate`

Primary skill:

- `aw-investigate`

Typical supporting skills:

- `aw-debug`
- `platform-infra:grafana`
- `platform-infra:log-analysis`
- `platform-services:*`
- `platform-frontend:*`
- `platform-data:*`

### `/aw:test`

Primary skill:

- `aw-test`

Typical supporting skills:

- `aw-debug`
- `platform-sdet:*`
- `platform-frontend:highrise-configuration`
- repo-local unit, integration, E2E, sandbox, and smoke validation

### `/aw:review`

Primary skill:

- `aw-review`

Typical supporting skills:

- `platform-review:code-review-pr`
- `platform-review:security-review`
- `platform-review:architecture-review`
- `platform-review:performance-review`
- `platform-review:reliability-review`
- `platform-review:maintainability-review`
- `platform-design:review`
- `platform-frontend:a11y-review`
- `platform-sdet:quality-gates`
- `aw-test` evidence and repo-local validation outputs

### `/aw:deploy`

Primary skill:

- `aw-deploy`

Typical supporting skills:

- `deploy-versioned-mfa`
- `platform-infra:staging-deploy`
- `platform-infra:deployment-strategies`
- `platform-infra:jenkins-pipelines`

### `/aw:ship`

Primary skill:

- `aw-ship`

Typical supporting skills:

- `platform-infra:staging-deploy`
- `platform-infra:deployment-strategies`
- `platform-infra:jenkins-pipelines`
- `platform-infra:production-readiness`
- shipping and launch checklists

`aw-yolo` is the only internal composite workflow skill.
It should orchestrate `aw-plan`, `aw-build`, `aw-test`, `aw-review`, `aw-deploy`, and `aw-ship` instead of replacing them.
It should only insert `aw-investigate` when the request or runtime evidence actually requires diagnosis first.

## Repo Layout

The intended structure is:

```text
commands/
  plan.md
  build.md
  investigate.md
  test.md
  review.md
  execute.md
  verify.md
  deploy.md
  ship.md
  brainstorm.md
  finish.md
  code-review.md
  tdd.md

skills/
  aw-plan/
    SKILL.md
  aw-build/
    SKILL.md
  aw-investigate/
    SKILL.md
  aw-test/
    SKILL.md
  aw-review/
    SKILL.md
  aw-deploy/
    SKILL.md
  aw-ship/
    SKILL.md
  aw-yolo/
    SKILL.md
  aw-execute/
    SKILL.md
  aw-verify/
    SKILL.md
  aw-brainstorm/
    SKILL.md
  aw-finish/
    SKILL.md
  aw-spec/
    SKILL.md
  aw-tasks/
    SKILL.md
  aw-debug/
    SKILL.md
  using-aw-skills/
    SKILL.md
    hooks/
      session-start.sh

references/
  testing-patterns.md
  frontend-quality-checklist.md
  build-increments.md
  test-scope-and-evidence.md
  review-findings-severity.md
  context-loading-and-intake.md
  task-sizing-and-checkpoints.md
  interface-stability.md
  git-save-points.md
  ci-quality-gates.md
  debug-triage.md
  adr-and-docs.md
  deprecation-and-migration.md
  ship-launch-checklist.md
```

## Guardrails

To avoid duplication and drift:

1. Never define the full workflow twice.
2. Commands should describe the contract, not every detailed implementation step.
3. Stage skills should load references instead of pasting long checklists inline.
4. Org standards should come from baseline profiles, platform playbooks, and `.aw_rules`, not from hand-wavy prose alone.
