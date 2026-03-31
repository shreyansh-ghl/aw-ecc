# AW SDLC Superpowers File Parity Audit

This audit tracks the repo-local parity status between AW SDLC and the upstream `obra/superpowers` workflow skills.

The goal is not to copy file names or public commands one-for-one.
The goal is to ensure every meaningful behavior in the compared workflow files is either:

- implemented in the AW SDLC stack
- intentionally adapted into the AW contract model
- or called out as a harness-native difference that the repo itself cannot enforce

## Compared Upstream Files

| Superpowers file | AW SDLC mapping | Status | Notes |
|---|---|---|---|
| `skills/using-superpowers/SKILL.md` | `AGENTS.md`, `skills/using-aw-skills/SKILL.md`, `skills/using-aw-skills/hooks/session-start.sh` | closed (repo-side) | Repo-local activation, routing priority, and command-first resolution are covered. |
| `skills/brainstorming/SKILL.md` | `skills/aw-brainstorm/SKILL.md`, `skills/aw-plan/SKILL.md`, `commands/plan.md` | closed (repo-side) | Discovery, decomposition, one-question flow, options, approved-direction gate, and planning handoff are covered through the internal planning graph. |
| `skills/writing-plans/SKILL.md` | `skills/aw-plan/SKILL.md`, `skills/aw-spec-author/SKILL.md`, `skills/aw-task-planner/SKILL.md`, `commands/plan.md` | closed (repo-side) | Recipe-level `tasks.md` depth is required while keeping `.aw_docs/features/<slug>/` as the canonical artifact root. |
| `skills/executing-plans/SKILL.md` | `skills/aw-execute/SKILL.md`, `commands/execute.md`, `skills/aw-prepare/SKILL.md`, `skills/aw-finish/SKILL.md` | closed (repo-side) | Plan review, task-by-task execution, blocker stop rules, worktree/setup gate, and branch-completion handoff are covered within the AW stage model. |
| `skills/subagent-driven-development/SKILL.md` | `skills/aw-execute/SKILL.md`, `skills/aw-execute/references/*`, `skills/aw-execute/scripts/build-worker-bundle.js` | closed (repo-side) | Internal worker roles, bundle generation, and bounded task ownership are implemented without adding new public commands. |
| `skills/test-driven-development/SKILL.md` | `skills/aw-execute/SKILL.md`, `commands/execute.md`, `skills/aw-verify/SKILL.md` | closed (repo-side) | Failure-first discipline, RED/GREEN checks, and explicit test limitations are part of execution and verification. |
| `skills/systematic-debugging/SKILL.md` | `skills/aw-systematic-debugging/SKILL.md`, `skills/aw-execute/SKILL.md`, `skills/aw-verify/SKILL.md` | closed (repo-side) | Root-cause investigation, phased probing, stop conditions, and verification-before-completion are covered. |
| `skills/requesting-code-review/SKILL.md` | `skills/aw-review-loop/SKILL.md`, `skills/aw-verify/SKILL.md` | closed (repo-side) | AW review explicitly scopes the requested review and translates blocking findings into repair work. |
| `skills/receiving-code-review/SKILL.md` | `skills/aw-review-loop/SKILL.md`, `skills/aw-verify/SKILL.md` | closed (repo-side) | Re-review, finding resolution state, and non-performative handling of review feedback are covered. |
| `skills/verification-before-completion/SKILL.md` | `skills/aw-verify/SKILL.md`, `commands/verify.md` | closed (repo-side) | No verification claim is valid without fresh evidence, and stale evidence cannot be reused after repair. |
| `skills/using-git-worktrees/SKILL.md` | `skills/aw-prepare/SKILL.md`, `scripts/orchestrate-worktrees.js`, `scripts/orchestration-status.js`, `scripts/lib/tmux-worktree-orchestrator.js` | closed (repo-side) | Isolation choice, worktree lifecycle orchestration, degraded snapshot mode, and metadata reuse are implemented. |
| `skills/finishing-a-development-branch/SKILL.md` | `skills/aw-finish/SKILL.md`, `commands/finish.md`, `skills/aw-ship/SKILL.md` | closed (repo-side) | Tests-first finish gate, explicit four choices, cleanup rules, and workspace metadata cleanup are implemented. |

## AW-Specific Adaptations

AW SDLC intentionally keeps the public surface smaller than Superpowers:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

To preserve that contract, Superpowers behaviors are often implemented as internal helpers instead of new public commands:

- `aw-brainstorm`
- `aw-spec-author`
- `aw-task-planner`
- `aw-review-loop`
- `aw-systematic-debugging`
- `aw-prepare`
- `aw-finish`

This is intentional parity-through-adaptation rather than one-to-one command cloning.

## Remaining Harness-Native Deltas

The remaining differences are not missing repo files or missing workflow rules.
They are harness-native enforcement limits:

- Codex still does not provide hook-style startup enforcement as strong as Claude-style bootstrap hooks.
- Internal worker/runtime depth is implemented through repo-local prompts, manifests, and orchestration helpers, but the live quality still depends on the active harness supporting strong subagent execution.
- Review and verification rules can be specified and tested repo-side, but external review quality always depends on the runtime actually following the contract.

## Audit Rule

Any future parity claim should update this file first.
If a Superpowers behavior is not mapped here, it is not yet safe to claim parity.
