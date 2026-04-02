# aw-ecc

**GoHighLevel Agentic Workspace Engine** — forked from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code).

## What is this?

`aw-ecc` is GoHighLevel's private fork of ECC. It keeps the upstream ECC engine, then layers in AW SDLC routing, GHL platform integration, repo-local defaults, and eval coverage for GoHighLevel workflows. The current catalog exposed by this repo is 28 agents, 139 skills, and 65 commands.

## Quick Start Snapshot

Installing `aw-ecc` gives your workspace access to 28 agents, 139 skills, and 65 commands.

| Surface | Availability |
| --- | --- |
| Agents | ✅ 28 agents |
| Skills | ✅ 139 skills |
| Commands | ✅ 65 commands |

These catalog counts are validated in CI so the published docs stay aligned with the repo contents.

## How it works

```
aw-ecc (this repo)  = the engine  — ECC baseline + AW SDLC routing + GHL platform integration
platform/           = the brain   — GHL domain knowledge (NestJS, Vue, Highrise, multi-tenancy, events)
aw init             = the glue    — shallow-clone aw-ecc → run installer → aw link for platform/
```

When a developer runs `aw init`, the CLI:

1. Pulls platform/ and team namespace content (existing)
2. Shallow-clones this repo at a pinned tag
3. Runs `scripts/install-apply.js --target cursor --profile full`
4. Cleans up the clone
5. Symlinks platform/ content into `.cursor/`

Result: `.cursor/` has 46 agents, 218 skills, 60 commands — all discoverable by the IDE.

## What changed from upstream ECC

| Change | Scope |
|--------|-------|
| AW SDLC public-stage routing (`/aw:plan`, `/aw:execute`, `/aw:verify`, `/aw:deploy`, `/aw:ship`) | commands, skills, defaults, docs |
| GHL platform integration guidance for command routing | command contracts + router skill |
| Repo-local staging and verification confidence artifacts | docs, defaults, evals |
| Rebrand and package metadata | package.json, README.md |

The repo still tracks upstream ECC, but it now carries meaningful repo-local AW SDLC behavior on top of the upstream baseline.

### GHL Platform Integration (appended to commands)

Each tweaked command gets a section like:

```markdown
---

## GHL Platform Integration

Also activate the matching platform agent by task domain:

- Backend/services → `platform-services-*`
- Data layer → `platform-data-*`
- Infra/deploy → `platform-infra-*`

For ALL activated agents: read frontmatter → load each skill from `skills:` array.
```

The namespace wildcards (`platform-services-*`, `platform-frontend-*`, etc.) let the model auto-discover GHL platform agents without hardcoding names.

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

If you have `everything-claude-code` installed as a Claude Code plugin, **remove it** before using aw-ecc. Running both can duplicate skills, commands, and routing instructions in the IDE context.

## License

MIT — same as upstream ECC.
