---
name: push-modes
description: Quick reference card for all aw push and aw push-rules modes
---

# Push Modes — Quick Reference

## Registry Artifacts (`aw push`)

| Mode | Command | When |
|---|---|---|
| Auto-detect | `aw push` | Push all changed files |
| Staged | `aw push` (after `git add`) | Push only staged files |
| Single file | `aw push .aw_registry/<path>` | Push one artifact |
| Namespace | `aw push .aw_registry/<ns>/` | Push all changes in namespace |
| Dry-run | `aw push --dry-run` | Preview without pushing |

## Platform Rules (`aw push-rules`)

| Mode | Command | When |
|---|---|---|
| Full sync | `aw push-rules` | Push all rules |
| Dry-run | `aw push-rules --dry-run` | Preview without pushing |
| Custom repo | `aw push-rules --repo org/repo` | Push to non-default registry |

## Decision Cheat Sheet

```
Want to push...
├── agents/skills/commands/evals/references → aw push
├── platform rules (.aw_rules/)            → aw push-rules
├── both                                   → aw push, then aw push-rules (separate PRs)
└── just preview                           → add --dry-run to either command
```

## Confirmation Gate Reminder

Always: dry-run → show user → ask → push. Never skip.
