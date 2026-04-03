# AW SDLC Command/Skill Architecture

## Purpose

This document defines how AW SDLC commands and skills should coexist without becoming duplicate workflow definitions.

The rule is simple:

- commands are the public interface
- stage skills are the primary implementation units
- subskills are reusable capabilities used by the stage skills

## Ownership Split

### Commands own the public contract

Each public command owns:

- user-facing name
- exact responsibility
- modes
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
- orchestration
- loading the right platform docs and `.aw_rules`
- composing smaller subskills
- writing stage evidence and artifacts

### Subskills own specialist capabilities

Subskills should stay focused and reusable.
Examples:

- code review
- review request and re-review loops
- local validation
- E2E validation
- systematic debugging
- PR governance
- staging deployment
- versioned MFA deployment
- Jenkins pipeline resolution

## Canonical Stack

The intended stack is:

`intent -> process skill(s) -> primary stage skill -> public command contract -> subskills -> deterministic outputs`

This supports both:

- skill-first routing for default UX
- explicit command use for deterministic workflows

## Naming Layers

Keep each layer named for one job only:

- `/aw:*` names are the public commands developers use
- `aw-*` names are repo-local stage or helper skills
- `registry.json` is the external platform catalog of available entries
- `baseline-profiles.yml` is the repo-local policy snapshot that selects playbooks by baseline

## Public Commands

The minimal public interface remains:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`

These are the only commands the average developer should need to learn.

## Primary Mapping

| Public command | Primary stage skill | Main job |
|---|---|---|
| `/aw:plan` | `aw-plan` | create the minimum correct planning artifacts |
| `/aw:execute` | `aw-execute` | implement approved work |
| `/aw:verify` | `aw-verify` | produce evidence, review, and readiness |
| `/aw:deploy` | `aw-deploy` | create PR/branch/staging/prod release outcomes |

There is also one composite command:

| Composite command | Primary workflow skill | Main job |
|---|---|---|
| `/aw:ship` | `aw-ship` | orchestrate the smallest correct end-to-end sequence |

## Legacy and Compatibility Commands

These may continue to exist, but they are not the primary public interface:

| Command | Status | Rule |
|---|---|---|
| `/aw:brainstorm` | internal | helper for discovery-heavy ideation only |
| `/aw:finish` | deprecated | legacy compatibility path replaced by `/aw:deploy` |
| `/aw:code-review` | alias | compatibility alias to `/aw:verify` |
| `/aw:tdd` | alias | compatibility alias to `/aw:execute` |

## Recommended Stage Skill Composition

### `/aw:plan`

Primary skill:

- `aw-plan`

Typical supporting skills:

- `aw-brainstorm`
- `aw-spec`
- `aw-tasks`
- product/spec-writing skills
- design planning skills
- architecture/design skills
- platform docs and `.aw_rules`

### `/aw:execute`

Primary skill:

- `aw-execute`

Typical supporting skills:

- `fix-bug`
- `aw-debug`
- `platform-services:*`
- `platform-frontend:*`
- `platform-data:*`
- `platform-infra:*`
- test authoring skills

### `/aw:verify`

Primary skill:

- `aw-verify`

Typical supporting skills:

- `aw-review`
- `aw-debug`
- `platform-review:code-review-pr`
- `platform-review:security-review`
- `platform-review:architecture-review`
- `platform-review:performance-review`
- `platform-review:reliability-review`
- `platform-review:maintainability-review`
- `platform-design:review`
- `platform-frontend:a11y-review`
- `platform-sdet:quality-gates`
- repo-local unit, integration, and E2E validation

### `/aw:deploy`

Primary skill:

- `aw-deploy`

### `/aw:ship`

Primary skill:

- `aw-ship`

This is the only composite workflow command.
It should orchestrate `aw-plan`, `aw-execute`, `aw-verify`, and `aw-deploy` instead of replacing them.

Typical supporting skills:

- `deploy-versioned-mfa`
- `platform-infra:staging-deploy`
- `platform-infra:deployment-strategies`
- `platform-infra:jenkins-pipelines`
- `platform-infra:production-readiness`

## Repo Layout

The intended structure is:

```text
commands/
  plan.md
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
  aw-execute/
    SKILL.md
  aw-verify/
    SKILL.md
  aw-deploy/
    SKILL.md
  aw-ship/
    SKILL.md
  aw-brainstorm/
    SKILL.md
  aw-finish/
    SKILL.md
  aw-spec/
    SKILL.md
  aw-tasks/
    SKILL.md
  aw-review/
    SKILL.md
  aw-debug/
    SKILL.md
  using-aw-skills/
    SKILL.md
    hooks/
      session-start.sh

docs/
  aw-sdlc-command-contracts.md
  aw-sdlc-command-skill-architecture.md
  aw-sdlc-test-plan.md
  aw-sdlc-verify-deploy-configuration.md
```

## Guardrails

To avoid duplication and drift:

1. Never define the full workflow twice.
2. Commands should describe the contract, not every detailed implementation step.
3. Stage skills should implement the workflow, not redefine the public UX.
4. Internal helpers such as `aw-brainstorm`, `aw-finish`, `aw-review`, and `aw-debug` should deepen behavior without becoming extra public stages.
5. Compatibility aliases should point back to the canonical public command.
6. Skill-first routing should resolve to the smallest correct AW skill stack first and the matching public command with it, not jump directly to a random domain subskill.

## Test Rules

The test harness should verify:

1. every public command exists and is active
2. every public command declares one primary stage skill
3. every declared primary stage skill exists
4. internal/deprecated/alias commands are not treated as active public stages
5. skill-first routing resolves to the right primary stage skill and public command
6. public commands and stage skills stay in sync

## Final Recommendation

For AW SDLC, keep both commands and skills.

Do not choose one or the other.

Use:

- commands for the public workflow contract
- stage skills for the implementation workflow
- subskills for reusable specialist execution

That gives us:

- a minimal explicit interface
- good skill-first routing
- deterministic artifacts
- reusable internal capabilities
- testable boundaries
