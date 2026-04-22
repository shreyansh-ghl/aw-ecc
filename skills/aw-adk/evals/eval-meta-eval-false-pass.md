---
name: eval-meta-eval-false-pass
target: skill/aw-adk
category: behavioral
difficulty: advanced
---

# Eval: Meta-Eval — False Pass Resistance

## Task

Test that evals created by the ADK can actually detect bad artifacts. The ADK creates an agent, then creates evals for it. Then a known-bad version of the agent (missing critical sections, wrong structure) is fed to those evals. The evals must FAIL the bad agent — not give it a false pass.

This is a meta-eval: it tests the quality of evals that the ADK produces, not the ADK's create flow itself.

### Prompt (two-step)

**Step 1:** Create an agent for log analysis in the platform/infra namespace.

**Step 2:** Take the evals that were just created. Run them against this known-bad agent:

```markdown
---
name: log-analyzer
description: "Analyzes logs"
---

# Log Analyzer
Looks at logs and finds problems.
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `platform/infra` |
| **Target artifact** | evals created by ADK in step 1 |
| **Target type** | `eval` (meta) |

## Expected Outcomes

- [ ] **Step 1 completes** — a well-structured agent is created with evals
- [ ] **Known-bad agent is structurally deficient** — missing: tools, model, category, squad, skills, identity section, core mission, critical rules, process, deliverables
- [ ] **Evals FAIL the known-bad agent** — at least 1 eval produces a FAIL verdict
- [ ] **Failure reasons are specific** — "missing Identity section" not just "low quality"
- [ ] **Evals don't false-pass** — a clearly deficient agent must not get PASS or even PARTIAL

## Grading Criteria

### PASS

- At least 1 eval FAILs the known-bad agent
- Failure reasons reference specific missing sections or frontmatter fields
- The well-structured agent from step 1 would PASS the same evals

### PARTIAL

- Evals give PARTIAL (not PASS) to the known-bad agent
- Some discrimination but not full rejection

### FAIL

- Evals PASS the known-bad agent (false pass)
- OR evals can't be run against the bad agent (no mechanism)
- OR evals only check surface features (file exists, has frontmatter) that the bad agent satisfies

## Evaluation Method

**Type:** model-based

### Model-Based Checks

- Do the evals contain assertions that the known-bad agent would fail?
- Are assertions specific enough to distinguish good from bad?
- Would substituting the bad agent into the eval's expected outcomes produce FAIL?

## Baseline Expectations

- Without ADK: Evals are always-pass stubs that accept any output.
- With ADK: Evals have discriminating assertions that catch missing sections and thin content.
- **Expected delta:** 80%+ false-pass detection rate with ADK evals
