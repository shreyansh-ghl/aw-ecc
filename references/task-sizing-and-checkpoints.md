# Task Sizing And Checkpoints

Use alongside `aw-plan`.

## Good Task Size

- one meaningful behavior or contract change
- clear file scope
- one obvious validation step
- independently reviewable

## Checkpoints

- discovery checkpoint: enough context to stop guessing
- implementation checkpoint: slice is thin and build-ready
- parallelization checkpoint: disjoint write scope, clear ownership, and a bounded worker cap are explicit before fan-out
- save-point checkpoint: the slice ends in a commit; if it cannot, it should usually be merged into the next dependent slice before build starts
- verification checkpoint: evidence and findings are explicit
- release checkpoint: provider, rollback, and risks are clear

## Split When

- a task spans multiple subsystems
- the validation plan is vague
- rollback would be unclear
- the reviewer would have to reverse-engineer the intent
