# AW SDLC Command Contracts

## Purpose

This document defines the contract for every AW SDLC command so the workflow stays deterministic, teachable, and testable.

It does two things:

1. defines the exact job each public command owns
2. defines the shared contract shape that every public command must follow

## Contract Model

Every public command should define the same fields, even if some fields are intentionally short.

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

The canonical public interface is:

| Command | Public role |
|---|---|
| `/aw:plan` | Define the minimum correct planning artifacts |
| `/aw:build` | Implement approved work in thin, reversible slices |
| `/aw:investigate` | Triage bugs, alerts, and unknown failures before patching |
| `/aw:test` | Produce focused QA and fresh validation evidence |
| `/aw:review` | Turn evidence into findings, governance, and readiness decisions |
| `/aw:deploy` | Execute the requested release action |
| `/aw:ship` | Own rollout safety, rollback readiness, and release closeout |

There is also one explicit internal composite workflow:

| Skill | Role |
|---|---|
| `aw-yolo` | Run the minimum correct multi-stage flow when the user explicitly wants full automation |

## Command/Skill Relationship

AW SDLC keeps both commands and skills, but they should not be duplicate workflow definitions.

The ownership split is:

- commands own the public contract
- primary stage skills own workflow execution
- subskills and references provide reusable specialist behavior

The canonical mapping is:

| Public command | Primary stage skill |
|---|---|
| `/aw:plan` | `aw-plan` |
| `/aw:build` | `aw-build` |
| `/aw:investigate` | `aw-investigate` |
| `/aw:test` | `aw-test` |
| `/aw:review` | `aw-review` |
| `/aw:deploy` | `aw-deploy` |
| `/aw:ship` | `aw-ship` |

Compatibility mapping is:

| Command | Status | Behavior |
|---|---|---|
| `/aw:execute` | compatibility | routes to `/aw:build` |
| `/aw:verify` | compatibility | routes to `/aw:test`, `/aw:review`, or both |
| `/aw:code-review` | alias | routes to `/aw:review` |
| `/aw:tdd` | alias | routes to `/aw:build` in TDD mode |

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
- `build` is fully responsible for implementation and not responsible for final release decisions
- `investigate` is fully responsible for diagnosis and not responsible for pretending the fix is already proven
- `test` is fully responsible for QA proof and not responsible for governance sign-off
- `review` is fully responsible for findings and readiness decisions and not responsible for writing new code
- `deploy` is fully responsible for release execution and not responsible for redefining requirements
- `ship` is fully responsible for rollout safety and closeout and not responsible for acting as the whole SDLC

## Stage Continuation And Handoff Rule

Each stage must finish its own requested scope before it hands off.

That means:

- `build` should continue through approved build slices until build scope is complete or explicitly blocked
- `investigate` should continue through confirming probes until the next probe or repair surface is explicit
- `test` should continue until the requested QA scope is covered or explicitly blocked
- `review` should continue until findings, governance, and readiness scope is covered or explicitly blocked
- `deploy` should finish the selected release action or record the blocker explicitly
- `ship` should finish the requested launch-readiness, rollout, or closeout scope or record the blocker explicitly

A passing slice, one successful test, one note, or one partial deploy action is not an automatic terminal state.

Every stage handoff should make these things obvious:

- what was completed
- what remains, if anything
- what blockers or concerns exist
- which exact next command is recommended

`state.json` should always include `recommended_next_commands` so continuation is machine-readable as well as human-readable.
For build-stage save-point discipline, `state.json` should record the created save-point commits for meaningful completed slices.
When planning safe fan-out, `tasks.md` should declare disjoint `parallel_candidate` slices, explicit write scopes, and a `max_parallel_subagents` cap that defaults to `3` unless another value is justified.

## 1. `/aw:plan`

### Role

Turn an idea, requirement, approved design, or technical request into the minimum correct planning artifacts for execution.

### Stage

`plan`

### Modes

| Mode | Use when | Primary output |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are still unclear | `prd.md` |
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

When `tasks.md` prepares parallel execution, it should also define:

- `parallel_group`
- `parallel_ready_when`
- `parallel_write_scope`
- `max_parallel_subagents` with a default of `3` unless another cap is explicitly justified

### Layers

