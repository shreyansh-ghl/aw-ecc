# Domain Skill Loading

Use alongside `using-aw-skills` and `using-platform-skills`.

## Load Domain Families After Stage Selection

- backend and worker code -> `platform-services:*`
- frontend and design-system work -> `platform-frontend:*` plus `platform-design:*`
- data, analytics, search, cache, and migrations -> `platform-data:*`
- infra and deployment -> `platform-infra:*`
- test and quality systems -> `platform-sdet:*`
- review depth -> `platform-review:*`
- product and business context -> `platform-product:*`

Choose the primary stage first.
Then let `using-platform-skills` pick the smallest domain family that materially improves that stage.

## Load Cross-Cutting Craft Skills When They Sharpen The Stage

- concept shaping before formal planning -> `idea-refine`
- session quality and context discipline -> `context-engineering`
- thin slices and safe delivery -> `incremental-implementation`
- production-quality UI delivery -> `frontend-ui-engineering`
- contract and interface design -> `api-and-interface-design`
- live browser inspection and UI proof -> `browser-testing-with-devtools`
- safe simplification after behavior is stable -> `code-simplification`
- trust-boundary and hardening work -> `security-and-hardening`
- measure-first optimization -> `performance-optimization`
- branch and save-point hygiene -> `git-workflow-and-versioning`
- CI, preview, and release automation -> `ci-cd-and-automation`
- migration and sunset planning -> `deprecation-and-migration`
- ADRs and durable docs -> `documentation-and-adrs`

These skills complement the stage.
They should not replace the stage.

## Org Standards Always On

When a resolved baseline profile applies, also load:

- `defaults/aw-sdlc/baseline-profiles.yml`
- relevant platform review playbooks
- relevant `.aw_rules`

That means:

- frontend work should inherit HighRise, accessibility, responsive, and design review expectations
- test should inherit repo-local validation, E2E, sandbox, and quality-gate expectations
- review should inherit governance, severity, and readiness expectations
- deploy and ship should inherit rollback, monitoring, and release-safety expectations

## Anti-Flood Rule

- do not load every platform family by default
- do not load every craft skill because the task might touch them
- prefer one primary stage, then the smallest supporting stack
