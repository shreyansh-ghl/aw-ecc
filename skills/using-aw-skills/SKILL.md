---
name: using-aw-skills
description: Session-start skill-first routing for the AW SDLC surface. Select route, read the stage skill, then respond.
trigger: Every session start. Hook-capable harnesses load this via the global AW install when configured; the local Codex launcher is the fallback.
---

# Using AW Skills

This skill defines the public AW SDLC interface and how requests should be routed.

## Hard Gate (MUST)

For every non-trivial request, execute in order:

1. **Select route** using the decision tree below.
2. **Read the stage skill** — you MUST read the matching `<route>/SKILL.md` before responding.
3. **Follow the skill's behavior** — produce the artifacts the skill defines, not general-knowledge answers.
4. **Then respond** — only after steps 1-3.

Stating a route without reading the skill file is NOT compliance.

## Route Decision Tree

```text
Does an approved plan/spec already exist for this exact work?
├── NO → Is the request about a bug, alert, or unclear failure?
│         ├── YES → /aw:investigate
│         └── NO  → /aw:plan  ← DEFAULT for anything new
└── YES → Is the work implemented and needs testing/review?
          ├── YES → /aw:test or /aw:review
          └── NO  → Is this a deploy or release action?
                    ├── YES → /aw:deploy or /aw:ship
                    └── NO  → /aw:build
```

**Plan-first rule**: New endpoints, services, schemas, features, architecture changes, and integrations ALL go through `/aw:plan` first. `/aw:build` requires an approved plan or a mechanical change (bug fix, rename, config update).

## Public Surface

The public surface stays intentionally small:

- `/aw:plan`
- `/aw:build` (compatibility: `/aw:execute`)
- `/aw:investigate`
- `/aw:test` (compatibility: `/aw:verify`)
- `/aw:review`
- `/aw:deploy`

Users should not be required to remember commands.
When the request is clear, route by intent automatically and keep the scope narrow.

There is also one explicit power command:

- `/aw:ship`

`/aw:ship` is for clearly end-to-end requests.
It should not become the default route for normal stage-specific work.

## Codex Startup

Codex in this repo should use the global AW install first.
The primary Codex startup layer is `~/.codex/`, not repo-local hook files.

Treat this skill as already loaded and active:

- apply this router before any substantive response
- do not explore first and route second
- make the selected AW skill stack explicit before deeper work
- use `scripts/start-codex-aw.sh` when available, but do not require it in order to obey this skill

Observed on April 2, 2026:

- direct root hook output includes `# AW Session Context`
- repeated `codex exec` probes returned mixed `YES` and `NO` results for the exact `# AW Session Context` marker

So for Codex, treat the global install as primary, keep the launcher as the explicit fallback, and avoid depending on repo-local hook stamping.

Codex session-start output for this skill must stay concise and routing-oriented:

- declare that `using-aw-skills` is active
- expose the small AW public surface and intent mapping
- prefer native prompt and skill discovery for the rest
- do not scan the full registry at startup
- do not inline the full `SKILL.md` body into startup context

## Harness Behavior

Treat this router as always-on everywhere, but use the strongest startup layer the harness supports:

- Claude and other hook-capable plugin harnesses -> load the global plugin/home install
- Cursor native agent / headless -> load the global `~/.cursor/hooks.json`
- Cursor plugin -> load `hooks/hooks-cursor.json`
- Codex -> load the global `~/.codex/` install
- Cursor repo usage without plugin install -> use `.cursor/rules/aw-sdlc-router.mdc`

Only hook-capable harnesses literally execute the shell hook.
In Codex, "always-on" means:

- use the hook when the current mode actually injects it
- otherwise rely on the local launcher fallback

## Always-On Activation

Before any substantive response, this router must select the smallest correct AW skill stack and matching public route.

- explicit user command -> honor that command and load the mapped AW stage skill first
- clear process need -> load the needed internal process skill first
- otherwise choose the smallest correct AW primary stage skill and matching public route by intent
- only after the required AW skills are selected, load deeper domain skills or ask clarifying questions

