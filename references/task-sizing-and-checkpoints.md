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
- verification checkpoint: evidence and findings are explicit
- release checkpoint: provider, rollback, and risks are clear

## Split When

- a task spans multiple subsystems
- the validation plan is vague
- rollback would be unclear
- the reviewer would have to reverse-engineer the intent
