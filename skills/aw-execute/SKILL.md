---
name: platform-core-aw-execute
description: Executes an approved implementation plan by dispatching one subagent per task — with mode-specific workflows, 2-stage review loops, and automatic escalation.
trigger: Plan approved in aw-plan, or user requests execution of an existing plan.
---

# AW Execute

## Process

1. **Read Plan** — Load the plan from `docs/plans/YYYY-MM-DD-<feature>.md`.
2. **Extract Tasks** — Parse all tasks with their types, files, steps, and code blocks.
3. **Per Task** — For each task in dependency order:
   a. **Dispatch Implementer** — Send the task to a subagent with the appropriate mode.
   b. **Spec Review** — Verify the output matches the spec's acceptance criteria.
   c. **Quality Review** — Verify code quality, platform rules, and test coverage.
4. **Aggregate Results** — Collect all task results and transition to verification.

## Modes

Each task type maps to a specific execution mode:

| Task Type | Mode | Reference |
|---|---|---|
| `[code]` | TDD (Red-Green-Refactor) | [mode-code.md](references/mode-code.md) |
| `[infra]` | Dry-run first, then apply | [mode-infra.md](references/mode-infra.md) |
| `[docs]` | Write, self-review, commit | [mode-docs.md](references/mode-docs.md) |
| `[migration]` | Staged rollout with rollback | [mode-migration.md](references/mode-migration.md) |
| `[config]` | Validate, apply, verify | Same as `[infra]` |

## Debug Mode

### Iron Law

> **No fix may be applied without first identifying the root cause.**
> Guessing and patching symptoms is forbidden.

### 4-Phase Investigation

1. **Reproduce** — Run the failing test or command. Capture exact error output.
2. **Isolate** — Narrow down to the smallest reproducing case. Check: is it data? Logic? Config? Dependency?
3. **Root Cause** — Identify the exact line, value, or condition causing the failure. State it explicitly.
4. **Fix** — Apply the minimal fix that addresses the root cause. Re-run to confirm.

### 3+ Fails = Stop

If the same task fails 3 or more times after attempted fixes:

- **STOP execution** immediately.
- **Report** the task, error history, and attempted fixes to the user.
- **Do not** continue guessing. Wait for user guidance.

## 2-Stage Review Loop

Every task output goes through two review stages before it is marked complete:

### Stage 1: Spec Compliance

- Does the output match the task's acceptance criteria?
- Does it align with the original spec from `aw-brainstorm`?
- Are all files listed in the task created or modified?

### Stage 2: Quality

- Does the code follow platform rules (`.aw_rules`)?
- Are tests written and passing?
- Is error handling comprehensive?
- Are types correct (no `any`)?
- Is the code under 400 lines per file?

## Model Selection

| Task Complexity | Model | When |
|---|---|---|
| Simple (rename, config, docs) | **Haiku** | Single-file changes, boilerplate, checklists |
| Standard (service, component, test) | **Sonnet** | Most implementation tasks, code generation |
| Complex (architecture, multi-service) | **Opus** | Cross-cutting concerns, complex debugging, trade-off decisions |

## Implementer Status Handling

Each implementer subagent returns one of these statuses:

| Status | Action |
|---|---|
| `DONE` | Mark task complete. Proceed to next task. |
| `DONE_WITH_CONCERNS` | Mark task complete. Log concerns for `aw-verify` to check. |
| `NEEDS_CONTEXT` | Provide missing context (file contents, API docs, etc.) and re-dispatch. |
| `BLOCKED` | Stop execution. Report blocker to user with full context. |

## Platform Context

| Domain Signal | Platform Skills to Load |
|---|---|
| TDD, test, coverage | `platform-core-tdd-patterns` |
| NestJS, controller, service | `platform-services-nestjs-module-structure` |
| Vue, component, template | `platform-frontend-vue-development` |
| Helm, k8s, deploy | `platform-infra-kubernetes-workloads` |
| MongoDB, schema, migration | `platform-data-mongodb-patterns` |
| Auth, IAM, guard | `platform-services-authentication-authorization` |
| Worker, queue, pub/sub | `platform-services-worker-patterns` |
| Logger, observability | `platform-services-logging` |

## Next Skill

> After all tasks are executed, invoke **`aw-verify`** to run evidence-based verification.
