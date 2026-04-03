# AW SDLC Command Contracts

## Purpose

This document defines the contract for every AW SDLC command so the workflow becomes deterministic, testable, and easy to reason about.

It does two things:

1. defines the exact role of each command
2. defines the shared contract shape that every command must follow

## Contract Model

Every command should define the same fields, even if some are empty.

| Field | Meaning |
|---|---|
| `public_name` | User-facing command name |
| `role` | The command's exact responsibility |
| `stage` | The SDLC stage this command owns |
| `modes` | Allowed submodes for this command |
| `required_inputs` | Inputs that must exist before the command can succeed |
| `optional_inputs` | Inputs the command may use if present |
| `outputs` | Deterministic files or outcomes the command must produce |
| `layers` | Ordered internal steps inside the command |
| `hard_gates` | Conditions that block success |
| `must_not_do` | Behavior that is forbidden for this command |
| `next_commands` | Valid next-stage handoffs |
| `source_of_truth` | Docs and rules that must be consulted |

## Public Command Surface

The target public interface is:

| Command | Public role |
|---|---|
| `/aw:plan` | Define what and how to build |
| `/aw:execute` | Build the approved work |
| `/aw:verify` | Prove quality and readiness |
| `/aw:deploy` | Release or prepare release handoff |

There is also one explicit composite workflow:

| Command | Public role |
|---|---|
| `/aw:ship` | Run the minimum correct end-to-end sequence across multiple stages |

## Command/Skill Relationship

AW SDLC should keep both commands and skills, but they should not be duplicate workflow definitions.

The ownership split is:

- commands own the public contract
- primary stage skills own workflow execution
- smaller subskills provide reusable specialist capabilities

The canonical mapping is:

| Public command | Primary stage skill |
|---|---|
| `/aw:plan` | `aw-plan` |
| `/aw:execute` | `aw-execute` |
| `/aw:verify` | `aw-verify` |
| `/aw:deploy` | `aw-deploy` |

Intent routing should resolve to a public command first.
The selected command may then invoke its primary stage skill and any supporting subskills.

`/aw:ship` is the exception: it is a composite command that orchestrates multiple public stages in sequence.

## Responsibility Completeness Rule

A command has complete responsibility only if it fully answers all of these questions:

1. What exact job does this command own?
2. What stage does it belong to?
3. What modes can it run in?
4. What inputs are required?
5. What inputs are optional?
6. What deterministic outputs must it produce?
7. What internal layers must it execute?
8. What hard gates block success?
9. What is it forbidden to do?
10. What are the only valid next commands?

If any one of those is missing, the command is incomplete and should fail contract validation.

## Responsibility Boundaries

Each public command must be complete within its own stage and incomplete outside its stage.

That means:

- `plan` is fully responsible for planning artifacts and not responsible for implementation
- `execute` is fully responsible for implementation and not responsible for release
- `verify` is fully responsible for evidence and readiness and not responsible for writing new plans
- `deploy` is fully responsible for release outcomes and not responsible for redefining requirements

This keeps every command accountable for a full stage without allowing it to absorb the whole SDLC.

## 1. `/aw:plan`

### Role

Turn an idea, requirement, approved design, or technical request into the minimum correct planning artifacts for execution.

### Stage

`plan`

### Modes

| Mode | Use when | Primary output |
|---|---|---|
| `product` | problem, scope, business intent is still unclear | `prd.md` |
| `design` | user flow or UI behavior must be defined | `design.md` and `designs/` |
| `technical` | technical approach must be defined | `spec.md` |
| `tasks` | implementation breakdown is needed | `tasks.md` |
| `full` | multiple planning artifacts are missing | missing artifacts in order |

### Required Inputs

- user request
- repo context
- relevant platform docs
- relevant `.aw_rules`

### Optional Inputs

- existing `prd.md`
- existing `design.md`
- existing `designs/`
- existing `spec.md`
- existing `tasks.md`
- screenshots, Figma links, API contracts, bug reports, tickets

### Outputs

