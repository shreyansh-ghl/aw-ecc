# aw-ecc

**GoHighLevel Agentic Workspace Engine** — forked from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code).

## What is this?

`aw-ecc` is GoHighLevel's private fork of ECC. It keeps the upstream ECC engine, general command library, hooks, agents, rules, and non-SDLC skills used by GoHighLevel workflows.

As of `1.4.67-beta.0`, AW SDLC commands and skills are intentionally no longer shipped from this repo. The active AW SDLC surface now lives in the AW registry maintained by platform docs and consumed by `ghl-agentic-workspace`.

The current catalog exposed by this repo is:

- 28 agents
- 145 skills
- 58 commands

## Quick Start Snapshot

Installing `aw-ecc` gives your workspace access to 28 agents, 145 skills, and 58 commands through the remaining ECC-compatible command, hook, agent, rule, and skill layers.

| Surface | Availability |
| --- | --- |
| Agents | ✅ 28 agents |
| Skills | ✅ 145 skills |
| Commands | ✅ 58 commands |

These catalog counts are validated in CI so the published docs stay aligned with the repo contents.

## How it works

```text
aw-ecc (this repo)  = the engine  - ECC baseline + non-SDLC commands/skills/hooks/agents/rules
platform/           = the brain   - GHL domain knowledge and AW SDLC registry content
aw init             = the glue    - shallow-clone aw-ecc -> run installer -> aw link for platform/
```

When a developer runs `aw init`, the CLI:

1. Pulls `platform/` and team namespace content
2. Shallow-clones this repo at a pinned tag
3. Runs `scripts/install-apply.js --target cursor --profile full`
4. Cleans up the clone
5. Symlinks platform content into the active editor workspace

Result: the workspace gets the remaining ECC-compatible runtime assets from this repo plus linked GHL platform/AW registry content.

## AW SDLC Surface

AW SDLC is retired from `aw-ecc`.
Do not add or restore repo-local stage commands such as `/aw:plan`, `/aw:build`, `/aw:test`, `/aw:review`, `/aw:deploy`, `/aw:ship`, `/aw:investigate`, or compatibility aliases such as `/aw:execute` and `/aw:verify`.

The active AW SDLC skills and slash access come from the AW registry, not from this package.
Use platform-docs as the registry source and `ghl-agentic-workspace` as the consumer/integration layer.

For the smallest newcomer-friendly path through the repo, see [docs/aw-ecc-core-bundle.md](./docs/aw-ecc-core-bundle.md).

## What changed from upstream ECC

| Change | Scope |
|--------|-------|
| AW SDLC commands and skills removed from aw-ecc | commands, skills, manifests, evals |
| AW registry remains the active SDLC source | platform-docs, ghl-agentic-workspace |
| GHL baseline operating standards remain available outside this retired SDLC surface | platform registry, linked workspace content |
| Rebrand and package metadata | package.json, README.md |

The repo still tracks upstream ECC, but it no longer carries repo-local AW SDLC behavior on top of the upstream baseline.

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
