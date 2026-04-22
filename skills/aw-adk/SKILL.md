---
name: aw-adk
description: "Agent Development Kit — create, improve, fix, score, comply, audit, and health-check any CASRE artifact (Command, Agent, Skill, Rule, Eval) in the AW registry. Use this skill whenever the user wants to author, scaffold, score, audit, improve, or fix registry artifacts. Also triggers on: 'ADK', 'developer kit', 'create an agent/skill/command/rule/eval', 'score my skill', 'audit all agents', 'make this better', 'fix lint errors'."
trigger: when the user says /aw:adk, asks to create/add/update/improve/fix/score/audit any CASRE artifact, or wants to author registry content
---

# Agent Development Kit (ADK)

Unified authoring tool for all AW registry artifacts. One entry point, five artifact types, seven modes.

## When to Use

- **Create**: User wants a new command, agent, skill, rule, or eval
- **Improve**: User wants to enrich an existing artifact (add examples, references, sections)
- **Fix**: User wants to resolve lint/rubric failures on an existing artifact
- **Score**: User wants to audit an artifact against its quality rubric
- **Comply**: User wants a compliance check against the spec
- **Audit**: User wants a batch score across all artifacts of a type
- **Health**: User wants a dashboard of success rates, failure clusters, pending fixes

## Type × Mode Matrix

```
/aw:adk [type] [mode] [target]

Types: command | agent | skill | rule | eval
Modes: create | improve | fix | score | comply | audit | health

Examples:
  /aw:adk                          → interactive: ask type, then mode
  /aw:adk agent create             → create a new agent (guided)
  /aw:adk skill improve my-skill   → enrich an existing skill
  /aw:adk agent fix my-agent       → resolve lint failures
  /aw:adk skill score my-skill     → score against rubric
  /aw:adk rule audit all           → audit all rules
  /aw:adk eval create my-agent     → create evals for existing agent
```

## CASRE Type Classifier

Before any work, classify what the user wants. Read [type-classifier.md](references/type-classifier.md) for the full decision tree.

**Quick classifier:**

| User wants... | Type | Why |
|---|---|---|
| Reusable domain knowledge, patterns, checklists | **Skill** | Static knowledge loaded on demand |
| A persona that makes decisions, has judgment, uses tools | **Agent** | Has identity, model tier, and skills |
| A multi-phase workflow orchestrating multiple agents | **Command** | Pipeline with phases and agent assignments |
| An enforceable standard with WRONG/RIGHT examples | **Rule** | Constraint with severity and automation path |
| Validation scenarios for an existing artifact | **Eval** | Tests that the artifact works correctly |

**Common misclassifications:**
- "Create a command for MongoDB best practices" → That's a **skill** (static knowledge)
- "Create a command that reviews security" → Likely a **skill** unless it's a multi-phase pipeline
- "Create a command that acts as a database expert" → That's an **agent** (persona)

If misclassified: explain WHY, suggest the correct type, offer to redirect.

## Create Flow

The create flow follows an eval-driven iteration loop modeled after skill-creator: draft → test → review → improve → repeat.

### Steps

1. **TYPE GATE** — classify using the decision tree above
2. **REQUIREMENTS INTERVIEW** — ask 3-5 type-specific questions (one at a time)
   - Read the type-specific section below for which questions to ask
3. **NAMESPACE RESOLUTION** — construct the exact target path
   - Read [registry-structure.md](references/registry-structure.md) for the path resolution decision tree
   - Walk the decision tree to produce the exact filesystem path (every combination resolves to exactly one path)
   - Example: platform + review domain + agent → `.aw/.aw_registry/platform/review/agents/<slug>.md`
4. **SCAFFOLD** — generate from template
   - Read the appropriate `references/template-<type>.md`
   - Consult `references/writing-good-<type>s.md` for quality guidance
   - To reference existing artifacts in the same domain, construct their path the same way (e.g., to see existing agents in platform/data: `ls .aw/.aw_registry/platform/data/agents/`). The registry structure is deterministic — use direct paths, not broad searches.
   - **No phantom dependencies.** Every name you put in frontmatter or body is a real pointer — if the target doesn't exist, the artifact breaks at runtime. Before finalizing any artifact, verify its dependencies actually exist. If something doesn't exist yet, either create it first or remove the reference.

     **Examples of what to check:**
     - Creating an **agent** with `skills: [revex-reselling-redis-patterns]` → run `ls .aw/.aw_registry/revex/reselling/skills/redis-patterns/SKILL.md`. If it doesn't exist, create the skill first or drop it from the list.
     - Creating a **command** with agents in the roster → you just created those agents, so they exist. But each agent may list skills in *its* `skills:` frontmatter — check those too. The chain is command → agents → skills, and every link must resolve.
     - Creating a **skill** that says "run `scripts/validate.sh`" → does `scripts/validate.sh` actually exist in the skill directory? Same for `references/` links in the body.
   - Follow the "explain the why" principle: explain reasoning, not just MUST/NEVER
