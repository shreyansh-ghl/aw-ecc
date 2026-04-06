# aw-ecc

**GoHighLevel Agentic Workspace Engine** — forked from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code).

## What is this?

`aw-ecc` is GoHighLevel's private fork of ECC. It keeps the upstream ECC engine, then layers in AW SDLC routing, GHL platform integration, repo-local defaults, and eval coverage for GoHighLevel workflows.

The current catalog exposed by this repo is:

- 28 agents
- 157 skills
- 69 commands

## Quick Start Snapshot

Installing `aw-ecc` gives your workspace access to 28 agents, 157 skills, and 69 commands through the repo-local AW command surface plus GHL-specific skill and policy layers.

| Surface | Availability |
| --- | --- |
| Agents | ✅ 28 agents |
| Skills | ✅ 157 skills |
| Commands | ✅ 69 commands |

These catalog counts are validated in CI so the published docs stay aligned with the repo contents.

## Start Here

Most new users do not need to learn the whole catalog first.
Start with the smallest obvious AW path:

1. `/aw:plan` when the request still needs a spec, task breakdown, or approved direction.
2. `/aw:execute` when the work is approved and ready to implement.
3. `/aw:verify` when you need review, validation, or readiness evidence.
4. `/aw:deploy` when you need one release action.
5. `/aw:ship` only when you explicitly want the broader end-to-end or multi-release closeout flow.

If you only read one additional doc after this README, read [docs/aw-ecc-core-bundle.md](./docs/aw-ecc-core-bundle.md).
It gives the smallest newcomer-friendly path through the repo and points to the few supporting skills worth learning early.

After the public stage flow feels natural, read [docs/aw-ecc-leverage-patterns.md](./docs/aw-ecc-leverage-patterns.md).
That guide pulls together the patterns that make longer AW sessions compound instead of degrade.

## Choose Your Install Profile

If you are installing `aw-ecc` directly, keep the install decision as small as the stage-flow decision.
Start with one of the built-in profiles instead of treating the full catalog as the default:

| Profile | Best fit |
| --- | --- |
| `core` | Smallest safe baseline when you want AW stages and quality workflow support first |
| `developer` | Best default for most day-to-day engineering work |
| `security` | Security-heavy review and implementation work |
| `research` | Investigation, synthesis, and content-heavy work |
| `full` | Broadest classified surface when you explicitly want everything at once |

A smaller profile plus a few targeted additions is usually easier to adopt than a full install on day one.
The installer already supports that model:

```bash
./install.sh --target codex --profile core
./install.sh --target cursor --profile developer --with lang:typescript --with framework:nextjs
./install.sh --target claude --profile research --with capability:content
```

For the focused guide on when to choose each profile and when `full` is actually worth it, read [docs/aw-ecc-install-profiles.md](./docs/aw-ecc-install-profiles.md).

## Use Safe Defaults

`aw-ecc` should not only feel powerful.
It should feel survivable when the runtime touches untrusted repos, PRs, docs, attachments, tool output, or MCP responses.

Start with these defaults:

- prefer `core` or `developer` unless you truly need broader surface area
- keep enabled MCPs narrow per project and prefer CLI wrappers when they are sufficient
- use isolation for untrusted work instead of giving the agent broad local access
- require approval before unsandboxed shell, network egress, secret reads, off-repo writes, or deploy actions
- keep memory narrow, project-scoped, and disposable for high-risk workflows
- scan your config and agent surface before trusting it

Recommended first step:

```bash
npx ecc-agentshield scan
```

For the full operating model, read [docs/aw-ecc-security-posture.md](./docs/aw-ecc-security-posture.md).

## See The Proof Surface

`aw-ecc` should be judged by evidence, not just by catalog size or launch copy.
If you want to understand why the workflow is trustworthy, start with [docs/aw-ecc-proof-surface.md](./docs/aw-ecc-proof-surface.md).

That guide shows:

- which `.aw_docs` artifacts each stage should leave behind
- which eval and confidence docs back the workflow
- which three demo paths are the fastest way to show feature flow, repair-loop behavior, and ship readiness

## How it works

```text
aw-ecc (this repo)  = the engine  - ECC baseline + AW SDLC routing + GHL platform integration
platform/           = the brain   - GHL domain knowledge (NestJS, Vue, HighRise, multi-tenancy, events)
aw init             = the glue    - shallow-clone aw-ecc -> run installer -> aw link for platform/
```

When a developer runs `aw init`, the CLI:

1. Pulls `platform/` and team namespace content
2. Shallow-clones this repo at a pinned tag
3. Runs `scripts/install-apply.js --target cursor --profile full` for the current bundled Cursor path
4. Cleans up the clone
5. Symlinks platform content into the active editor workspace

Result: the workspace gets the repo-local AW command surface plus linked GHL platform content.

