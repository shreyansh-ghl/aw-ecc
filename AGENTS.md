# aw-ecc Repo Instructions

Do not use this repo as the source of truth for AW SDLC routing or stage behavior.
As of `1.4.67-beta.0`, aw-ecc intentionally no longer ships AW SDLC commands or skills.
Use the AW registry in platform docs and the `ghl-agentic-workspace` integration layer for active SDLC behavior.

## Catalog Snapshot

Catalog snapshot: providing 28 specialized agents, 145 skills, 58 commands for the remaining ECC-compatible runtime surface.

agents/ - 28 specialized subagents
skills/ - 145 workflow skills and domain knowledge
commands/ - 58 slash commands

## Public Surface

Do not add or restore AW SDLC public commands or skills in this repo.
The deleted surface includes `/aw:plan`, `/aw:build`, `/aw:investigate`, `/aw:test`, `/aw:review`, `/aw:deploy`, `/aw:ship`, `/aw:execute`, `/aw:verify`, and their stage/helper skills.

Registry tooling such as `aw-adk` and `aw-publish` can remain here because it is not the SDLC stage surface.

## Migration Note

This repo intentionally retired the repo-local AW SDLC contract.
If you were relying on the removed baseline guidance, use platform docs / AW registry content instead.

Treat this as a deprecation boundary.
Do not recreate deleted SDLC files in aw-ecc as compatibility shims.

## Routing

- Do not route through deleted repo-local `skills/using-aw-skills/SKILL.md`.
- Do not add local `/aw:*` command aliases in `commands/`.
- For active AW routing behavior, consume the platform registry.

## Activation Rule

Before changing this repo, confirm whether the work belongs in aw-ecc or in the AW registry.
New SDLC behavior belongs outside aw-ecc.

## Fast Path

Keep aw-ecc changes focused on package runtime, installer behavior, hooks, agents, non-SDLC skills, non-SDLC commands, rules, and metadata.

## Artifact Contract

The deleted AW stage artifact contract belongs to the AW registry, not this repo.

## Org Standards

Relevant GHL baseline profiles, platform playbooks, and `.aw_rules` remain active in the platform registry and linked workspaces.

## Guardrails

- never reintroduce AW SDLC commands or skills into aw-ecc
- keep installer manifests free of `aw-stages`
- keep package catalog counts aligned with actual files
