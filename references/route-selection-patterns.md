# Route Selection Patterns

Use alongside `using-aw-skills`.

## Routing Priority

1. explicit user instructions
2. explicit public AW commands and their mapped primary stage skills
3. process skills that determine how the work should be approached
4. the smallest correct primary stage skill and matching public route
5. domain and craft skills that improve the selected stage
6. explicit composite workflows only when the user clearly asks for them

## Default Flow Versus Conditional Flow

- default delivery flow: `/aw:plan -> /aw:build -> /aw:test -> /aw:review -> /aw:deploy -> /aw:ship`
- conditional diagnostic route: `/aw:investigate`
- internal end-to-end path: `aw-yolo`

Do not insert `/aw:investigate` into a normal happy-path request unless diagnosis is actually required first.
Do not insert `aw-yolo` unless the user explicitly wants one-run orchestration.
When `aw-yolo` is selected, start from the first unsatisfied stage, not automatically from `/aw:plan`.

## Route Map

- use `/aw:plan` for PRDs, design planning, architecture, specs, and execution breakdown
- use `/aw:build` for approved implementation work, approved fixes, config work, and approved docs/config updates
- use `/aw:investigate` for runtime bugs, alerts, regressions, and unclear failure modes
- use `/aw:test` for QA scope, regression proof, browser proof, and fresh behavior evidence
- use `/aw:review` for findings, governance, readiness, standards compliance, and release recommendation
- use `/aw:deploy` for one release action such as PR creation, branch handoff, or environment deploy
- use `/aw:ship` for rollout planning, rollback readiness, monitoring, and release closeout

## Compatibility Rules

- preserve `/aw:execute` when the user explicitly asks for it, but map it to the `build` stage under the hood
- preserve `/aw:verify` when the user explicitly asks for it, but map it to `test`, `review`, or the smallest correct combined verification flow
- keep compatibility entrypoints out of the canonical stage list in docs and routing explanations

## Scope Guardrails

- a code request should not silently reopen planning
- a design request should not silently turn into coding
- a deploy request should not silently reopen build or plan
- a test or review request should not silently implement code
- a planning request should not force a PRD when the request is already technical and well-defined

## Stop Signals

- the request mixes delivery and diagnosis but root cause is still unclear
- the user asks for a release action without proof or review evidence
- the task appears to need multiple stages, but the user did not ask for end-to-end execution
- the route choice depends on assumptions that change safety or scope
