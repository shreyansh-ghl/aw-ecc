---
name: aw:publish
description: "Publish locally created/modified CASRE artifacts to the remote platform-docs registry via PR. Intent-based — triggers on 'push', 'publish', 'sync to registry', 'send upstream'. Always confirms before pushing."
argument-hint: "[path] [--dry-run] — e.g., '.aw_registry/platform/data/', '--dry-run', 'rules'"
status: active
stage: deploy
internal_skill: aw-publish
---

# Publish — Registry Push

Push local registry artifacts to the remote platform-docs registry via PR.

## Usage

```
/aw:publish                                    → auto-detect all changes, dry-run first
/aw:publish .aw_registry/platform/data/        → push changes in a namespace
/aw:publish .aw_registry/platform/data/agents/my-agent.md → push one file
/aw:publish --dry-run                          → preview only, no push
/aw:publish rules                              → push platform rules (.aw_rules/)
```

## Natural Language (no command needed)

You don't need to type `/aw:publish` — the LLM detects intent automatically when the context is about **registry artifacts** (.aw_registry/ or .aw_rules/):

- "push this agent to the registry"
- "publish my registry changes"
- "sync platform/data to platform-docs"
- "I'm done testing this skill, publish it"
- "what would get pushed to the registry?"
- "push the rules"

**Note:** Regular git push, code PRs, and deploys do NOT trigger this skill.

## Arguments

| Argument | Values | Default |
|---|---|---|
| path | `.aw_registry/...` path, namespace folder, or `rules` | auto-detect all changes |
| `--dry-run` | flag | off (but skill always does dry-run first as confirmation) |
| `--repo` | override target repository | `GoHighLevel/platform-docs` |

## Execution

**Step 1: Read the skill file.** Open and read `skills/aw-publish/SKILL.md` before doing anything else.

**Step 2: Follow the confirmation gate.** Every publish must:
1. Run `aw push --dry-run` to preview changes
2. Show the user what will be pushed
3. Ask "Do you want to publish?"
4. Only push after explicit user confirmation

**Step 3: Choose the right command.**
- Registry artifacts (agents, skills, commands, evals, references) → `aw push`
- Platform rules (.aw_rules/) → `aw push-rules`
- Never combine both in one action

## When No Arguments

If invoked without arguments:
1. Run `aw push --dry-run` to see all pending changes
2. If rules changes detected, mention them and suggest `aw push-rules` separately
3. Show the full list and ask for confirmation
