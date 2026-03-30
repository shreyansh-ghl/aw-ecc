---
name: aw-using-aw-skills
description: Session-start routing for the minimal AW SDLC surface. Prefer intent-based routing to plan, execute, verify, and deploy.
trigger: Every session start. Loaded automatically via session-start hook.
---

# Using AW Skills

This skill defines the public AW SDLC interface and how requests should be routed.

The public surface should stay intentionally small:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`

Users should not be required to remember commands.
When the request is clear, route by intent automatically and keep the scope narrow.

There is also one explicit power command:

- `/aw:ship`

`/aw:ship` is for clearly end-to-end requests.
It should not become the default route for normal stage-specific work.

## Routing Priority

1. Explicit user instructions
2. Explicit public AW commands
3. Intent-based routing to the minimal public command surface
4. Domain skills needed to do the selected work well
5. Explicit composite workflows when the user clearly asks for an end-to-end flow

## Public Command Roles

| Command | Role | Primary outcomes |
|---|---|---|
| `/aw:plan` | Create the minimum correct planning artifacts | `prd.md`, `design.md`, `designs/`, `spec.md`, `tasks.md`, `state.json` |
| `/aw:execute` | Implement approved work without reopening planning | `execution.md`, `state.json`, code/docs/config/infra changes |
| `/aw:verify` | Produce evidence, review findings, governance checks, and release readiness | `verification.md`, `state.json` |
| `/aw:deploy` | Create the release outcome for verified work | `release.md`, `state.json`, PR/branch/deploy evidence |

## Intent Routing

Default to one primary route.
Only expand into multi-stage flow when the user explicitly asks for end-to-end work.

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

### Route to `/aw:execute`

Use when the request is about:

- implementing approved work
- coding a bug fix
- applying infra or config changes
- writing docs from approved scope
- continuing partially implemented work

Examples:

- "Implement the approved worker spec."
- "Fix this retry bug."
- "Apply the staging config changes."

### Route to `/aw:verify`

Use when the request is about:

- review
- validation
- readiness
- testing and evidence
- PR checklist/governance
- platform docs or `.aw_rules` compliance

Examples:

- "Review and validate this implementation."
- "Is this ready for staging?"
- "Check this PR against the guidelines."

### Route to `/aw:deploy`

Use when the request is about a single release outcome, such as:

- creating a PR
- branch handoff
- staging deployment
- production deployment

Examples:

- "Create a PR for this verified work."
- "Deploy this verified worker to staging."
- "Deploy this verified Communities feed MFA to staging."
- "Deploy this verified microservice change to staging."

If the user asks for more than one release outcome in sequence, such as PR creation followed by staging deployment, prefer `/aw:ship` instead of `/aw:deploy`.

### Route to `/aw:ship`

Use only when the user clearly wants an end-to-end flow in one go, or when the user asks for multiple release outcomes in sequence.

Treat `ship` as a first-class public route name, not as an unnamed composite label.

Examples:

- "Take this from idea to ship."
- "Do the whole flow."
- "Build this end to end."
- "Ship this from approved spec to staging."
- "Take this change through PR creation and staging version deployment."
- "Create the PR and then deploy it to staging."

## Scope Guardrails

- A direct code request should not drift into design or product work.
- A design request should not drift into coding.
- A deploy request should not reopen planning.
- A verify request should not silently implement code.
- A technical planning request must not force a PRD first when the request is already well defined.

## Internal Helpers

The public interface stays minimal even if internal helpers are still present.

- `aw:brainstorm` may be used internally for discovery-heavy ideation only
- `aw:finish` is legacy compatibility only and should not be advertised as a public stage
- `aw:code-review` is a compatibility alias under `/aw:verify`
- `aw:tdd` is a compatibility alias under `/aw:execute`
- `aw:ship` is the explicit composite workflow when a single end-to-end command is desired

## Domain Skills

After choosing the public route, load the relevant domain skills for the actual work:

- backend and worker code -> `platform-services-*`
- frontend and design-system work -> `platform-frontend-*`, `platform-design:*`
- data and migrations -> `platform-data:*`
- infra and deployment -> `platform-infra:*`
- test and quality systems -> `platform-sdet:*`
- review depth -> `platform-review:*`

## Rules Always Active

Relevant `.aw_rules` and platform docs remain active regardless of which public command is selected.

Use them as constraints and source of truth, not as a reason to broaden scope.
