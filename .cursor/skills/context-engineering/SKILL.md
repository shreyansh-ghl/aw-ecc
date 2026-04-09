---
name: context-engineering
description: Curates the right task context at the right time. Use when starting work, switching tasks, debugging context drift, or when output quality drops because the agent is missing or overloaded with information.
origin: ECC
---

# Context Engineering

## Overview

Better context beats louder instructions.
This skill keeps the active context focused, ordered, and scoped to the current decision so the agent follows the right rules without drowning in irrelevant files.

## When to Use

- starting a new feature, bug, or review pass
- switching from one subsystem or stage to another
- output quality degrades or the agent starts ignoring conventions
- the repo is large and only a small part is relevant
- multiple possible standards or artifacts could apply

**When NOT to use**

- the task is tiny and already has a clear, narrow input set

## Workflow

1. Establish the context hierarchy.
   Load in this order:
   - repo rules and stage contracts
   - approved planning artifacts or stage outputs
   - org standards, baseline profiles, and `.aw_rules`
   - relevant source files and diffs
   - runtime evidence, logs, test output, screenshots
   - conversation history
2. Pack only what the current stage needs.
   Planning needs specs and boundaries.
   Build needs concrete file scope and validation targets.
   Review needs evidence first.
   Investigation needs failure signals first.
3. Remove context that no longer serves the current task.
   Old branches of thought, unrelated files, and stale runtime output are noise once the decision moves on.
4. Repack at stage transitions.
   A good context pack for `plan` is not the same as one for `build`, `test`, or `review`.
5. Detect drift early.
   If the agent starts guessing, inventing APIs, or broadening scope, stop and rebuild the context pack instead of pushing forward with bad state.
6. Record the current anchors.
   Name the source-of-truth files and evidence the current work depends on.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just load everything." | Too much context reduces focus and increases wrong pattern matching. |
| "Conversation history is enough." | History is the weakest context layer when repo rules or artifacts disagree. |
| "The agent should infer the convention." | If the convention matters, load it explicitly. |
| "I can keep the same context pack across all stages." | Different stages need different information density and order. |

## Red Flags

- the agent cites stale artifacts after the stage changed
- unrelated files keep reappearing in reasoning or edits
- errors are discussed without the exact failing output loaded
- repo rules are overridden by conversation memory

## Verification

After repacking context, confirm:

- [ ] the highest-priority rules are loaded first
- [ ] only stage-relevant files and evidence are active
- [ ] stale or contradictory context was removed or named
- [ ] the source-of-truth inputs are explicit
- [ ] the agent can explain the current task using the packed context only
