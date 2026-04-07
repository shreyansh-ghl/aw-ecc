# Build Increments

Use alongside `aw-build`.

## Thin Slice Rules

- one behavior change at a time
- one risky interface change at a time
- prefer additive changes over broad rewrites
- keep rollback obvious

## Good Increment Shape

- clear task goal
- bounded file scope
- concrete validation step
- safe stop point if the next slice slips

## Commit and Save-Point Guidance

- save points should match real progress
- do not mix unrelated cleanup into the same slice
- record what was intentionally not touched when adjacent code is risky or noisy
- for meaningful completed slices, create a save point before moving on
- if a slice cannot support a clean save point, merge it into the next dependent slice instead of normalizing a no-commit checkpoint
- parallel waves are allowed only for disjoint write scopes and should default to at most `3` active subagents unless the plan justifies another cap

## Red Flags

- large multi-system diff
- build slice cannot be validated independently
- rollback would require manual archaeology