## AW Stage Model

The default AW delivery flow is:

- `/aw:plan` -> define the approved technical path
- `/aw:build` -> implement approved work in thin, reversible slices
- `/aw:test` -> prove the requested QA scope with fresh evidence
- `/aw:review` -> findings, governance, and readiness decisions
- `/aw:deploy` -> perform one release action
- `/aw:ship` -> launch, rollout, rollback readiness, and release closeout

There is also one conditional diagnostic route:

- `/aw:investigate` -> reproduce, localize, and confirm bugs or alerts before broad fixes

`/aw:investigate` is intentionally not part of every happy-path request.
Use it when the problem is real but the cause is still unclear, then return to `/aw:build`, `/aw:test`, or `/aw:review` as needed.

Compatibility entrypoints remain available during migration:

- `/aw:execute` -> `/aw:build`
- `/aw:verify` -> `/aw:test`, `/aw:review`, or the smallest correct combined verification flow

For explicit end-to-end automation, the repo uses the internal `aw-yolo` orchestration skill instead of overloading `ship`.
`aw-yolo` starts from the first unsatisfied stage and runs only the smallest correct remaining sequence.

For the smallest newcomer-friendly path through the repo, see [docs/aw-ecc-core-bundle.md](./docs/aw-ecc-core-bundle.md).

If you need a slimmer setup today, run the installer directly with a smaller profile instead of relying on the bundled `aw init` default.

## What changed from upstream ECC

| Change | Scope |
|--------|-------|
| AW SDLC public-stage routing (`/aw:plan`, `/aw:build`, `/aw:test`, `/aw:review`, `/aw:deploy`, `/aw:ship`, plus conditional `/aw:investigate`) | commands, skills, defaults, docs |
| Compatibility routing for legacy `/aw:execute` and `/aw:verify` entrypoints | commands, skills, router docs |
| GHL baseline operating standards for review, QA, frontend quality, governance, and rollout safety | defaults, references, stage skills |
| Repo-local staging and verification confidence artifacts | docs, defaults, evals |
| Rebrand and package metadata | package.json, README.md |

The repo still tracks upstream ECC, but it now carries meaningful repo-local AW SDLC behavior on top of the upstream baseline.

## GHL Platform Integration

Each stage skill should also activate the matching GHL platform skill family by task domain:

- backend and worker code -> `platform-services:*`
- frontend and design-system work -> `platform-frontend:*` plus `platform-design:*`
- data and migrations -> `platform-data:*`
- infra and deployment -> `platform-infra:*`
- test and quality systems -> `platform-sdet:*`
- review depth -> `platform-review:*`

The namespace families let the model auto-discover GHL platform skills without hardcoding every individual name.
After the primary AW stage is selected, `using-platform-skills` should choose the smallest supporting platform stack.

## Org Standards

AW stages should inherit org standards directly from the GHL baseline profiles and platform playbooks, not from ad hoc prompt prose.

That means:

- frontend work inherits HighRise, design review, accessibility review, and responsive verification expectations
- test and review inherit platform quality gates, PR governance, and repo-specific validation expectations
- deploy and ship inherit rollback planning, staging evidence, and launch-safety expectations

## Testing And Benchmarking

The testing stack is documented in four places:

- [docs/aw-testing-strategy.md](./docs/aw-testing-strategy.md) for the high-level structure
- [tests/evals/README.md](./tests/evals/README.md) for the eval directory layout
- [docs/aw-addy-validation-matrix.md](./docs/aw-addy-validation-matrix.md) for capability-layer coverage
- [docs/aw-archetype-scenario-matrix.md](./docs/aw-archetype-scenario-matrix.md) for repo-archetype scenarios
- [docs/aw-product-scenario-matrix.md](./docs/aw-product-scenario-matrix.md) for GHL product scenarios
- [docs/aw-revex-history-benchmark.md](./docs/aw-revex-history-benchmark.md) for real git-history reconstruction benchmarks
- [docs/aw-eval-benchmark-scorecard.md](./docs/aw-eval-benchmark-scorecard.md) for benchmark targets and current routing measurements

Use this mental model when reading the eval docs:

- `deterministic/` = contract checks
- `routing/` = routing checks
- `outcomes/` = outcome checks

## Upstream sync

This is a fork of [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code). To merge upstream changes:

```bash
git remote add upstream https://github.com/affaan-m/everything-claude-code.git
git fetch upstream
git merge upstream/main
# Resolve conflicts in the repo-local AW SDLC command, skill, and doc layers
git tag v1.x.0
```

## Important

If you have `everything-claude-code` installed as a Claude Code plugin, remove it before using `aw-ecc`.
Running both can duplicate skills, commands, and routing instructions in the IDE context.

## License

MIT — same as upstream ECC.
