# AW Routing — Mandatory Gate

> Cross-cutting. Applies to every session, every request, every agent.
> Safety net: even when the using-aw-skills skill fails to load, this rule enforces routing.
> Installed as common-aw-routing.mdc in the project .cursor/rules/ directory.

## Hard Gate (MUST — do not skip)

For every non-trivial request, execute these steps in order before any substantive response:

1. **Select route** — pick the smallest correct AW route from the decision tree below.
2. **Read the stage skill** — Read the matching skill file before responding:
   - /aw:plan → aw-plan/SKILL.md
   - /aw:build → aw-build/SKILL.md
   - /aw:investigate → aw-investigate/SKILL.md
   - /aw:test → aw-test/SKILL.md
   - /aw:review → aw-review/SKILL.md
   - /aw:deploy → aw-deploy/SKILL.md
   - /aw:ship → aw-ship/SKILL.md
3. **Follow the skill's behavior** — produce the artifacts the skill defines, not general-knowledge answers.
4. **Then respond** — only after steps 1-3.

Stating a route without reading the skill file is NOT compliance.

## Route Decision Tree

```text
Does an approved spec.md already exist for this exact work?
├── NO → Is the request about a bug, alert, or unclear failure?
│         ├── YES → /aw:investigate
│         └── NO  → /aw:plan  ← DEFAULT for anything new
└── YES → Is the work implemented and needs testing/review?
          ├── YES → /aw:test or /aw:review
          └── NO  → Is this a deploy or release action?
                    ├── YES → /aw:deploy or /aw:ship
                    └── NO  → /aw:build
```

**Plan-first rule**: New endpoints, services, schemas, features, architecture changes, integrations, and config changes ALL go through /aw:plan first. /aw:build requires an approved spec.md.

## Pre-Code Gate (BLOCKS all code edits)

Before writing, editing, or creating ANY source code file, ALL checks must pass:

1. **spec.md exists** — `.aw_docs/features/<slug>/spec.md` must exist on disk for this work.
   - Missing → STOP → route to /aw:plan → create spec.md and tasks.md first.
   - "The task is small" is NOT a valid skip reason. Small tasks get small specs.
2. **tasks.md exists** — `.aw_docs/features/<slug>/tasks.md` must exist on disk.
   - Missing → STOP → route to /aw:plan first.
3. **User approved the plan** — Do not start /aw:build in the same turn as /aw:plan.

Exceptions (state explicitly before coding): mechanical bug fixes, config-only changes, typo fixes.

## Mandatory Gates

### spec.md is mandatory

- Every task MUST have a `spec.md` before build starts. [MUST]
- Simple requests get simple specs — but they still get specs. [MUST]
- A plan that says "ready to build" without `spec.md` is a broken handoff. [MUST]
- Do not skip spec.md because "the request is simple" or "scope seems small". [MUST]

### RED-GREEN is mandatory

- Every build slice MUST follow RED-GREEN-REFACTOR. [MUST]
- Write or identify a failing test/signal BEFORE writing the fix. [MUST]
- Confirm the failure is real — show the RED failure output. [MUST]
- Write the minimal change to pass (GREEN) — show the GREEN pass output. [MUST]
- Simplify while keeping proof green (REFACTOR). [MUST]
- For config, docs, or non-code slices where test-first is not meaningful, name the verification evidence explicitly. [MUST]
- Never skip RED-GREEN because "the change is trivial". [MUST]
- "I'll add tests after" is NEVER acceptable. [MUST]

### tasks.md is mandatory for build handoff

- If the plan recommends `/aw:build`, `tasks.md` must exist. [MUST]
- A plan that says "ready to build" without `tasks.md` is a broken handoff. [MUST]

## NEVER

- Never respond substantively to a task request before selecting the route. [MUST]
- Never skip `/aw:plan` for new features because the scope seems "small". [MUST]
- Never invoke `/aw:build` without an approved `spec.md`. [MUST]
- Never skip RED-GREEN during build. [MUST]
- Never combine unrelated stages in one response without explicit user request. [SHOULD]

## Default Assumptions

- /aw:plan → write file artifacts under `.aw_docs/features/<slug>/`.
- /aw:build → code changes with RED-GREEN tests. Show RED failure + GREEN pass output.
- /aw:investigate → reproduction + root cause evidence.

## Compatibility

- /aw:execute → resolve to /aw:build
- /aw:verify → resolve to /aw:test or /aw:review
