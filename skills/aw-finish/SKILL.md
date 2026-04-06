---
name: aw-finish
description: Internal compatibility helper for completing a verified development branch with explicit merge, PR, keep, or discard choices and safe worktree cleanup.
trigger: Internal only. Invoked when verified branch work is done and the next step is a branch-completion decision rather than a staging deployment.
---

# AW Finish

`aw-finish` is a legacy compatibility skill.
The canonical public release stage remains `/aw:deploy`, but this helper still owns the branch-completion decision flow when that workflow is needed internally.

## Hard Gate

`aw-test` and `aw-review` must have passed before this skill runs, or the compatibility umbrella must have recorded an equivalent verified outcome.
If verification failed, route back to `aw-build`, `aw-test`, or `aw-review` instead of finishing.

## Purpose

Use this skill to close out verified branch work safely:

- verify tests before offering completion choices
- present explicit branch-completion options
- execute the selected path
- clean up the worktree only when appropriate

If `.aw_docs/features/<feature_slug>/workspace.json` exists, use it as the source of truth for:

- the active branch and worktree path
- cleanup policy
- orchestration coordination directory
- the recommended `node scripts/orchestration-status.js ...` status command

Staging or production deployment requests should stay on `aw-deploy`.

## Deprecation Timeline

This skill is still active internally even though `/aw:finish` is deprecated as a public entrypoint.
Keep `aw-finish` available until `/aw:deploy` fully absorbs branch-completion choices, workspace metadata reuse, and cleanup behavior.
Public deprecation must not be interpreted as immediate removal of the internal helper.

## Completion Flow

1. verify tests and validation signals still pass
2. determine the base branch
3. present exactly these choices:
   - merge locally
   - push and create PR
   - keep as branch
   - discard
4. execute the selected path
5. clean up the worktree when the selected path requires cleanup
6. update or clear `workspace.json` to reflect the final cleanup decision

## Required Options

### Option 1: Merge Locally

- switch to base branch
- update from remote when appropriate
- merge the verified branch
- rerun the minimum correct verification
- remove the branch or worktree when safe
- clear `workspace.json` when cleanup completed successfully

### Option 2: Push and Create PR

- push the branch
- create or update the PR with concise summary and test plan
- keep the worktree if the branch remains active
- preserve `workspace.json` for the active branch lifecycle

### Option 3: Keep As-Is

- keep the branch and worktree intact
- report the branch name and next expected action
- keep `workspace.json` intact for follow-up work

### Option 4: Discard

- require explicit confirmation
- delete the branch or worktree only after confirmation
- remove `workspace.json` only after cleanup succeeds

## Worktree Cleanup Rule

Only clean up the worktree automatically for:

- merge-complete paths
- confirmed discard paths

Do not clean up the worktree for:

- keep-as-branch
- PR-open workflows where the branch is still in active use

## Hard Gates

- do not offer completion choices until tests are rechecked
- do not discard work without explicit confirmation
- do not turn branch completion into deployment orchestration
- do not clean up an active PR worktree by accident

## Final Output Shape

Always end with:

- `Verification Check`
- `Base Branch`
- `Completion Options`
- `Selected Path`
- `Cleanup Decision`
