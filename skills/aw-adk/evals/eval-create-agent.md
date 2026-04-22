---
name: eval-create-agent
target: skill/aw-adk
category: functional
difficulty: intermediate
---

# Eval: Create Agent — Phantom Dependency Detection

## Task

Test that the ADK creates an agent with valid skill references (no phantom dependencies) and follows the full create flow. This eval specifically targets the phantom skill problem — agents listing skills in `skills:` frontmatter that don't exist in the registry.

### Prompt

```
Create an agent for payments processing in the revex/reselling namespace, under the backend domain. It should validate payment webhook signatures, reconcile transaction records against Stripe events, and flag discrepancies. Tools needed: Read, Bash, Grep, Glob. Model: sonnet. No existing skills to reference — use skills: [].
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `revex/reselling` |
| **Domain** | `backend` |
| **Target artifact** | `skills/aw-adk/SKILL.md` |
| **Target type** | `agent` |

## Expected Outcomes

- [ ] **Type classified correctly** — identified as `agent`
- [ ] **Interview conducted** — asked about agent's purpose, tools needed, model, skills
- [ ] **Path resolved** — target at `.aw/.aw_registry/revex/reselling/<domain>/agents/payments-processor.md` (domain may vary)
- [ ] **Agent created** with frontmatter: `name`, `description`, `tools`, `model`, `category`, `squad`, `skills`
- [ ] **No phantom skills** — every entry in `skills:` frontmatter either exists in the registry OR `skills: []` is used
- [ ] **Identity section present** — agent has a clear identity/mission section
- [ ] **CHECKPOINT output shown** — remaining steps printed before continuing
- [ ] **Lint ran and passed** — `lint-artifact.sh` executed, no phantom_skill errors
- [ ] **Scoring performed** — rubric-agent.md read, 10-dimension score table output
- [ ] **2+ evals created** — colocated at `agents/evals/<slug>/eval-*.md`
- [ ] **Evals derive from agent structure** — at least one eval exercises the agent's specific domain (payments), not generic checks
- [ ] **`aw link` ran**

## Grading Criteria

### PASS (all conditions met)

- All 12 outcomes checked
- Zero phantom dependencies
- Agent content is payments-domain-specific

### PARTIAL (8+ of 12)

- Agent created correctly but some flow steps skipped
- OR agent has phantom skills but lint caught them

### FAIL (below 8)

- Phantom skills in `skills:` frontmatter that lint didn't catch
- Steps 5-14 skipped
- Wrong type classification

## Evaluation Method

**Type:** hybrid

### Deterministic Checks

```bash
# Run lint — will catch phantom skills
bash ~/.aw-ecc/skills/aw-adk/scripts/lint-artifact.sh "<agent-path>" agent

# Verify frontmatter fields
grep -q "^name:" "<agent-path>" || echo "FAIL: missing name"
grep -q "^tools:" "<agent-path>" || echo "FAIL: missing tools"
grep -q "^model:" "<agent-path>" || echo "FAIL: missing model"
grep -q "^skills:" "<agent-path>" || echo "FAIL: missing skills field"
```

### Model-Based Checks

- Are skill references valid (either empty or pointing to real skills)?
- Is the agent's identity specific to payments processing?
- Did the executor show the CHECKPOINT step?

## Baseline Expectations

- Without ADK: Agent created with phantom skill references, no lint validation, no evals.
- With ADK: Phantom-free agent, lint-validated, scored, with colocated evals.
- **Expected delta:** zero phantom dependencies vs. 2-3 phantoms without ADK
