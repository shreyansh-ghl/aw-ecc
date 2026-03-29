---
name: platform-core-using-aw-skills
description: Session-start routing — discovers all available skills and ensures the right skill is invoked for every task.
trigger: Every session start. Loaded automatically via session-start hook.
---

# Using AW Skills

<!-- EXTREMELY-IMPORTANT -->
> **If there is even a 1% chance that a skill applies to the current task, you MUST invoke it.**
> Do not rationalize skipping a skill. Do not answer directly when a skill exists.
> Skills contain domain knowledge, platform rules, and proven workflows that you do not have in your base training.
<!-- /EXTREMELY-IMPORTANT -->

## Priority Order

1. **User instructions** — Explicit user requests always override everything.
2. **AW skills** — If a skill matches the task, invoke it before responding.
3. **Default prompt** — Only fall back to default behavior when no skill applies.

## Skill Matching Tables

### SDLC Pipeline Skills

| Trigger | Skill | Description |
|---|---|---|
| Build, create, add, implement, design | `platform-core-aw-brainstorm` | Explore approaches, produce approved design spec |
| Plan, break down, steps, implementation plan | `platform-core-aw-plan` | Create detailed implementation plan from spec |
| Execute, implement, code, build (with plan) | `platform-core-aw-execute` | Execute plan tasks with subagents |
| Verify, check, test, validate, review | `platform-core-aw-verify` | Evidence-based verification with 5 reviewers |
| Finish, PR, merge, deploy, integrate | `platform-core-aw-finish` | Integrate verified work |

### Domain Skills (by file type)

| File Pattern | Skills to Consider |
|---|---|
| `*.controller.ts`, `*.service.ts` | `platform-services-*` (API design, NestJS, auth) |
| `*.vue`, `composables/*.ts` | `platform-frontend-*` (Vue, Highrise, i18n) |
| `*.schema.ts`, `*.repository.ts` | `platform-data-*` (MongoDB, Firestore, Redis) |
| `*.dart`, `lib/**` | `platform-mobile-*` (Flutter, high_rise_ui) |
| `Dockerfile*`, `helm/**`, `*.tf` | `platform-infra-*` (k8s, Terraform, CI/CD) |
| `*.spec.ts`, `*.test.ts` | `platform-core-tdd-patterns` |
| `*.worker.ts` | `platform-services-worker-patterns` |

### Operational Skills

| Trigger | Skill |
|---|---|
| Fix bug, debug, error | `platform-core-fix-bug` |
| Incident, outage, alert | `platform-core-incident-report` |
| Commit, push, git | `platform-core-auto-commit` |
| Publish docs, update docs site | `platform-core-publish-docs` |

### Review Skills

| Trigger | Skill |
|---|---|
| Code review, review PR | `platform-review-code-review` |
| Security review, audit | `platform-review-security-review` |
| Architecture review | `platform-review-architecture-review` |

### Workflow Commands

| Command | Description |
|---|---|
| `/aw:revex-ship` | Full ship workflow (brainstorm -> finish) |
| `/aw:revex-plan` | Plan a feature |
| `/aw:revex-review` | Code review workflow |
| `/aw:revex-deploy` | Deployment workflow |

## .aw_rules Always Active

The `.aw_rules` directory contains platform-specific rules that are ALWAYS active regardless of which skill is invoked. These include:

- Backend rules (logger, DTO, locationId, IAM)
- Frontend rules (Vue 3, Highrise, i18n)
- Data rules (Firestore, MongoDB, Redis)
- Infra rules (Helm, Terraform, Jenkins)
- Security rules (secrets, auth, XSS)

## Red Flags Rationalization Table

| Rationalization | Why It Is Wrong |
|---|---|
| "This is too simple for a skill" | Skills contain platform rules you will violate without them. |
| "I already know how to do this" | You know general patterns, not platform-specific conventions. |
| "The user just wants a quick answer" | Quick wrong answers cost more than slow correct ones. |
| "No skill exactly matches" | If 1% matches, invoke it. Partial match > no match. |
| "I'll check the rules myself" | Skills load rules automatically. Manual checking misses things. |
| "The skill will slow things down" | Rework from skipped rules is slower than loading a skill. |

## How to Invoke Skills

Skills are invoked via the Skill tool:

```
Skill(skill: "platform-core-aw-brainstorm")
Skill(skill: "platform-core-aw-plan")
Skill(skill: "platform-core-aw-execute")
```

Or via slash commands:

```
/aw:revex-ship
/aw:revex-plan
```

When a skill is loaded, follow its instructions completely before returning to the user.
