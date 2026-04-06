---
name: git-workflow-and-versioning
description: Keeps work reviewable, reversible, and well-scoped. Use for any code change that needs branches, save points, commit hygiene, or parallel work isolation.
origin: ECC
---

# Git Workflow and Versioning

## Overview

Git is the safety system for fast-moving engineering work.
Treat branches as sandboxes, commits as save points, and history as operational documentation for humans, reviewers, and future agents.

## When to Use

- making any code, config, docs, or migration change
- deciding branch or worktree strategy
- choosing commit boundaries
- preparing changes for review or rollback
- organizing parallel agent or multi-slice work

**When NOT to use**

- only when no repository-backed change is being made at all

## Workflow

1. Start from the smallest isolated workspace that fits the change.
   Prefer short-lived feature branches.
   For parallel work or risky experiments, use worktrees instead of branch thrash.
2. Size the work before committing.
   Break the change into logical slices that can be explained, reviewed, and reverted independently.
   Use `references/git-save-points.md` when save-point discipline matters.
3. Commit each successful increment.
   The pattern is:
   implement slice -> verify slice -> commit slice.
   Do not wait for one giant final commit.
4. Keep concerns separate.
   Avoid mixing formatting, refactors, dependency churn, and feature behavior in the same commit unless they are inseparable.
   Reviewable history is part of engineering quality.
5. Run pre-commit hygiene.
   Check the staged diff, run the smallest relevant validation, and verify secrets or generated junk are not being committed.
6. Leave a scope map for the next human or agent.
   Name:
   - what changed
   - what did not change
   - what still needs follow-up
   In AW flows, keep this aligned with the stage artifacts and change summaries.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll clean up the history later." | Messy history is harder to split and explain after the fact. |
| "One big commit is faster." | Giant commits are slower to review, debug, and revert. |
| "This cleanup can ride along with the feature." | Mixed concerns make scope, blame, and rollback harder. |
| "I don't need an isolated branch for a small change." | Isolation is cheap; accidental overlap is expensive. |

## Red Flags

- one commit mixes unrelated concerns
- the diff is too large to explain in one sentence
- no save point exists between meaningful slices
- generated output, secrets, or local-only noise are staged
- branch or worktree discipline is vague during multi-agent work

## Verification

After using git workflow discipline, confirm:

- [ ] the work is isolated in the right branch or worktree
- [ ] commit boundaries match real progress
- [ ] staged content excludes secrets and unrelated noise
- [ ] the history is reviewable and reversible
- [ ] the change summary makes scope boundaries explicit
