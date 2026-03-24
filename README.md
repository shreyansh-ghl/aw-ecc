# aw-ecc

**GoHighLevel Agentic Workspace Engine** — forked from [Everything Claude Code](https://github.com/affaan-m/everything-claude-code).

## What is this?

`aw-ecc` is GoHighLevel's private fork of ECC. It ships all 60 commands, 28 agents, 125 skills, all rules, hooks, and MCP configs from upstream ECC — unchanged. The only additions are ~6 lines appended to 14 commands that activate GHL platform agents alongside ECC agents.

## How it works

```
aw-ecc (this repo)  = the engine  — ECC as-is + GHL platform integration on ~14 commands
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

| Change | Files | Lines |
|--------|-------|-------|
| GHL Platform Integration section appended | 14 command files | ~6 lines each |
| Rebrand | package.json, README.md | name + version |

Zero hooks added. Zero lines modified in ECC originals. All changes are additive appends.

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
# Resolve conflicts (only in ~14 command files — appended sections)
git tag v1.x.0
```

## Important

If you have `everything-claude-code` installed as a Claude Code plugin, **remove it** before using aw-ecc. This repo is a superset — same content plus GHL platform integration. Running both causes duplicate skills in the IDE context.

## License

MIT — same as upstream ECC.
