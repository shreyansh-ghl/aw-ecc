---
name: aw:adk
description: "Agent Development Kit — create, improve, fix, delete, score, comply, audit, or health-check any CASRE artifact (Command, Agent, Skill, Rule, Eval). Use /aw:adk to author registry content."
argument-hint: "[type] [mode] [target] — e.g., 'agent create', 'skill score my-skill', 'rule audit all', 'agent delete my-agent'"
status: active
stage: build
internal_skill: aw-adk
---

# ADK — Agent Development Kit

Use `/aw:adk` to author, score, fix, delete, or audit any artifact in the AW registry.

## Usage

```
/aw:adk                          → interactive: ask type, then mode
/aw:adk agent create             → create a new agent (guided)
/aw:adk skill improve my-skill   → enrich an existing skill
/aw:adk agent fix my-agent       → resolve lint failures
/aw:adk skill score my-skill     → score against rubric
/aw:adk rule audit all           → audit all rules
/aw:adk eval create my-agent     → create evals for existing agent
/aw:adk agent delete my-agent    → remove agent + evals + clean references
```

## Arguments

| Position | Values | Default |
|---|---|---|
| type | `command` · `agent` · `skill` · `rule` · `eval` | interactive (ask) |
| mode | `create` · `improve` · `fix` · `delete` · `score` · `comply` · `audit` · `health` | interactive (ask) |
| target | artifact name or `all` (for audit/health) | interactive (ask) |

## Execution

**Step 1: Read the skill file.** Open and read `~/.aw-ecc/skills/aw-adk/SKILL.md` before doing anything else. Do not skip this — the skill contains the full flow, templates, rubrics, and scripts. All reference files are relative to that skill directory.

**Step 2: Follow the create flow steps in order.** Every type (command, agent, skill, rule, eval) goes through the same pipeline. Here are the steps you must not skip:

1. CLASSIFY → 2. INTERVIEW → 3. RESOLVE PATH → 4. SCAFFOLD → 5. CHECKPOINT (output remaining steps to user) → 6. LINT → 7. SCORE → 8. EVAL GATE (2+ evals) → 9. TEST RUNS → 10. ITERATE → 11. DESCRIPTION OPT → 12. CROSS-IDE → 13. REGISTRY UPDATES → 14. SYNC

If you find yourself writing the artifact and then jumping to "done" — you skipped steps 5-14. Go back.

## When No Arguments

If invoked without arguments, ask the user:
1. What type of artifact? (with the quick classifier table from the skill)
2. What mode? (with brief descriptions of each)
3. What target? (name or path)

Then proceed with the skill's flow for that combination.