- updated `.aw_docs/features/<feature_slug>/state.json`
- one or more of:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`

### Layers

| Layer | Responsibility |
|---|---|
| `context` | load repo context, platform docs, and `.aw_rules` |
| `intent` | classify planning mode and scope |
| `prerequisites` | identify which artifacts already exist and which are missing |
| `authoring` | create the required planning artifact(s) |
| `coverage-check` | confirm the planning output covers the request |
| `handoff` | recommend the next valid command |

### Hard Gates

- do not write code
- do not force unrelated artifacts
- do not invent product or design work for a technical-only request

### Must Not Do

- must not jump directly into execution
- must not require `prd.md` for technical planning if the request is already sufficiently defined
- must not create random filenames

### Next Commands

- `/aw:execute`
- `/aw:verify` when the user wants planning reviewed first

## 2. `/aw:execute`

### Role

Implement approved work using the correct execution mode and stop cleanly on blockers instead of guessing.

### Stage

`execute`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `code` | source code implementation | code changes + tests |
| `infra` | Helm, Terraform, CI/CD, environment setup | validated infra/config changes |
| `docs` | documentation-only work | written docs and self-review |
| `migration` | data or schema rollout | staged migration with rollback path |
| `config` | configuration or feature-flag changes | validated config changes |

### Required Inputs

- approved planning artifact appropriate to the mode
- repo context
- relevant platform docs
- relevant `.aw_rules`

### Optional Inputs

- existing branch or diff
- partial implementation
- prior blocker notes

### Outputs

- implementation changes
- tests or validation changes where applicable
- `.aw_docs/features/<feature_slug>/execution.md`
- updated `state.json`

### Layers

| Layer | Responsibility |
|---|---|
| `load` | load `spec.md`, `tasks.md`, or other approved input |
| `mode-select` | choose the correct execution mode |
| `task-run` | implement work in dependency order |
| `spec-review` | confirm output matches the planned acceptance |
| `quality-review` | confirm platform-rule and quality compliance |
| `handoff` | transition cleanly to verification |

### Hard Gates

- execution requires approved planning input
- no guessing after repeated failures
- blockers must be surfaced explicitly

### Must Not Do

- must not re-enter planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not continue after unresolved blockers

### Next Commands

- `/aw:verify`

## 3. `/aw:verify`

### Role

Produce objective evidence that the work is correct, compliant, and ready for release. `verify` is intentionally the smallest public surface that still includes code review, testing, PR governance, and release readiness.

### Stage

`verify`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `quality` | general implementation validation | evidence-based verification report |
| `review` | findings-oriented review is requested | review findings inside verification report |
| `readiness` | release readiness is the goal | final go/no-go recommendation |

### Required Inputs

- completed implementation or change set
- relevant planning artifacts
- repo context
- relevant platform docs
- relevant `.aw_rules`
- resolved verify profile when present

### Optional Inputs

- branch, PR, diff, staging URL
- prior concerns from execute stage

### Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `state.json`
- explicit overall status: `PASS`, `PASS_WITH_NOTES`, or `FAIL`

### Layers

| Layer | Responsibility |
|---|---|
| `code_review` | run structured specialist review using the configured review playbooks |
| `local_validation` | run repo-local evidence such as unit tests, integration tests, lint, typecheck, and build |
| `e2e_validation` | run end-to-end coverage in this repo or the mapped GHL test repo |
| `external_validation` | run external or pipeline-based checks such as sandbox or downstream smoke tests |
| `pr_governance` | validate PR description checklist, required statuses, approvals, and quality-gate state |
| `release_readiness` | produce go/no-go decision and next action for staging handoff or deploy |

### Hard Gates

- no pass claim without evidence
- findings must be surfaced before summary if blockers exist
- verification cannot be skipped before deploy
- PR governance cannot pass if the PR checklist says verification is incomplete
- local validation cannot pass if required unit tests are missing or failing

### Must Not Do

- must not claim success from intuition alone
- must not skip command output when checks can be run
- must not hide blocking findings inside a summary paragraph

### Next Commands

- `/aw:deploy`
- `/aw:execute` if verification fails and work must return for fixes

### Configuration Model

`verify` should use the fixed layer contract above, but fulfill it through a repo-local profile. See [aw-sdlc-verify-deploy-configuration.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-sdlc-verify-deploy-configuration.md).

## 4. `/aw:deploy`

### Role

Convert verified work into the right release outcome: PR, branch handoff, staging deployment, or production deployment. The public contract can support production, but the current GHL baseline should focus first on staging and versioned deploys.
Default to one release path.
If the user explicitly asks for a compound release flow, run the requested release modes in order, usually `pr -> staging`.

### Stage

`deploy`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `pr` | work should be handed off for review/merge | PR created with verification context |
| `branch` | work should remain on a branch | remote branch and summary |
| `staging` | release should go to staging | staging handoff or deployment evidence |
| `production` | verified work is ready for production | production deployment evidence |

### Required Inputs

- passing verification result
- branch or change set
- relevant release context
- resolved deploy profile when present

### Optional Inputs

- PR template
- deployment pipeline info
- staging or production environment details

### Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `state.json`
- release outcome artifact:
  - PR URL
  - branch name
  - staging URL
  - deployment reference
  - versioned deployment links or routing references
  - deployment build links
  - testing automation build links
  - build status summary

### Layers

| Layer | Responsibility |
|---|---|
| `preflight` | confirm verification passed and the requested release path is allowed |
| `release_path` | select PR, branch, staging, or production path |
| `pipeline_resolution` | resolve the `ghl-ai` transport plus the concrete GHL mechanism such as versioned MFA, versioned service, or versioned worker staging, plus future production paths when enabled by profile |
| `execution` | perform the selected release action |
| `post_deploy_evidence` | record the outcome, build links, testing links, build status, versioned links, and references |
| `learning` | append learnings and sync queue |

### Hard Gates

- verification must have passed
- destructive release actions must use the selected mode only
- compound release flows are allowed only when explicitly requested

### Must Not Do

- must not bypass verification
- must not mix multiple release paths in one run unless explicitly requested
- must not drop the final outcome summary

### Next Commands

- none required
- optionally `/aw:verify` again after a staging deploy if re-validation is needed

### Configuration Model

`deploy` should use the fixed layer contract above, but fulfill it through a repo-local profile. See [aw-sdlc-verify-deploy-configuration.md](/Users/prathameshai/Documents/Agentic%20Workspace/aw-ecc/docs/aw-sdlc-verify-deploy-configuration.md).

## Internal and Compatibility Commands

These may continue to exist during migration, but they should not be the primary public UX.

| Command | Intended status | Contract |
|---|---|---|
| `/aw:brainstorm` | internal helper or alias | discovery-heavy planning helper, not the main public entrypoint |
| `/aw:finish` | internal helper or alias | legacy completion path that should converge into `/aw:deploy` |
| `/aw:code-review` | alias | compatibility alias to `/aw:verify` |
| `/aw:tdd` | alias | compatibility alias to `/aw:execute` in `code` mode |

## Source-of-Truth Inputs Per Command

Every command should load:

1. applicable command contract
2. relevant platform docs
3. relevant `.aw_rules`
4. prior feature state from `state.json`
5. prior learnings when available

## Deterministic Output Rules

Every command should:

- write only to deterministic artifact names
- update `state.json`
- emit a single primary status
- recommend only the valid next command(s)
- stay within its own stage unless the user explicitly requested multi-stage work

## How To Implement This

1. Add these contract fields to every command definition.
2. Make command validation enforce the required fields.
3. Add tests that assert the public surface is `plan`, `execute`, `verify`, `deploy`.
4. Add tests that assert each public command has complete responsibility coverage.
5. Add live evals that test both public routing and internal stage resolution.
6. Add artifact and learning E2E tests that verify file-system outcomes.

## Definition of Done

The command contract work is complete when:

1. each public command has an explicit contract
2. each command's layers are documented and testable
3. compatibility aliases are intentional and validated
4. every command has deterministic inputs and outputs
5. the live evals and deterministic tests agree on the behavior
