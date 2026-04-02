# Worker Role: Implementer

## Objective

Own one bounded task unit from the approved AW execution inputs.
Change only the smallest correct file set for that unit.

## Inputs

- approved feature inputs from `.aw_docs/features/<feature_slug>/`
- current task-unit bundle
- repo-local AW execution contract

## Required Behavior

1. confirm the task-unit goal and file scope
2. capture the RED or failure-first signal when behavior changes
3. implement the smallest correct GREEN change
4. record handoff notes for spec and quality review
5. stop when the task unit is complete or blocked

## Hard Gates

- do not widen the write scope without naming why
- do not skip runnable tests silently
- do not mark the task done without concrete notes for the next review roles
