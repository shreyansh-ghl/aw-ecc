# Planning Artifact System

This document defines the planning artifact system for the minimal AW interface.

It keeps the public workflow simple while making the stored outputs explicit and deterministic.

## Goal

For every feature, planning should create a stable set of documentation artifacts:

- `prd.md`
- `design.md`
- `spec.md`
- `tasks.md`

Design work may also create a deterministic `designs/` folder with route-specific assets.

The system should answer these questions clearly:

1. Was product involved?
2. Was design involved?
3. Was technical design involved?
4. Was execution planning involved?

## Canonical Feature Folder

All planning artifacts for a feature live in one stable folder:

```text
.aw_docs/features/<feature_slug>/
  prd.md
  design.md
  designs/
    manifest.json
    <route_slug>/
      manifest.md
      prototype.html
      desktop-default.png
      mobile-default.png
      desktop-empty.png
      mobile-empty.png
      desktop-error.png
      mobile-error.png
  spec.md
  tasks.md
  state.json
```

## Artifact Meanings

| Artifact | Purpose | Created when |
|---|---|---|
| `prd.md` | Product definition | Product mode is active |
| `design.md` | Design decision doc | Design mode is active |
| `designs/` | Concrete design deliverables | Design mode creates actual visual/prototype outputs |
| `spec.md` | Technical implementation specification | Technical planning mode is active |
| `tasks.md` | Execution breakdown into small chunks | Task-planning mode is active |
| `state.json` | Machine-readable artifact state | Always updated when planning runs |

## Planning Modes

The public command can still be just `plan`, but internally it should resolve to one of these planning modes:

- `product`
- `design`
- `technical`
- `tasks`
- `full`

These modes determine which artifacts are produced.

## Mode To Artifact Contract

| Internal plan mode | Primary output | Supporting output | Must not create by default |
|---|---|---|---|
| `product` | `prd.md` | `state.json` | `design.md`, `spec.md`, `tasks.md` |
| `design` | `design.md` | `designs/`, `state.json` | `prd.md`, `spec.md`, `tasks.md` unless explicitly requested |
| `technical` | `spec.md` | `state.json` | `prd.md`, `design.md`, `tasks.md` unless explicitly requested |
| `tasks` | `tasks.md` | `state.json` | `prd.md`, `design.md`, `spec.md` unless they are explicitly missing prerequisites |
| `full` | missing planning artifacts in sequence | all applicable artifacts | code, review, verify, deploy |

## Recommended Dependency Order

Planning artifacts should be created in this order when full planning is requested:

1. `prd.md`
2. `design.md`
3. `spec.md`
4. `tasks.md`

But this order is not mandatory for every feature.

Examples:

- engineering-only refactor:
  - `spec.md`
  - `tasks.md`
- product-only discovery:
  - `prd.md`
- design handoff:
  - `design.md`
  - `designs/`
