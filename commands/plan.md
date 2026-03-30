---
name: aw:plan
description: Define the minimum correct planning artifacts for the request without drifting into execution.
argument-hint: "<goal, request, or existing artifact>"
status: active
stage: plan
internal_skill: aw-plan
---

# Plan

Use `/aw:plan` to decide what needs to be planned and to produce only the planning artifacts required for the request.

This is the public planning command.
It should stay narrow by default and should not write implementation code.

## Role

Turn an idea, requirement, approved design, or technical request into the minimum correct planning artifacts for execution.

## Modes

| Mode | Use when | Primary outputs |
|---|---|---|
| `product` | problem, scope, or acceptance criteria are unclear | `prd.md`, `state.json` |
| `design` | UX behavior or interface design must be defined | `design.md`, `designs/`, `state.json` |
| `technical` | implementation approach or architecture must be defined | `spec.md`, `state.json` |
| `tasks` | implementation work needs to be broken into steps | `tasks.md`, `state.json` |
| `full` | multiple planning artifacts are missing | missing artifacts in order, plus `state.json` |

## Required Inputs

- the user request
- repo context
- relevant platform docs
- relevant `.aw_rules`

## Optional Inputs

- existing `prd.md`
- existing `design.md`
- existing `designs/`
- existing `spec.md`
- existing `tasks.md`
- tickets, bug reports, screenshots, API contracts, or Figma links

## Outputs

- `.aw_docs/features/<feature_slug>/state.json`
- one or more of:
  - `prd.md`
  - `design.md`
  - `designs/`
  - `spec.md`
  - `tasks.md`

## Execution Rules

1. Classify the request into one primary mode first.
2. Default to single-scope planning.
3. Only expand to multiple artifacts if the user explicitly asks for them or a blocking prerequisite is missing.
4. Use existing artifacts as inputs when they are already sufficient.
5. Do not require a PRD for a technical request that is already well defined.

## Hard Gates

- do not write implementation code
- do not run deploy steps
- do not force unrelated artifacts
- do not invent product or design work for a technical-only request

## Must Not Do

- must not jump directly into `/aw:execute`
- must not create random artifact names
- must not silently broaden scope

## Recommended Next Commands

- `/aw:execute`
- `/aw:verify` if the user wants the planning artifacts reviewed before implementation

## Internal Routing

This command may still use internal helpers where useful, but the public contract remains `/aw:plan`.

- discovery-heavy ideation may use `aw:brainstorm` internally
- implementation planning should use `aw-plan`

## Final Output Shape

Always end with:

- `Route`
- `Created`
- `Summary`
- `Missing`
- `Next`
