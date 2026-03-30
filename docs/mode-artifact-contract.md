# Mode Artifact Contract

This document defines the minimal contract for the public workflow modes:

- `plan`
- `execute`
- `review`
- `verify`
- `deploy`

For the concrete planning artifact structure, naming rules, and output contract, see `docs/planning-artifact-system.md`.

The goal is to keep routing minimal and predictable:

1. Each mode must produce a declared output artifact.
2. Each mode may consume multiple upstream artifacts as input.
3. No mode may require an artifact from another mode unless that artifact is actually present or explicitly requested.
4. The system must not assume a PRD is required unless product planning is the active path.

## Core Rule

Decide these three things separately for every request:

- `mode`: what kind of work is being done
- `output artifact`: what this run should produce
- `input artifacts`: what existing material may be used

Do not confuse input artifacts with required artifacts.

Example:

- request: "Break this approved design into engineering tasks"
- mode: `plan`
- output artifact: `task-plan`
- allowed input artifacts: `design-spec`
- must not require: `prd`

## Mode Matrix

| Mode | Output artifact | Allowed input artifacts | Must not require by default |
|---|---|---|---|
| `plan` | `research`, `prd`, `ux-spec`, `architecture-spec`, `task-plan` | brief, ticket, bug report, design-spec, architecture note, API contract, existing PRD, existing research | PRD, UX, or architecture unless needed for the selected output artifact |
| `execute` | `design-output`, `code-change`, `docs-update`, `infra-change` | approved PRD, approved design-spec, task-plan, architecture-spec, ticket, bug report, API contract | PRD if implementation is already technically defined |
| `review` | `review-report` | PRD, design-spec, code diff, architecture note, test results, release plan | upstream planning artifacts unrelated to the thing being reviewed |
| `verify` | `verification-report` | running build, code diff, design-output, test suite, acceptance criteria, release candidate | PRD unless verifying product acceptance directly |
| `deploy` | `release-record` | verified build, release plan, environment target, rollback notes | PRD, research, or design artifacts |

## Planning Subtypes

Inside `plan`, the output artifact must be chosen first.

| Planning output artifact | Use when | Valid upstream inputs | Must not require |
|---|---|---|---|
| `research` | discovery, unknown problem space, market/user understanding | brief, interview notes, problem statement | PRD, design-spec, task-plan |
| `prd` | product definition, goals, scope, acceptance criteria | brief, research, stakeholder notes | design-spec, task-plan |
| `ux-spec` | user flow, states, interaction and content guidance | brief, PRD, existing patterns | task-plan, code |
| `architecture-spec` | technical approach, boundaries, contracts, trade-offs | PRD, design-spec, API contract, existing system context | task-plan, code |
| `task-plan` | execution sequencing, milestones, dev-ready breakdown | design-spec, architecture-spec, ticket, bug report, API contract, approved PRD | PRD if technical inputs are already sufficient |

## Activation Rule

Only rely on artifacts from the active path.

Examples:

- If the request is routed to technical planning, the system may plan from:
  - design-spec
  - architecture-spec
  - API contract
  - ticket
  - bug report

  It must not stop and ask for a PRD unless product definition is genuinely missing and the work cannot be planned without it.

- If the request is routed to product planning, the system may produce a PRD and should not drift into code or deploy.

- If the request is routed to design execution, it may use a PRD or brief if present, but it must not require a task-plan.

## Decision Procedure

For every request:

1. Select the mode.
2. Select the output artifact for that mode.
3. Check whether sufficient input artifacts already exist.
4. If yes, proceed using those inputs.
5. If no, request the smallest missing prerequisite artifact.
6. Do not request unrelated upstream artifacts.

## Good Examples

### Example A

- request: "Turn this API contract into an implementation plan"
- mode: `plan`
- output artifact: `task-plan`
- input artifacts: `api-contract`
- must not require: `prd`, `ux-spec`

### Example B

- request: "Create a PRD for marketplace onboarding"
- mode: `plan`
- output artifact: `prd`
- input artifacts: brief, research notes
- must not require: `ux-spec`, `task-plan`

### Example C

- request: "Implement this approved design"
- mode: `execute`
- output artifact: `code-change`
- input artifacts: `design-spec`
- must not require: `prd`

### Example D

- request: "Review this PR"
- mode: `review`
- output artifact: `review-report`
- input artifacts: code diff, tests, screenshots
- must not require: `prd`

## Product Constraint

PRD is an optional upstream artifact, not a universal dependency.

Use PRD when:

- product scope is the thing being defined
- acceptance criteria are missing
- cross-functional alignment is the main output

Do not require PRD when:

- a technical task can be planned from design, architecture, contract, ticket, or bug details
- the request is clearly engineering-only
- the selected output artifact is already supported by available technical inputs

## Recommended Router Fields

Every routed request should resolve to:

```yaml
mode: plan | execute | review | verify | deploy
output_artifact: <artifact>
input_artifacts: []
missing_prerequisites: []
must_not_require: []
must_not_produce: []
```

This keeps the system explicit about:

- what it is producing
- what it is allowed to rely on
- what it must not drag in