| Layer | Responsibility |
|---|---|
| `context` | load repo context, platform docs, and `.aw_rules` |
| `intent` | classify planning mode and scope |
| `prerequisites` | identify which artifacts already exist and which are missing |
| `authoring` | create the required planning artifact(s) |
| `execution-topology` | decide whether execution should stay sequential or use bounded parallel fan-out |
| `coverage-check` | confirm the planning output covers the request |
| `handoff` | recommend the next valid command |

### Hard Gates

- do not write code
- do not force unrelated artifacts
- do not invent product or design work for a technical-only request

### Must Not Do

- must not jump directly into `/aw:build`
- must not require `prd.md` for technical planning if the request is already sufficiently defined
- must not create random filenames

### Next Commands

- `/aw:build`
- `/aw:review` when the user wants planning artifacts reviewed before implementation
- `/aw:investigate` when the real blocker is missing diagnosis rather than missing planning

## 2. `/aw:build`

### Role

Implement approved work using the correct build mode, continue until the approved build scope is complete or blocked, and stop cleanly on blockers instead of guessing.

### Stage

`build`

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
| `mode-select` | choose the correct build mode |
| `topology-select` | choose sequential execution or bounded parallel waves from the approved plan |
| `task-run` | implement work in dependency order until build scope is complete or blocked |
| `slice-verify` | validate each thin slice before expanding scope |
| `quality-review` | confirm platform-rule and quality compliance |
| `handoff` | transition cleanly to test or review with exact next commands |

### Hard Gates

- build requires approved planning input unless the technical request is already explicitly approved
- no guessing after repeated failures
- blockers must be surfaced explicitly
- multi-slice build work in git-capable workspaces must produce save-point commits for meaningful completed slices
- parallel build fan-out must stay within the approved `max_parallel_subagents` cap, which defaults to `3` unless the plan justifies another value

### Must Not Do

- must not re-enter planning unless a true prerequisite is missing
- must not silently skip tests for code changes
- must not stop after a successful slice if approved build work still remains
- must not deploy as part of build

### Next Commands

- `/aw:test`
- `/aw:review`

## 3. `/aw:investigate`

### Role

Diagnose bugs, alerts, incidents, or ambiguous failures before proposing a repair path.

### Stage

`investigate`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `bug` | feature-level behavior is broken | repro + root-cause path |
| `alert` | production or staging signal needs triage | alert triage + containment notes |
| `incident` | broader operational issue needs diagnosis | evidence pack + repair path |

### Required Inputs

- observed failure, alert, or bug description
- repo context
- relevant logs, traces, screenshots, or test failures when available

### Optional Inputs

- existing reproduction
- prior mitigation attempt
- approved fix direction

### Outputs

- updated `.aw_docs/features/<feature_slug>/execution.md` or investigation notes inside the feature folder
- updated `state.json`
- explicit reproduction, hypothesis, confirmed cause, and recommended next command

### Layers

| Layer | Responsibility |
|---|---|
| `intake` | capture the failing signal and impact |
| `repro` | get to a stable reproduction or explicit missing evidence |
| `hypothesis` | propose likely causes |
| `confirmation` | run the smallest confirming probe |
| `decision` | recommend build, plan, or further investigation |

### Hard Gates

- do not patch before the failing signal is concrete unless containment is explicitly requested
- do not declare root cause without a confirming probe

### Must Not Do

- must not turn ambiguous bug intake into blind implementation
- must not erase evidence that may explain the failure

### Next Commands

- `/aw:build`
- `/aw:plan`
- `/aw:test`

## 4. `/aw:test`

### Role

Produce focused QA evidence for a feature, fix, or release candidate.

### Stage

`test`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `feature` | validate a specific feature slice | targeted proof |
| `regression` | validate a bugfix and nearby risk area | regression evidence |
| `release` | validate broader release readiness before review | stacked QA evidence |

### Required Inputs

- build output or explicit target under test
- repo context
- relevant test tooling, scripts, or runtime targets

### Optional Inputs

- prior failing test
- runtime screenshots or recordings
- external QA notes

### Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `state.json`
- fresh evidence for review or a repair recommendation

### Layers

| Layer | Responsibility |
|---|---|
| `scope` | define the smallest correct test surface |
| `prepare` | load the right test tools and environment expectations |
| `execute` | run the selected checks |
| `evidence` | capture the actual proof and failures |
| `handoff` | route to build or review |

### Hard Gates

- do not claim testing happened without named evidence
- do not run broad release QA when the user only asked for a narrow feature check