5. **CHECKPOINT** — before moving on, output this for the user:
   > **Remaining steps for `<type>`:** LINT → SCORE (rubric-`<type>`.md) → EVALS (2+) → REGISTRY UPDATES → SYNC
   This applies to every type equally — commands, agents, skills, rules, and evals all go through lint, scoring, and eval creation. Rules are not simpler; they just have different checks.
6. **LINT** — validate the artifact
   - Run `bash skills/aw-adk/scripts/lint-artifact.sh <path> <type>`
7. **SCORE** — apply the rubric
   - Read the appropriate `references/rubric-<type>.md`
   - Score conservatively — when you created the artifact yourself, there's a natural bias toward generous scoring. If a section exists but is thin or uses placeholder content, score it lower (3-5) not full marks.
   - Must achieve B-Tier (60+) minimum for new artifacts
8. **EVAL GATE** — create 2+ colocated eval files
   - Read [eval-placement-guide.md](references/eval-placement-guide.md) for placement rules
   - Each eval must cover: happy path + at least one failure scenario
   - Include at least one eval that validates the dependency chain — e.g., "all agents in the command's roster exist and all skills in those agents' frontmatter resolve to real files." This catches phantom references before they reach production.
   - **Derive evals from the artifact's own structure, not just generic categories.** Look at what you built — phases, human checkpoints, agent roster, error paths — and create evals that exercise those specific mechanisms:
     - **Commands with human checkpoints:** create at least one eval per checkpoint covering both approve AND reject paths. Human gates are the highest-risk behavior — if they don't block, the command's safety guarantee is void.
     - **Commands with parallel agents:** create an eval where one agent fails while others pass — does the command handle mixed results correctly?
     - **Agents with skills:** create an eval that exercises the skill-loaded behavior vs. skill-missing fallback.
     - **Multi-phase commands:** ensure at least one eval tests a mid-pipeline failure (not just phase 1 or the final phase).
9. **TEST RUNS** — spawn subagents to validate
   - For each eval: spawn with-artifact + baseline subagents in parallel
   - Collect outputs to `<artifact>-workspace/iteration-<N>/`
   - Grade via `agents/grader.md` — read [schemas.md](references/schemas.md) for JSON structures
   - Aggregate via `scripts/aggregate-benchmark.py`
   - Launch `eval-viewer/generate_review.py` for human review
10. **ITERATION LOOP** — review → improve → re-test
   - Read feedback from `feedback.json`
   - Improve artifact based on weak dimensions
   - Re-run test prompts into `iteration-<N+1>/`
   - Repeat until: user satisfied, all feedback empty, or no meaningful progress
11. **DESCRIPTION OPTIMIZATION** — (skills and agents only, optional)
    - Generate 10 should-trigger + 10 should-not-trigger queries
    - User reviews via `assets/eval_review.html`
    - Run `scripts/trigger-eval.py` with train/test split
    - Apply best description to frontmatter
12. **CROSS-IDE EXPLANATION** — show where the artifact lands
    - Read [cross-ide-mapping.md](references/cross-ide-mapping.md)
13. **REGISTRY UPDATES** — mandatory bookkeeping, do not skip:
    - **If type is rule:** two updates are required — both mandatory:
      1. Add/update the entry in `.aw/.aw_rules/rule-manifest.json` (id, severity, domains, rule path, description, principle). Without this the rule is invisible to the enforcement system.
      2. Add a bullet point to `.aw/.aw_rules/platform/<domain>/AGENTS.md` in the appropriate section (Always, Never, or Prefer). This is the file the session-start hook reads at runtime — if the rule isn't listed here, it will never be enforced. Match the format of existing bullets: `- <rule description>. [MUST/SHOULD/MAY]` with a reference link at the bottom.
    - **If the artifact's namespace is not in `.aw/.aw_registry/.sync-config.json` `include` array:** add it. Without this, the creator won't receive future updates to the namespace they just created when teammates push to it.
