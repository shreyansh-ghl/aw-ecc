---
name: aw-spec
description: Internal spec helper that turns an approved direction into a deterministic technical spec without writing implementation tasks or code.
trigger: Internal only. Invoked by aw-plan after discovery is approved or when a technical contract must be written before task planning.
---

# AW Spec

## Overview

`aw-spec` owns the technical contract layer inside AW planning.
It turns an approved direction into `.aw_docs/features/<feature_slug>/spec.md` without collapsing directly into implementation tasks or code.

The public planning route remains `/aw:plan`.

## When to Use

- discovery or planning has already approved the direction
- the request needs a technical contract before task breakdown
- an existing spec is vague, incomplete, or inconsistent
- the work spans interfaces, file boundaries, rollout concerns, or migration risk

Do not use when execution-ready tasks already exist or when the request is still fundamentally a product or design question.

## Workflow

This legacy heading maps to the gated workflow below.

## The Gated Workflow

1. Enter technical planning mode.
   Read the approved direction, relevant code paths, and the smallest set of architecture context needed.
   Perform an explicit architecture review before freezing the technical path.
   Do not write code while authoring the spec.
2. Check the scope shape.
   If the request spans multiple independent subsystems, decompose it before writing one giant spec.
3. Define the stable contract.
   Name interfaces, boundaries, file responsibilities, assumptions, constraints, rollout constraints, and failure modes.
   Record non-goals, compatibility rules, and operator-facing observability or debugging constraints when they matter.
   Document the current state, alternatives considered, and the reason the chosen design wins.
   Use `../../references/interface-stability.md` when an API or contract is changing.
4. Write `spec.md` for a fresh planner or builder.
   Make it specific enough that `aw-tasks` can proceed without rediscovering the architecture or inventing missing contracts.
5. Run a fast review pass.
   Fix placeholders, contradictions, scope drift, ambiguous names, and missing assumption, testing, or rollout detail before handoff.
6. Update state and hand off.
   Update `.aw_docs/features/<feature_slug>/state.json` and hand the approved spec to `aw-tasks`.

## Required `spec.md` Content

Capture at least:

- implementation goal
- current state and existing patterns that the change should respect or replace
- scope and non-goals
- assumptions and constraints
- architecture or technical approach
- architecture rationale for non-obvious decisions
- decision and alternatives considered for major technical choices
- non-functional requirements when relevant: performance, security, scalability, availability
- interfaces, contracts, or integration points
- invariants and backward-compatibility rules when relevant
- component or data-flow responsibilities when they are non-trivial
- expected file or module map when it can be inferred safely
- failure modes and rollback constraints
- observability, debugging, or operator-facing constraints when relevant
- risks and mitigations when they materially affect implementation order
- testing strategy
- acceptance criteria
- verification targets
- operations and rollback verification when relevant
- ADR-needed decision when the change has durable architectural impact
- rollout, migration, or environment constraints when relevant

## Human HTML Companion

Markdown `spec.md` remains canonical for agents.
When `aw-spec` writes or materially updates `spec.md`, HTML sidecars are required in `dual` and `html` output modes, not advisory metadata. Use `platform-core:echo-direct` directly to generate or refresh `.aw_docs/features/<feature_slug>/spec.html` with the `technical-spec` profile.

Resolve docs output mode in this order: explicit user or session request, stage-local request, `.aw_docs/config.json` `docs.outputMode`, `AW_DOCS_OUTPUT_MODE`, then default `dual`.
- `dual` mode keeps Markdown canonical and requires the HTML companion.
- `html` mode requires the HTML companion and still preserves any canonical Markdown the stage must write.
- explicit Markdown-only mode skips HTML and records `status: skipped` with `skip_reason: explicit_markdown_only`.

Do not use a subagent for HTML generation, and do not hand-roll or command-template HTML outside `platform-core:echo-direct`. In `dual` or `html` mode, the stage is not complete until the skill has generated the sidecar or recorded a concrete blocker. In explicit Markdown-only mode, do not generate HTML.

Pass the problem statement, existing patterns, interfaces, decisions, risks, verification targets, and file scope as the source bundle.
Record `html_companion_artifacts` in `state.json` with `source_path`, `html_path`, profile, `status: generated` when successful, `owner: platform-core:echo-direct`, `execution_mode: skill`, `runner: platform-core:echo-direct`, publish status, remote links, and any explicit Markdown-only skip or blocked reason. Do not record successful skill output as `generated_fallback` or `generated_hca_fallback`; those are legacy statuses to repair.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The builder can figure the interfaces out." | Unstable interfaces are where rework and regressions start. |
| "This is only one feature, so one large spec is fine." | Mixed subsystems still need decomposition if the boundaries differ. |
| "I’ll leave the risky rollout details for later." | Migration and rollback constraints belong in the spec if they affect implementation. |

## Red Flags

- the spec says "update as needed" instead of naming boundaries
- file or module responsibility is still vague
- a major design choice has no alternatives or rationale recorded
- testing strategy is implied instead of stated
- rollout or migration constraints are implied instead of stated
- contradictory helper names, interface names, or paths appear across sections

## Verification

Before handoff, run this inline review:

1. spec coverage check against the approved direction
2. placeholder scan
3. internal consistency check (including naming)
4. scope check (including decomposition)
5. assumptions, constraints, and rollout completeness check
6. alternatives and decision-rationale check
7. testing and operations completeness check
8. ambiguity check
9. HTML companion file exists, or the user explicitly requested Markdown-only

Fix issues inline instead of carrying them into task planning.

## Hard Gates

- do not write implementation code
- do not jump directly to `/aw:build`
- do not create `tasks.md`
- do not leave contradictory interfaces, names, or file boundaries unresolved
- do not treat a multi-subsystem request as one spec when it should be decomposed

## Echo Direct Human Docs Handoff

After canonical Markdown and `state.json` are current, run `platform-core:echo-direct` for every required human companion in `dual` or `html` mode. Pass the feature slug, source paths, profile, output mode, colocated HTML path, state path, and publish intent. This same skill is also the repair path for existing folders with missing, stale, blocked, local-only, legacy uncontrolled fallback, unpublished, or linkless companions.

Do not duplicate docs publish commands or publish configuration in this stage. `platform-core:echo-direct` owns HTML generation, publish handoff, companion state updates, and returned TeamOfOne/GitHub links. Before the final response, inspect the skill result, feature `state.json`, and `.aw_docs/last-publish.json`. Add any returned or recorded `.html` links to the final `Remote Docs` section as visible absolute TeamOfOne URLs with compact clickable GitHub labels, not label-only text. Prefer `.html` companion links over `.md` links. A final handoff that lists only Markdown artifacts while `.html` remote links exist is incomplete. Each artifact must show `TeamOfOne: <absolute remote URL>` and `GitHub: [spec.html](<absolute repository URL>)` or another short artifact label when both URLs are available. Never hide the TeamOfOne URL behind Markdown-only links, never print long GitHub URLs inline when a compact label can point to the same URL, and never invent links. If publishing cannot run, record `publish_status: blocked` and the concrete blocker in `state.json`.

## Final Output Shape

Always end with:

- `Feature Slug`
- `Spec Path`
- `Scope Decision`
- `Architecture`
- `Decision & Alternatives`
- `Testing Strategy`
- `Assumptions & Constraints`
- `Acceptance Criteria`
- `HTML Companion`
- `Remote Docs`
- `Open Approval Needs`
- `Recommended Next`