### Must Not Do

- must not hide failed checks inside summary prose
- must not replace review when governance and readiness decisions are still required

### Next Commands

- `/aw:review`
- `/aw:build`

## 5. `/aw:review`

### Role

Produce findings, governance decisions, and readiness outcomes from the available evidence.

### Stage

`review`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `findings` | code and implementation review is the main goal | review findings |
| `governance` | PR checklist, approvals, and status checks matter most | governance outcome |
| `readiness` | release recommendation is needed | go / no-go decision |

### Required Inputs

- test evidence, runtime proof, or prior review artifacts
- repo context
- relevant platform review playbooks

### Optional Inputs

- diff or PR URL
- design artifacts
- deploy intent

### Outputs

- `.aw_docs/features/<feature_slug>/verification.md`
- updated `state.json`
- explicit overall status and next action

### Layers

| Layer | Responsibility |
|---|---|
| `evidence` | review tests and runtime proof first |
| `findings` | classify blocking and advisory findings |
| `governance` | check approvals, checklists, and gates |
| `readiness` | produce the release recommendation |
| `handoff` | route to build, test, or deploy |

### Hard Gates

- no governance or readiness call without evidence
- no clearing a finding on stale proof

### Must Not Do

- must not implement code while reviewing
- must not hide blocking findings

### Next Commands

- `/aw:build`
- `/aw:test`
- `/aw:deploy`

## 6. `/aw:deploy`

### Role

Execute the requested release action using the resolved org-standard staging or delivery path.

### Stage

`deploy`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `branch` | branch handoff only is requested | pushed branch evidence |
| `pr` | pull request creation is requested | PR evidence |
| `staging` | staging release is requested | staging deploy evidence |
| `production` | production release is requested | production deploy evidence |

### Required Inputs

- review outcome that supports the requested release action
- repo context
- resolved staging or delivery mechanism

### Optional Inputs

- branch or PR metadata
- release ticket or runbook
- deploy notes from prior attempts

### Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `state.json`
- explicit release action evidence

### Layers

| Layer | Responsibility |
|---|---|
| `preflight` | confirm the release request is allowed |
| `release_path` | select branch, PR, staging, or production mode |
| `pipeline_resolution` | resolve the concrete org-standard transport |
| `execution` | perform the requested release action |
| `post_deploy_evidence` | record the result |
| `learning` | capture notable release learnings when applicable |

### Hard Gates

- never skip review before deploy
- fail closed for unknown deploy configuration

### Must Not Do

- must not invent an unstated release action
- must not silently continue after ambiguous release config

### Next Commands

- `/aw:ship`
- `none`

## 7. `/aw:ship`

### Role

Own launch readiness, rollout safety, rollback posture, and release closeout after deploy or during final launch preparation.

### Stage

`ship`

### Modes

| Mode | Use when | Expected result |
|---|---|---|
| `launch` | launch readiness is the main goal | launch checklist outcome |
| `rollout` | staged rollout management is needed | rollout notes |
| `closeout` | the release already happened and needs closure | release closeout evidence |

### Required Inputs

- deploy evidence or explicit release context
- review outcome
- rollout or monitoring expectations

### Optional Inputs

- smoke test results
- monitoring links
- rollback notes

### Outputs

- `.aw_docs/features/<feature_slug>/release.md`
- updated `state.json`
- launch or blocker summary

### Layers

| Layer | Responsibility |
|---|---|
| `release-context` | load deploy and review context |
| `launch-checklist` | apply the ship checklist |
| `rollback` | confirm rollback readiness |
| `monitoring` | name health checks and ownership |
| `closeout` | write final launch or blocker notes |

### Hard Gates

- no launch confidence without rollback posture
- no rollout closeout without monitoring expectations

### Must Not Do

- must not act as the old end-to-end composite workflow
- must not skip launch safety because deploy already succeeded

### Next Commands

- `none`
- `/aw:deploy` only if the rollout decision explicitly requires another release action

## Internal and Compatibility Commands

Keep helper behavior behind the stage boundary:

- `aw-brainstorm`, `aw-spec`, `aw-tasks`, `aw-debug`, `aw-prepare`, and `aw-yolo` stay internal skills
- `/aw:execute`, `/aw:verify`, `/aw:code-review`, and `/aw:tdd` stay compatibility or alias entrypoints only
