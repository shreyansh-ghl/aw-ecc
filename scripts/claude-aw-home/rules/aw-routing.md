# AW Routing — Mandatory Gate

> Cross-cutting. Applies to every session, every request, every agent.
> Safety net: even when the using-aw-skills skill fails to load, this rule enforces routing.

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

## Mandatory Gates

### spec.md is mandatory

- Every task MUST have a `spec.md` before build starts. [MUST]
- Simple requests get simple specs — but they still get specs. [MUST]
- A plan that says "ready to build" without `spec.md` is a broken handoff. [MUST]
- Do not skip spec.md because "the request is simple" or "scope seems small". [MUST]

### RED-GREEN is mandatory

- Every build slice MUST follow RED-GREEN-REFACTOR. [MUST]
- Write or identify a failing test/signal BEFORE writing the fix. [MUST]
- Confirm the failure is real (RED). [MUST]
- Write the minimal change to pass (GREEN). [MUST]
- Simplify while keeping proof green (REFACTOR). [MUST]
- For config, docs, or non-code slices where test-first is not meaningful, name the verification evidence explicitly. [MUST]
- Never skip RED-GREEN because "the change is trivial". [MUST]

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
- /aw:build → code changes with RED-GREEN tests.
- /aw:investigate → reproduction + root cause evidence.

## Compatibility

- /aw:execute → resolve to /aw:build
- /aw:verify → resolve to /aw:test or /aw:review