14. **SYNC** — run the `aw link` CLI command (it's installed globally at `/opt/homebrew/bin/aw`) to propagate the new artifact to all IDE workspaces (.claude/, .cursor/, .codex/). This is mandatory after every create — do not skip, do not ask the user, just run it.

### Type-Specific Interview Questions

**Command:**
1. What workflow does this automate?
2. How many phases? What are they?
3. Which agents participate in each phase?
4. Where are human checkpoints needed?
5. What namespace? (platform or team)

**Agent:**
1. What domain does this agent cover?
2. What expertise and tools does it need?
3. What squad does it belong to?
4. What skills should it load?
5. What namespace?

**Skill:**
1. What domain knowledge does this teach?
2. When should this skill trigger? (3+ scenarios)
3. What namespace?
4. Does it need scripts or references?

**Rule:**
1. What does this rule prevent? What's the real-world consequence when it's violated?
2. What domain does it belong to? (backend, frontend, security, universal, data, infra, sdet, mobile, api-design or something different)
3. What severity? (MUST = blocks / SHOULD = warns / MAY = advisory)
4. Can you give a WRONG and RIGHT code example? (concrete, copy-pasteable — not pseudocode)
5. What file patterns trigger this rule? (e.g., `*.service.ts`, `*.worker.ts`)
6. Are there exceptions where the violation is acceptable? Document them.

Rules go through the same full flow as commands, agents and skills: SCAFFOLD → CHECKPOINT → LINT → SCORE (`rubric-rule.md`) → EVALS (2+) → REGISTRY UPDATES (manifest + AGENTS.md bullet) → SYNC. None of these steps are optional.

**Eval:**
1. Which parent artifact does this test?
2. What scenarios should it cover?
3. What grader type? (deterministic script / model-based / hybrid)

## Improve Flow

For enriching existing artifacts. Mirrors skill-creator's iteration pattern.

1. **LOCATE** — construct the artifact path from name + type + namespace using [registry-structure.md](references/registry-structure.md). For example, to find skill `my-skill` in platform/data: `.aw/.aw_registry/platform/data/skills/my-skill/SKILL.md`. If the name is ambiguous, `ls` the type directory to list candidates.
2. **SNAPSHOT** — copy current version to workspace (baseline for A/B comparison)
3. **SCORE** — apply type rubric, identify lowest-scoring dimensions
4. **CONSULT AUTHORING GUIDE** — read `references/writing-good-<type>s.md`
5. **ENRICH** — add missing sections, expand thin examples, add references
   - Follow "explain the why" principle throughout
   - Keep the prompt lean — remove what isn't pulling its weight
   - Generalize from feedback — don't overfit to specific examples
6. **RE-SCORE** — show before/after tier delta
7. **TEST RUNS** — run evals against improved version + snapshot baseline
   - Optionally use `agents/comparator.md` for blind A/B comparison
   - Use `agents/analyzer.md` to understand why one version scores higher
8. **ITERATE** — if user has feedback, improve and re-test
9. **DESCRIPTION OPTIMIZATION** — if skill/agent, optionally re-optimize trigger
10. **REGISTRY UPDATES** — if type is rule, update `rule-manifest.json`. If namespace changed, update `.sync-config.json`. Mandatory, do not skip.
11. **SYNC** — run the `aw link` CLI command (it's installed globally at `/opt/homebrew/bin/aw`) to propagate changes to all IDE workspaces. Mandatory — do not skip, do not ask the user, just run it.

## Fix Flow

For resolving lint and rubric failures on existing artifacts.

1. **LOCATE** — construct the artifact path using [registry-structure.md](references/registry-structure.md) (same as improve flow)
2. **LINT** — run `scripts/lint-artifact.sh` to identify all failures
3. **AUTO-FIX** — apply mechanical fixes (missing frontmatter fields, section stubs, name alignment)
4. **RE-LINT** — confirm all checks pass
5. **REPORT** — list what was fixed and any remaining manual items
6. **REGISTRY UPDATES** — if type is rule, update `rule-manifest.json`. Mandatory, do not skip.
7. **SYNC** — run the `aw link` CLI command (it's installed globally at `/opt/homebrew/bin/aw`) to propagate fixes to all IDE workspaces. Mandatory — do not skip, do not ask the user, just run it.

## Score Flow

1. Read the artifact completely
2. Read the appropriate `references/rubric-<type>.md`
3. Score each dimension 0-10
4. Calculate total, assign tier
5. List specific gaps and rewrite suggestions for lowest dimensions

## Comply Flow

Delegates to `skill-comply` for compliance checking against spec.

## Audit Flow

Batch score all artifacts of a type. Produces a portfolio report with:
- Per-artifact scores and tiers
- Average score by category
- Artifacts needing improvement (< 60)
- Reference artifacts (highest scores)

## Health Flow

Dashboard showing: success rates, failure clusters, pending fixes, score trends.

## Writing Philosophy

These principles shape every artifact the ADK produces. They come from skill-creator (75k+ forks) and are the reason its artifacts work at scale.

1. **Explain the why** — If you find yourself writing ALWAYS or NEVER in caps, stop. Explain the reasoning instead. LLMs are smart; give them understanding, not just compliance rules. A model that understands *why* will handle edge cases better than one following rigid directives.

2. **Keep it lean** — Remove instructions that aren't pulling their weight. Read test run transcripts: if the model wastes time on unproductive steps, trim the instructions causing it.

3. **Generalize from feedback** — When improving an artifact based on test results, don't overfit to the specific test cases. Think about the million future invocations. Fiddly, example-specific fixes produce brittle artifacts.

4. **Bundle repeated work** — If test runs consistently produce similar helper scripts or take the same multi-step approach, bundle that as a script in the artifact's `scripts/` directory.

5. **Theory of mind** — Write for the model's understanding. Use metaphors, explain context, describe the user's situation. Generic, narrow instructions produce generic, narrow results.

## Subagents

The ADK uses three subagents for eval-driven iteration (read before spawning):

- [agents/grader.md](agents/grader.md) — Evaluates assertions against outputs. Also critiques eval quality.
- [agents/comparator.md](agents/comparator.md) — Blind A/B comparison between artifact versions.
- [agents/analyzer.md](agents/analyzer.md) — Analyzes benchmark results, surfaces patterns aggregate stats hide.

## Scripts

Deterministic tooling for validation and benchmarking:

- `scripts/lint-artifact.sh <path> <type>` — Validates frontmatter, sections, naming, paths
- `scripts/score-artifact.sh <path> <type>` — Applies rubric, produces tier + scores (JSON)
- `scripts/aggregate-benchmark.py <workspace>/iteration-N --artifact-name <name>` — Aggregates eval results
- `scripts/trigger-eval.py --eval-set <path> --skill-path <path>` — Tests description triggering accuracy

## References

Deep content loaded on demand. Do NOT load all at once — read only what the current mode needs.

### Registry & Structure
- [registry-structure.md](references/registry-structure.md) — Namespace/domain/path resolution
- [cross-ide-mapping.md](references/cross-ide-mapping.md) — How artifacts appear in .claude/.cursor/.codex
- [type-classifier.md](references/type-classifier.md) — CASRE decision tree with examples
- [artifact-wiring.md](references/artifact-wiring.md) — How CASRE artifacts reference each other
- [eval-placement-guide.md](references/eval-placement-guide.md) — Colocated eval placement rules

### Quality Rubrics (one per type)
- [rubric-command.md](references/rubric-command.md) — 10 dimensions, /100
- [rubric-agent.md](references/rubric-agent.md) — 10 dimensions, /100
- [rubric-skill.md](references/rubric-skill.md) — 10 dimensions, /100
- [rubric-rule.md](references/rubric-rule.md) — 10 dimensions, /100
- [rubric-eval.md](references/rubric-eval.md) — 10 dimensions, /100
- [rubric-meta-eval.md](references/rubric-meta-eval.md) — 5 dimensions, /50

### Templates (one per type)
- [template-command.md](references/template-command.md)
- [template-agent.md](references/template-agent.md)
- [template-skill.md](references/template-skill.md)
- [template-rule.md](references/template-rule.md)
- [template-eval.md](references/template-eval.md)

### Authoring Guides (how to write good artifacts)
- [writing-good-skills.md](references/writing-good-skills.md)
- [writing-good-agents.md](references/writing-good-agents.md)
- [writing-good-commands.md](references/writing-good-commands.md)
- [writing-good-rules.md](references/writing-good-rules.md)
- [writing-good-evals.md](references/writing-good-evals.md)

### Meta
- [schemas.md](references/schemas.md) — JSON structures for evals, grading, benchmarks
- [external-resources.md](references/external-resources.md) — Curated external references