Do not start with generic implementation, review, or deploy advice before skill selection.
Do not leave the active skill stack or matching route implicit for non-trivial work.

## The Rule

If there is even a small chance that an AW process skill, stage skill, or required domain skill applies, load it before responding.

Questions count.
Clarifying questions count.
Quick exploration counts.

The AW public command is the user-facing projection of the selected primary stage skill.
That means AW remains command-simple for users while staying skill-first internally.

## Red Flags

These thoughts mean stop and load the right AW skill stack first:

| Thought | Reality |
|---|---|
| "I can answer this quickly first" | Quick answers still need the right AW skill context. |
| "I just need to explore a little" | Exploration is work. Load the right process or stage skill first. |
| "This is just a clarifying question" | Clarifying questions still happen after skill selection. |
| "I know which route this is" | Knowing the route is not the same as loading the right skill stack. |
| "The internal helper is overkill" | If the helper applies, use it. |

## Routing Priority

1. Explicit user instructions
2. Explicit public AW commands and their mapped primary stage skills
3. Process skills that determine how the work should be approached
4. Primary stage skill and matching minimal public command surface
5. Domain skills needed to do the selected work well
6. Explicit composite workflows when the user clearly asks for an end-to-end flow

## Skill Priority

When multiple AW skills could apply, use this order:

1. process skills first:
   - `aw-brainstorm`
   - `aw-debug`
   - `aw-review`
   - `aw-prepare`
2. primary stage skill second:
   - `aw-plan`
   - `aw-execute`
   - `aw-verify`
   - `aw-deploy`
   - `aw-ship`
3. domain skills third:
   - backend, frontend, data, infra, review, and test capability families

The selected public route should reflect the primary stage skill, not hide it.

If the user includes an explicit public AW command prefix such as `/aw:plan`, `/aw:execute`, `/aw:verify`, `/aw:deploy`, or `/aw:ship`, keep that public command unless the request is malformed.
Do not reinterpret an explicit `/aw:ship` request as `/aw:plan` just because the natural-language wording mentions planning or starting from an idea.

## Public Command Roles

| Command | Role | Primary outcomes |
|---|---|---|
| `/aw:plan` | Create the minimum correct planning artifacts | `prd.md`, `design.md`, `designs/`, `spec.md`, `tasks.md`, `state.json` |
| `/aw:execute` | Implement approved work without reopening planning | `execution.md`, `state.json`, code/docs/config/infra changes |
| `/aw:verify` | Produce evidence, review findings, governance checks, and release readiness | `verification.md`, `state.json` |
| `/aw:deploy` | Create the release outcome for verified work | `release.md`, `state.json`, PR/branch/deploy evidence |

## Intent Routing

Default to one primary route.
Only expand into multi-stage flow when the user explicitly asks for end-to-end work.

### Route to `/aw:plan`

Use when the request is about:

- PRD creation
- design planning
- technical specs
- architecture
- implementation task breakdown
- getting work to build-ready state

Examples:

- "Create a PRD for contact sync."
- "Design the onboarding flow."
- "Create the implementation spec."
- "Break this into execution tasks."

Internal planning should then use the smallest correct graph:

- `aw-brainstorm` for fuzzy or overscoped requests
- `aw-spec` for the technical contract
- `aw-tasks` for execution-ready `tasks.md`

### Route to `/aw:execute`

Use when the request is about:

- implementing approved work
- coding a bug fix
- applying infra or config changes
- writing docs from approved scope
- continuing partially implemented work

Examples:

- "Implement the approved worker spec."
- "Fix this retry bug."
- "Apply the staging config changes."

### Route to `/aw:verify`

Use when the request is about:

- review
- validation
- readiness
- testing and evidence
- PR checklist/governance
- platform docs or `.aw_rules` compliance

Examples:

