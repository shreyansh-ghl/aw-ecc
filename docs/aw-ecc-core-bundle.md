# AW ECC Core Bundle

This is the smallest obvious path through `aw-ecc` for teams who want the strongest engineering baseline without learning the whole catalog first.

## Public Stage Flow

The public AW stage surface stays small:

- `/aw:plan`
- `/aw:build`
- `/aw:investigate`
- `/aw:test`
- `/aw:review`
- `/aw:deploy`
- `/aw:ship`

Compatibility routes still exist:

- `/aw:execute` -> `/aw:build`
- `/aw:verify` -> `/aw:test` or `/aw:review`

For explicit one-run automation, use the internal `aw-yolo` skill instead of overloading `ship`.

## The 19-Skill Engineering Core

These are the Addy-parity engineering skills that now exist as first-class ECC skills or tightly governed AW equivalents.

| Concern | ECC skill(s) |
|---|---|
| idea shaping | `idea-refine` |
| spec discipline | `aw-plan`, `aw-spec` |
| planning and task breakdown | `aw-plan`, `aw-tasks` |
| incremental implementation | `incremental-implementation` |
| context curation | `context-engineering` |
| frontend engineering | `frontend-ui-engineering` |
| API and interface design | `api-and-interface-design` |
| test-driven development | `tdd-workflow` |
| browser runtime verification | `browser-testing-with-devtools` |
| debugging and error recovery | `aw-investigate`, `aw-debug` |
| code review and quality | `aw-review` |
| code simplification | `code-simplification` |
| security and hardening | `security-and-hardening` |
| performance optimization | `performance-optimization` |
| git workflow and versioning | `git-workflow-and-versioning` |
| CI/CD and automation | `ci-cd-and-automation` |
| deprecation and migration | `deprecation-and-migration` |
| documentation and ADRs | `documentation-and-adrs` |
| shipping and launch | `aw-ship` |

## Small Obvious Path

If you only remember one default workflow, use this:

1. `idea-refine` when the request is still fuzzy.
2. `/aw:plan` when direction needs to become an approved spec and task set.
3. `/aw:build` when the work is approved and implementation-ready.
4. `/aw:test` when the feature, bugfix, or release needs fresh QA evidence.
5. `/aw:review` when findings, governance, or readiness decisions matter.
6. `/aw:deploy` when you need one release action.
7. `/aw:ship` when rollout safety, rollback posture, and closeout matter.

Use `/aw:investigate` any time the root cause is still unclear.

## Capability Map

If you want X, start with Y:

| If you want... | Start with... |
|---|---|
| turn a vague product concept into a concrete direction | `idea-refine` |
| move from approved direction into deterministic artifacts | `/aw:plan` |
| build in thin safe slices | `/aw:build` + `incremental-implementation` |
| design a stable public interface | `api-and-interface-design` |
| verify real browser behavior | `/aw:test` + `browser-testing-with-devtools` |
| review for findings and readiness | `/aw:review` |
| clean up complexity after behavior is stable | `code-simplification` |
| harden trust boundaries | `security-and-hardening` |
| optimize using measurements | `performance-optimization` |
| keep history reviewable and reversible | `git-workflow-and-versioning` |
| automate gates and rollout safety | `ci-cd-and-automation` |
| retire old systems safely | `deprecation-and-migration` |
| capture the why behind a decision | `documentation-and-adrs` |
| debug an unclear bug or alert | `/aw:investigate` |

## Portable vs AW-Internal

The repo now has two practical modes:

### Portable engineering skills

These can be used outside a full AW stage flow:

- `idea-refine`
- `context-engineering`
- `incremental-implementation`
- `frontend-ui-engineering`
- `api-and-interface-design`
- `browser-testing-with-devtools`
- `code-simplification`
- `security-and-hardening`
- `performance-optimization`
- `git-workflow-and-versioning`
- `ci-cd-and-automation`
- `deprecation-and-migration`
- `documentation-and-adrs`

### AW-governed stage skills

These own deterministic artifacts and stage contracts:

- `aw-plan`
- `aw-build`
- `aw-investigate`
- `aw-test`
- `aw-review`
- `aw-deploy`
- `aw-ship`
- `aw-yolo`

## Org Overlay

In GHL repos, the core bundle should still inherit:

- `defaults/aw-sdlc/baseline-profiles.yml`
- relevant `.aw_rules`
- platform frontend, services, infra, SDET, design, and review playbooks

That means the core bundle is intentionally small in shape, but still strong in org standards once it lands inside an AW-governed repo.
