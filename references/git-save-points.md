# Git Save Points

Use alongside `aw-build`.

## Rules

- save points should match real progress
- keep commit scope aligned with the reviewed slice
- separate repair commits from opportunistic cleanup
- record what you intentionally did not touch when the nearby code is noisy
- meaningful completed slices must create a save point
- if a proposed slice cannot produce a clean save point, planning should merge it into the next dependent slice instead of treating "no commit" as normal

## Evidence

- preferred: commit SHA and commit message for the save point
- expected default: one or more recorded save-point commits that match meaningful completed slices

## Parallel Work

- use disjoint write scopes
- prefer worktrees or isolated branches when flows are long-lived
- do not let two workers edit the same risky file set without coordination
