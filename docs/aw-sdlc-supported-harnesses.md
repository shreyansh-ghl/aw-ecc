# AW SDLC Supported Harnesses

## Purpose

This document defines the portable install and runtime expectations for AW SDLC across supported agent harnesses.

AW SDLC is a workflow contract pack.
It owns:

- the public stage surface
- stage-to-skill routing
- deterministic artifact expectations
- verify and deploy governance defaults

The harness owns:

- tool execution
- sandbox and approval behavior
- browser or web access
- background workers or remote sandboxes

## Required Public Surface

Every supported harness install must preserve these commands as the canonical public entrypoints:

- `/aw:plan`
- `/aw:execute`
- `/aw:verify`
- `/aw:deploy`
- `/aw:ship`

Internal helpers such as `aw-brainstorm`, `aw-prepare`, `aw-review-loop`, `aw-systematic-debugging`, and `aw-finish` may exist, but they must not become new public stages.

## Support Matrix

| Harness | Status | Minimum install shape | Required smoke checks |
|---|---|---|---|
| `Codex` | first-class | repo-local `commands/`, `skills/`, `defaults/`, and `docs/` available in the working repo | session start resolves to repo-local `using-aw-skills`; `/aw:plan` and `/aw:verify` route correctly |
| `Claude Code` | supported | repo-local command and skill pack mapped into the workspace plus session-start routing | public stage routing preserved; verify and deploy artifacts remain deterministic |
| `Cursor` | supported | project-level prompts or rules map intent to the AW public stage surface | explicit stage prompts stay thinner than the underlying workflow implementation |
| `OpenCode` | supported | repo-local stage docs and skills loaded as the control-plane layer | the harness executes tools, while AW SDLC keeps stage and artifact ownership |

## Harness Install References

This repo should keep a concrete install reference for each supported harness:

- `AGENTS.md`
- `.codex/INSTALL.md`
- `.claude/INSTALL.md`
- `.cursor/INSTALL.md`
- `.opencode/INSTALL.md`

## Portable Install Checklist

For any harness, an install is acceptable only if all of the following are true:

1. the repo-local router prefers the AW SDLC copy before any global fallback
2. the minimal public surface remains unchanged
3. deterministic artifacts still live under `.aw_docs/features/<feature_slug>/`
4. verify and deploy keep their governance split
5. internal helpers stay internal
6. smoke prompts can prove routing without machine-specific absolute paths

## Codex Reference Install

Codex is the reference harness for this repo.
The install should make these repo-local paths available as the control-plane source of truth:

- `AGENTS.md`
- `commands/`
- `skills/`
- `defaults/aw-sdlc/`
- `docs/aw-sdlc-command-contracts.md`
- `docs/aw-sdlc-command-skill-architecture.md`

The session-start hook must prefer:

- `skills/using-aw-skills/SKILL.md`

before any external `.aw_registry` fallback is considered.

## Smoke Checklist

The minimum portable smoke pass should verify:

1. a planning request routes to `/aw:plan`
2. an implementation request routes to `/aw:execute`
3. a review request routes to `/aw:verify`
4. a release request routes to `/aw:deploy`
5. a composite ship request routes to `/aw:ship`
6. the resolved stage skill matches the expected public stage

## Non-Goals

This support matrix does not promise identical harness UX.

Parity means:

- the same AW SDLC contract
- the same public stages
- the same artifact and governance model

It does not require every harness to expose the same approvals UI, background runtime, or slash-command syntax.
