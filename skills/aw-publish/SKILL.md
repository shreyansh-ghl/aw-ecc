---
name: aw-publish
description: "Registry publish skill — guides the LLM through pushing locally created/modified CASRE artifacts from .aw/.aw_registry/ and .aw/.aw_rules/ to the remote platform-docs registry via PR. Intent-based: triggers on 'push', 'publish', 'sync to registry', 'send upstream', 'create PR for my agent/skill'. Always confirms before pushing."
trigger: when the user wants to publish, push, or sync artifacts to the remote registry, or says /aw:publish
---

# Registry Publish

Push locally created or modified CASRE artifacts to the remote `platform-docs` registry via PR.

## When to Use

This skill activates when the user signals intent to publish **registry artifacts** — they do NOT need to type `/aw:publish`. Detect these signals:

- "push this agent/skill/command/rule to the registry"
- "publish my registry changes"
- "sync to platform-docs"
- "I'm done testing this agent/skill, send it upstream"
- "push just the rules"
- "what would get pushed to the registry?"
- "push everything in platform/data"
- Any mention of `aw push` or `aw push-rules`

## When NOT to Use (Important — Avoid False Positives)

This skill is ONLY for pushing `.aw_registry/` and `.aw_rules/` artifacts. Do NOT activate for:

- **Normal git push** — "push my branch", "push to origin" → that's regular git, not this skill
- **Code PRs** — "create a PR for my feature", "deploy to staging" → that's `/aw:deploy`
- **UI references** — "push this button to the left" → that's frontend/design work
- **General deploy** — "push to production" → that's `/aw:deploy` or `/aw:ship`

**The discriminator:** Is the user talking about `.aw_registry/` or `.aw_rules/` content (agents, skills, commands, rules, evals)? If yes → this skill. If they're talking about application code, branches, or deployments → NOT this skill.

## Confirmation Gate (MANDATORY)

**NEVER push without asking the user first.** This is the most important rule in this skill.

Every publish follows this exact flow:

1. **Detect intent** — user signals they want to publish
2. **Dry-run first** — run `aw push --dry-run` to show what would be pushed
3. **Show the user** — display the file list and modes clearly
4. **Ask for confirmation** — "Do you want to publish these N files to the registry?"
5. **User confirms** → run the actual `aw push` (without `--dry-run`)
6. **User declines** → stop, no push happens

```
# CORRECT flow
$ aw push --dry-run
# Shows: 3 files to push (2 agents, 1 skill)
"These 3 files would be pushed. Do you want to publish them?"
# User: "yes"
$ aw push

# WRONG — never do this
$ aw push    ← pushed without asking
```

### What This Skill Must NOT Do

- Never auto-publish after ADK create/improve/fix — publishing is a separate lifecycle moment
- Never push without showing the dry-run output first
- Never skip the confirmation question
- Never combine registry push and rules push in one action

## Three-Layer Architecture

```
┌─────────────────────────┐
│  Local Project (.aw/)   │  ← IDE symlinks point here
│  ~/.aw/.aw_registry/    │  ← actual files live here (global clone)
└────────────┬────────────┘
             │ aw push
             ▼
┌─────────────────────────┐
│  Remote Registry        │  ← GoHighLevel/platform-docs on GitHub
│  (via PR)               │
└─────────────────────────┘
```

`aw push` always operates from the **global clone** at `~/.aw/`. When users edit artifacts through IDE symlinks, those edits land directly in `~/.aw/.aw_registry/`. The push command reads from there.

## Decision Tree: Which Command?

```
What does the user want to push?
├── .aw_rules/ content (platform rules)
│   → aw push-rules
│   (separate PR, temp clone, full tree sync)
│
├── .aw_registry/ content (agents, skills, commands, evals, references)
│   → aw push [options]
│   (persistent global clone, individual file tracking)
│
└── Mixed (both rules and registry)
    → Run them separately:
      1. aw push        (registry artifacts)
      2. aw push-rules  (platform rules)
    aw push will warn: "Detected .aw_rules changes — push them separately with aw push-rules"
```

## Push Modes

### Mode 1: Auto-Detect (no arguments, nothing staged)

```bash
aw push
```

Detects all modified, untracked, and deleted files in `.aw_registry/`. Pushes everything that changed.

**When to suggest:** User says "push everything" or "publish my changes" without specifying files.

### Mode 2: Staged (no arguments, files pre-staged with git add)

```bash
# User has already run: git -C ~/.aw add .aw_registry/platform/data/agents/my-agent.md
aw push
```

Pushes only files that were `git add`-ed in the global clone. Behaves like `git commit` — staged files only.

**When to suggest:** User wants fine-grained control over exactly which files to include.

### Mode 3: Single File

```bash
aw push .aw_registry/platform/data/agents/my-agent.md
```

Pushes one specific artifact. Accepts both registry-relative and absolute paths.

**When to suggest:** User says "push just this agent" or names a specific artifact.

### Mode 4: Folder / Namespace

```bash
aw push .aw_registry/platform/data/
```

Pushes all changed files under that namespace/folder. Only includes files with actual changes (not the entire folder).

**When to suggest:** User says "push everything in platform/data" or names a namespace.

### Mode 5: Dry-Run

