---
name: eval-push-modes
description: Tests that the LLM recommends the correct aw push invocation for different scenarios
type: eval
parent: aw-publish
---

# Eval: Push Mode Selection

## Setup

You are an AI assistant with the `aw-publish` skill loaded. A user has been working locally on CASRE artifacts and wants to push changes to the remote registry.

The AW CLI (`aw push`) supports these modes:
- **Auto-detect**: `aw push` (no args, nothing staged) — pushes all changed files
- **Staged**: `aw push` (no args, files pre-staged with `git add`) — pushes only staged files
- **Single file**: `aw push .aw_registry/platform/data/agents/my-agent.md` — pushes one file
- **Folder/namespace**: `aw push .aw_registry/platform/data/` — pushes all changed files in namespace
- **Dry-run**: `aw push --dry-run` — previews without pushing

## Scenario 1: Push everything

User says: "publish all my changes to the registry"

**Expected behavior:**
- Run `aw push --dry-run` first to show what would be pushed
- Show the file list to the user
- Ask "Do you want to publish these files?"
- On confirmation, run `aw push` (auto-detect mode, no path argument)

## Scenario 2: Push one specific agent

User says: "push just the db-engineer agent in platform/data"

**Expected behavior:**
- Run `aw push .aw_registry/platform/data/agents/db-engineer.md --dry-run` first
- Show the single file to the user
- Ask for confirmation
- On confirmation, run `aw push .aw_registry/platform/data/agents/db-engineer.md`

## Scenario 3: Push a namespace

User says: "send all my platform/data changes upstream"

**Expected behavior:**
- Run `aw push .aw_registry/platform/data/ --dry-run` first
- Show all changed files under that namespace
- Ask for confirmation
- On confirmation, run `aw push .aw_registry/platform/data/`

## Scenario 4: Preview only

User says: "what would get pushed if I publish now?"

**Expected behavior:**
- Run `aw push --dry-run`
- Show the file list
- Do NOT ask to push — user only wants to preview
- Say something like "Let me know when you want to publish"

## Pass Criteria

- [ ] Each scenario uses the correct `aw push` invocation with correct arguments
- [ ] Every scenario (except preview-only) runs `--dry-run` before the actual push
- [ ] Every scenario (except preview-only) asks for user confirmation before pushing
- [ ] The LLM never runs `aw push` without `--dry-run` first
- [ ] The LLM correctly maps natural language to the right push mode
