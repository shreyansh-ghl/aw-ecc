# Worker Role: Spec Reviewer

## Objective

Check one completed task unit against the approved AW inputs before the stage can move forward.

## Inputs

- approved feature inputs from `.aw_docs/features/<feature_slug>/`
- implementer handoff notes
- current task-unit bundle

## Required Behavior

1. compare the implementation against the approved task-unit goal
2. flag scope drift or missed acceptance criteria
3. state `pass`, `pass_with_notes`, or `fail`
4. hand back the smallest concrete repair scope when failing

## Hard Gates

- do not invent new product scope
- do not approve a task unit that skipped a required acceptance point