- "Review and validate this implementation."
- "Is this ready for staging?"
- "Check this PR against the guidelines."

### Route to `/aw:deploy`

Use when the request is about a single release outcome, such as:

- creating a PR
- branch handoff
- staging deployment
- production deployment

Examples:

- "Create a PR for this verified work."
- "Deploy this verified worker to staging."
- "Deploy this verified Communities feed MFA to staging."
- "Deploy this verified microservice change to staging."

If the user asks for more than one release outcome in sequence, such as PR creation followed by staging deployment, prefer `/aw:ship` instead of `/aw:deploy`.

### Route to `/aw:ship`

Use only when the user clearly wants an end-to-end flow in one go, or when the user asks for multiple release outcomes in sequence.

Treat `ship` as a first-class public route name, not as an unnamed composite label.
If the request includes both PR creation and staging deployment for the same change, always choose `/aw:ship` rather than `/aw:plan` or `/aw:deploy`, even when the prompt is phrased as "take this change through ..." instead of "ship this".

Examples:

- "Take this from idea to ship."
- "Do the whole flow."
- "Build this end to end."
- "Ship this from approved spec to staging."
- "Take this change through PR creation and staging version deployment."
- "Take this Communities moderation API change through PR creation and staging version deployment."
- "Create the PR and then deploy it to staging."

## Scope Guardrails

- A direct code request should not drift into design or product work.
- A design request should not drift into coding.
- A deploy request should not reopen planning.
- A verify request should not silently implement code.
- A technical planning request must not force a PRD first when the request is already well defined.
- Do not produce a substantive non-routing response before the AW skill stack is selected.
- Do not skip repo-local AW routing because a parent workspace or global registry also has instructions.

## Internal Helpers

The public interface stays minimal even if internal helpers are still present.

- `aw:brainstorm` may be used internally for discovery-heavy ideation only
- `aw:finish` is legacy compatibility only and should not be advertised as a public stage
- `aw:code-review` is a compatibility alias under `/aw:verify`
- `aw:tdd` is a compatibility alias under `/aw:execute`
- `aw:ship` is the explicit composite workflow when a single end-to-end command is desired
- `aw-yolo` is an internal power workflow for autonomous execution without confirmation prompts — never advertise as a public stage

## Domain Skills

After choosing the primary stage skill and public route, load the relevant domain skills for the actual work:

- backend and worker code -> `platform-services:*`
- frontend and design-system work -> `platform-frontend:*`, `platform-design:*`
- data and migrations -> `platform-data:*`
- infra and deployment -> `platform-infra:*`
- test and quality systems -> `platform-sdet:*`
- review depth -> `platform-review:*`

Platform skill family selection is delegated to `using-platform-skills`.
Load `using-platform-skills` whenever GHL-domain context is needed alongside the primary stage skill.

## Cross-Cutting Engineering Skills

Load these skills across stages wherever the context applies:

- `incremental-implementation` — delivery strategy and reversible slices
- `context-engineering` — prompt shaping and context window management
- `frontend-ui-engineering` — frontend quality and component patterns
- `idea-refine` — early-stage exploration and idea sharpening
- `api-and-interface-design` — interface contracts and API design
- `browser-testing-with-devtools` — browser-level testing and debugging
- `git-workflow-and-versioning` — branching, commits, and versioning
- `ci-cd-and-automation` — pipeline setup and build automation
- `deprecation-and-migration` — staged deprecation and migration patterns
- `documentation-and-adrs` — documentation strategy and architectural decision records

## Rules Always Active

Relevant `.aw_rules` and platform docs remain active regardless of which public command is selected.

Use them as constraints and source of truth, not as a reason to broaden scope.

## References

Shared context files loaded on demand:

- [context-loading-and-intake](../../references/context-loading-and-intake.md)
- [route-selection-patterns](../../references/route-selection-patterns.md)
- [domain-skill-loading](../../references/domain-skill-loading.md)
