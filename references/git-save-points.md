# Git Save Points

Use alongside `aw-build`.

## Rules

- save points should match real progress
- keep commit scope aligned with the reviewed slice
- separate repair commits from opportunistic cleanup
- record what you intentionally did not touch when the nearby code is noisy

## Parallel Work

- use disjoint write scopes
- prefer worktrees or isolated branches when flows are long-lived
- do not let two workers edit the same risky file set without coordination