```bash
aw push --dry-run
aw push .aw_registry/platform/data/ --dry-run
```

Lists what would be pushed without making any changes. Works with all other modes.

**Always run this first** before the actual push (as part of the confirmation gate).

## Pushable Types

These artifact types can be pushed: `agents`, `skills`, `commands`, `evals`, `references`

## What Happens When You Push

1. **Branch creation** — auto-generated name: `upload/`, `remove/`, or `sync/` prefix + namespace + timestamp
2. **Commit** — structured message: `registry: add agents/my-agent to platform/data`
3. **CODEOWNERS** — for new namespaces, auto-appends ownership entry
4. **PR creation** — auto-generated title and body with tables listing all files
5. **Existing PR detection** — if a PR already exists on the branch, reuses it

### Deletion Handling

If you deleted a file locally and then push, the CLI detects it:
- Branch prefix becomes `remove/`
- PR body shows deleted files with ~~strikethrough~~
- The deletion propagates to the remote registry

### Branch Naming Convention

| Scenario | Branch name |
|---|---|
| All new/modified files | `upload/<namespace>-<type>-<slug>-<id>` |
| All deleted files | `remove/<namespace>-<type>-<slug>-<id>` |
| Mixed adds and deletes | `sync/<namespace>-<id>` |
| Multiple namespaces | `sync/batch-<id>` |
| No new changes, commits ahead | `sync/state-<id>` |

## Rules Push (`aw push-rules`)

Platform rules (`.aw_rules/`) use a **completely separate** push path:

```bash
aw push-rules              # push from cwd's .aw_rules/
aw push-rules --dry-run    # preview what would sync
aw push-rules --repo org/custom-registry  # override target repo
```

### How It Differs from `aw push`

| Aspect | `aw push` | `aw push-rules` |
|---|---|---|
| Source | `~/.aw/.aw_registry/` (global clone) | cwd's `.aw_rules/` (local) |
| Strategy | Individual file tracking | Full tree sync |
| Git approach | Persistent clone, stays on push branch | Temp clone, cleaned up after |
| PR scope | Per-file or per-namespace | Entire rules tree |

### Auto-Redirect

If you run `aw push .aw_rules/...`, it automatically redirects to `aw push-rules`. You don't need to remember which command to use for rules.

## Error Cases and Recovery

| Error | Cause | Recovery |
|---|---|---|
| "Registry not initialized" | `~/.aw` doesn't exist or isn't a valid clone | Run `aw init` first |
| "Could not resolve path" | Path doesn't point to `.aw_registry/` content | Use the `.aw_registry/` prefix path |
| "Nothing to push" | No modified/untracked/deleted files found | Edit a file first, then push |
| "Invalid push path" | Path doesn't contain a type directory (agents/, skills/, etc.) | Check path structure — must be under a pushable type |
| "Path not found" | File doesn't exist on disk | File may have been deleted — check with `aw status` |
| "Could not checkout main" | Git state issue in global clone | Check `~/.aw` git status manually |

### Tips for the LLM

- If the user gives a `.claude/` or `.cursor/` path, those are symlinks — convert to the `.aw_registry/` equivalent
- If `aw push` says "Nothing to push", suggest `aw status` to see what's changed
- If the user just created an artifact with ADK, remind them the file is in `~/.aw/.aw_registry/` and suggest checking with dry-run first
- Always suggest `--dry-run` for first-time pushers

## Complete Example Flows

### Flow 1: Push a newly created agent

```
User: "I'm happy with the agent, push it to the registry"

LLM: Let me check what would be pushed.
$ aw push --dry-run

Output: 1 file to push (1 agent)
  agents/my-new-agent [platform/review]

LLM: "This will push 1 agent (my-new-agent) to platform/review. Do you want to publish?"

User: "yes"

$ aw push
→ Branch created: upload/platform-review-agents-my-new-agent-abc12
→ PR opened: https://github.com/GoHighLevel/platform-docs/pull/123
```

### Flow 2: Push everything in a namespace

```
User: "send all my platform/data changes upstream"

LLM: Let me check what would be pushed from platform/data.
$ aw push .aw_registry/platform/data/ --dry-run

Output: 3 files to push (2 agents, 1 skill)
  agents/db-engineer [platform/data]
  agents/redis-reviewer [platform/data]
  skills/mongodb-patterns [platform/data]

LLM: "This will push 3 files from platform/data. Do you want to publish?"

User: "yes"

$ aw push .aw_registry/platform/data/
→ PR opened with all 3 files
```

### Flow 3: Push platform rules

```
User: "push the rules too"

LLM: Rules use a separate command. Let me check what would sync.
$ aw push-rules --dry-run

Output: Would push rules from .aw_rules/

LLM: "This will sync your entire .aw_rules/ tree to the registry in a separate PR. Do you want to publish?"

User: "go ahead"

$ aw push-rules
→ PR opened: sync/rules-abc12
```

### Flow 4: Dry-run only

```
User: "what would get pushed if I publish now?"

LLM: Let me check.
$ aw push --dry-run

Output: 5 files to push (3 agents, 1 skill, 1 command)
  ...

LLM: "You have 5 files ready to push. Let me know when you want to publish them."
```
