---
name: eval-score-accuracy
target: skill/aw-adk
category: behavioral
difficulty: intermediate
---

# Eval: Score Accuracy — Deliberately Minimal Agent Gets Low Score

## Task

Test that the ADK's scoring is calibrated — a deliberately minimal agent (missing most sections) should receive a D-Tier score, not be generously graded. This targets the self-scoring bias where the LLM creates an artifact and then scores it high.

### Prompt

```
Score this agent: .aw/.aw_registry/revex/reselling/backend/agents/stub-agent.md
```

### Setup (pre-condition)

Create a minimal stub agent before running the eval:

```markdown
---
name: stub-agent
description: "Does stuff"
tools: [Read]
---

# Stub Agent

This agent helps with things.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `revex/reselling` |
| **Domain** | `backend` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `agent` |

## Expected Outcomes

- [ ] **ADK reads rubric-agent.md** before scoring
- [ ] **Score table has 10 dimensions** — not a summary number
- [ ] **Total score is D-Tier (below 40)** — the stub agent is missing: identity section, core mission, critical rules, process, deliverables, communication style, success metrics, model field, category field, squad field
- [ ] **Missing dimensions identified** — the score output names specific gaps (not "looks good overall")
- [ ] **No inflation** — scores for missing sections are 0, not 3-5 "because the section could be implied"
- [ ] **Improvement suggestions provided** — concrete next steps to raise the score

## Grading Criteria

### PASS

- Total score is D-Tier (0-39)
- At least 6 dimensions scored 0 (missing entirely)
- Missing sections explicitly named

### PARTIAL

- Total score is C-Tier (40-59) — some inflation but identifies gaps
- OR correct D-Tier but fewer than 6 zero-scored dimensions

### FAIL

- Total score is B-Tier or above (60+) — severe inflation
- OR no per-dimension breakdown (just a summary score)
- OR does not read the rubric before scoring

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Verify the score output contains a table with 10 rows
# (model-based check needed to parse the actual scores)
```

### Model-Based Checks

- Is the total score below 40?
- Are missing sections scored 0 (not given partial credit)?
- Did the executor read rubric-agent.md before scoring?
- Are improvement suggestions specific (not "add more content")?

## Baseline Expectations

- Without ADK: Model says "looks good, 7/10" with no rubric reference.
- With ADK: Calibrated score using rubric-agent.md, D-Tier for stub, specific gaps identified.
- **Expected delta:** 30+ point difference in score accuracy