- full flow:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`

## Input Contract

Every planning run should resolve its inputs explicitly before writing anything.

```yaml
feature_slug: <feature_slug>
plan_mode: product | design | technical | tasks | full
available_inputs: []
missing_inputs: []
outputs_to_create: []
must_not_create: []
```

## Allowed Inputs By Mode

| Plan mode | Typical allowed inputs | Must not require by default |
|---|---|---|
| `product` | brief, notes, research, ticket, business goal | `design.md`, `spec.md`, `tasks.md` |
| `design` | `prd.md`, brief, product notes, route list, existing patterns | `spec.md`, `tasks.md` |
| `technical` | `design.md`, `prd.md`, API contract, architecture notes, ticket | `tasks.md` |
| `tasks` | `spec.md`, `design.md`, ticket, bug report, implementation constraints | `prd.md` if technical clarity already exists |
| `full` | brief, ticket, initiative description | none of the downstream artifacts should be assumed to exist |

## Determinism Rules

Planning must be deterministic in both routing and naming.

### Deterministic routing

Given the same:

- request
- active mode
- available artifacts
- feature slug

the system should produce the same primary artifact and the same output file paths.

### Deterministic naming

The system must never invent random file names.

Allowed names are fixed:

- `prd.md`
- `design.md`
- `spec.md`
- `tasks.md`
- `state.json`

Allowed design folder names are fixed by route slug:

- `designs/<route_slug>/`

Inside each route folder, allowed file names are:

- `manifest.md`
- `prototype.html`
- `desktop-default.png`
- `mobile-default.png`
- `desktop-empty.png`
- `mobile-empty.png`
- `desktop-error.png`
- `mobile-error.png`

If a state does not exist, omit the file rather than renaming it.

## Route Naming Contract For Design

Design artifacts must reflect the route name, not a random screen label.

### Route slug rules

Each design route must use a stable kebab-case slug:

- `marketplace-onboarding`
- `plugin-submission`
- `billing-settings`
- `invite-resend-modal`

Do not use names like:

- `new-screen-final`
- `v2-latest`
- `test-design`

### Design path rules

If the design is for the onboarding route, the path must be:

```text
.aw_docs/features/<feature_slug>/designs/marketplace-onboarding/
```

If the design is for the plugin submission route, the path must be:

```text
.aw_docs/features/<feature_slug>/designs/plugin-submission/
```

### Design manifest rules

Each route folder must contain a `manifest.md` with:

- route name
- purpose
- included states
- asset list
- source of truth references

## `design.md` Contract

`design.md` is the decision document for the visual/UX layer.

It should contain:

1. feature summary
2. route inventory
3. state inventory
4. interaction rules
5. copy/content rules
6. accessibility notes
7. links to route folders in `designs/`

It should not contain embedded binary assets.

## `spec.md` Contract

`spec.md` is the technical design document.

It should contain:

1. problem and technical scope
2. dependencies
3. architecture decisions
4. APIs / contracts
5. data flow
6. edge cases
7. rollout / migration notes
8. references to `design.md` or `prd.md` if present

## `tasks.md` Contract

`tasks.md` is the execution plan.

It should contain:

1. phases
2. task list
3. dependency ordering
4. parallelizable work markers
5. verification checkpoints
6. clear completion criteria

Tasks should be small, ordered, and executable.

## Final Output Contract For `plan`

Every `plan` run should return the same top-level response shape:

```markdown
## Route
- Feature: <feature_slug>
- Plan mode: <product|design|technical|tasks|full>
- Primary artifact: <prd.md|design.md|spec.md|tasks.md>
- Using inputs: <list>
- Not creating: <list>

## Created
- <absolute file path>
- <absolute file path>

## Summary
- Scope: <what was planned>
- Decision: <main planning decision>
- Coverage: <which planning layers are now covered>

## Missing
- <missing prerequisite or "none">

## Next
- Recommended next command: `/aw:plan` or `/aw:execute`
- Reason: <why>
- Status: waiting for user confirmation
```

## Example: Technical Planning Only

```markdown
## Route
- Feature: marketplace-onboarding
- Plan mode: technical
- Primary artifact: spec.md
- Using inputs: design.md
- Not creating: prd.md, tasks.md

## Created
- /abs/.aw_docs/features/marketplace-onboarding/spec.md
- /abs/.aw_docs/features/marketplace-onboarding/state.json

## Summary
- Scope: technical implementation plan for the onboarding flow
- Decision: plan directly from approved design artifacts without requiring a PRD
- Coverage: technical planning is complete

## Missing
- none

## Next
- Recommended next command: `/aw:plan`
- Reason: generate tasks.md before execution
- Status: waiting for user confirmation
```

## Example: Design Planning

```markdown
## Route
- Feature: marketplace-onboarding
- Plan mode: design
- Primary artifact: design.md
- Using inputs: prd.md
- Not creating: spec.md, tasks.md

## Created
- /abs/.aw_docs/features/marketplace-onboarding/design.md
- /abs/.aw_docs/features/marketplace-onboarding/designs/marketplace-onboarding/manifest.md
- /abs/.aw_docs/features/marketplace-onboarding/designs/marketplace-onboarding/prototype.html
- /abs/.aw_docs/features/marketplace-onboarding/state.json

## Summary
- Scope: onboarding route design definition and assets
- Decision: store concrete deliverables under the route-specific design folder
- Coverage: design planning is complete for the onboarding route

## Missing
- none

## Next
- Recommended next command: `/aw:plan`
- Reason: generate spec.md from the approved design artifacts
- Status: waiting for user confirmation
```

## State File Contract

`state.json` should track artifact existence and approval state.

Suggested structure:

```json
{
  "feature_slug": "marketplace-onboarding",
  "artifacts": {
    "prd": { "present": true, "approved": true },
    "design": { "present": true, "approved": false },
    "spec": { "present": false, "approved": false },
    "tasks": { "present": false, "approved": false }
  },
  "design_routes": [
    {
      "route_slug": "marketplace-onboarding",
      "path": ".aw_docs/features/marketplace-onboarding/designs/marketplace-onboarding",
      "states": ["default", "empty", "error"]
    }
  ]
}
```

This allows planning to remain deterministic across repeated runs.
