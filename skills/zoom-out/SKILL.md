---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
disable-model-invocation: true
---

# Zoom Out

## When To Use

Use this when a file, module, or unfamiliar code area is too local to understand safely without first mapping the surrounding system.

## Workflow

I don't know this area of code well. Go up a layer of abstraction. Give me a map of all the relevant modules and callers, using the project's domain glossary vocabulary.

## Output

Return:

- the main modules involved
- how they call or depend on each other
- the domain terms that should be used consistently
- the safest local entry points for deeper inspection
