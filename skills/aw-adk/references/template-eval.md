# Eval Template

Copy the scaffold below as your starting point. Replace all `<placeholder>` tokens.

---

## Scaffold

````markdown
---
name: eval-<eval-slug>
target: <parent-artifact-name>
category: <functional | structural | behavioral | integration>
difficulty: <basic | intermediate | advanced>
---

# Eval: <Eval Display Name>

## Task

<2-4 sentences describing what the model should do when given this eval's prompt.
Be specific about the scenario, inputs, and expected workflow. This is the "user request"
that the executor receives.>

### Prompt

```
<The exact prompt to give the executor. This must be realistic — something a real user
would actually ask. Include enough context for the executor to act without follow-up questions.>
```

## Context

| Field | Value |
|-------|-------|
| **Namespace** | `<namespace where the parent artifact lives>` |
| **Domain** | `<domain: backend, frontend, data, infra, etc.>` |
| **Target artifact** | `<path to the artifact being tested>` |
| **Target type** | `<command \| agent \| skill \| rule \| eval>` |
| **Related work** | `<links to related artifacts, PRs, or docs>` |

## Expected Outcomes

The executor's output must satisfy ALL of the following:

- [ ] <Outcome 1 — specific, verifiable assertion about the output>
- [ ] <Outcome 2 — structural check: "file exists at X", "section Y is present">
- [ ] <Outcome 3 — content check: "contains at least N items", "references skill Z">
- [ ] <Outcome 4 — quality check: "examples are concrete, not placeholder">
- [ ] <Outcome 5 — negative check: "does NOT contain X" or "does NOT skip Y">

### Assertion Quality Criteria

Each assertion above must be:
- **Verifiable** — A grader can determine pass/fail from the output alone
- **Discriminating** — A clearly wrong output would fail this assertion
- **Stable** — Minor formatting changes don't cause false failures

## Grading Criteria

### PASS (all conditions met)

- All expected outcomes checked
- Output is production-ready (not placeholder/stub content)
- No critical errors in execution

### PARTIAL (some conditions met)

- <N>+ of <M> expected outcomes met
- Output has correct structure but thin content
- OR output has rich content but wrong structure

### FAIL (below threshold)

- Fewer than <N> expected outcomes met
- Output is structurally wrong (missing required sections, wrong artifact type)
- OR executor failed to complete the task

## Evaluation Method

**Type:** <deterministic | model-based | hybrid>

### Deterministic Checks

<Checks that can be performed by a script — file existence, section headers,
frontmatter fields, naming patterns.>

```bash
# Example: verify file exists and has required sections
test -f "<expected-path>" || echo "FAIL: file not found"
grep -q "## Core Mission" "<expected-path>" || echo "FAIL: missing Core Mission"
```

### Model-Based Checks

<Checks that require judgment — content quality, example relevance, reasoning depth.
These are evaluated by the grader agent.>

- Does the output explain WHY, not just WHAT?
- Are examples concrete and domain-specific (not generic foo/bar)?
- Would a domain expert find the content useful?

## Variants (optional)

<Alternative scenarios that test the same artifact from different angles.>

| Variant | Difference | Tests |
|---------|------------|-------|
| `eval-<slug>-minimal` | Minimal input, no context | Handles missing info gracefully |
| `eval-<slug>-complex` | Multi-step request with constraints | Handles complexity without losing accuracy |
| `eval-<slug>-adversarial` | Intentionally ambiguous or misleading input | Doesn't hallucinate or guess |

## Baseline Expectations

<What should happen when the executor runs WITHOUT the target artifact loaded.
This establishes the value-add of the artifact.>

- Without artifact: <expected behavior — generic output, missed requirements, etc.>
- With artifact: <expected behavior — specific, structured, complete output>
- **Expected delta:** <quantified improvement, e.g., "+40% pass rate">
````

---

## Section-by-Section Guide

### Frontmatter

- `name` — Always prefixed with `eval-`. Lives in the colocated `evals/` directory of the parent artifact.
- `target` — The artifact this eval tests. Must reference an existing artifact.
- `category` — What aspect is being tested:
  - `functional` — Does the artifact produce correct output?
  - `structural` — Does the output have the right shape?
  - `behavioral` — Does the artifact handle edge cases correctly?
  - `integration` — Does the artifact work with other artifacts?
- `difficulty` — Affects grading tolerance. Basic evals expect straightforward success. Advanced evals allow more nuanced partial results.

### Task & Prompt

The prompt is the most critical field. It must be:
1. **Realistic** — something a real user would type
2. **Self-contained** — the executor shouldn't need to ask follow-up questions
3. **Unambiguous** — one clear correct interpretation

Bad prompts produce unreliable evals. If the eval flakes, the prompt is usually the problem.

### Expected Outcomes

Four or more assertions, each independently verifiable. Mix structural checks (file exists, section present) with content checks (examples are concrete, references are valid) and at least one negative check (does NOT contain placeholder text).

Weak assertions that pass for both good and bad output provide false confidence. Each assertion should discriminate: a clearly wrong output must fail it.

### Grading Criteria

Three tiers with clear thresholds. PASS/PARTIAL/FAIL must be unambiguous — the grader should not need judgment to classify a result into a tier. Use specific counts ("4+ of 5 outcomes") rather than vague language ("most outcomes").

### Evaluation Method

Three options:
- **Deterministic** — Script-based checks only. Fast, reliable, but can't assess quality.
- **Model-based** — Grader agent evaluates. Can assess quality, but slower and potentially inconsistent.
- **Hybrid** — Deterministic for structure, model-based for content. Best of both worlds. Recommended default.

### Baseline Expectations

The with/without comparison is how you measure the artifact's value-add. Without a baseline, you can't distinguish "the artifact helped" from "the model would have done this anyway." Always specify expected delta.

## Anti-Patterns

| Pattern | Problem | Fix |
|---|---|---|
| Assertions that always pass | False confidence — bad output also passes | Test assertions against a known-bad output |
| Ambiguous prompt | Eval flakes — different runs interpret differently | Make prompt self-contained with concrete details |
| No negative assertions | Doesn't catch hallucination or extra content | Add "does NOT contain" checks |
| No baseline expectation | Can't measure artifact value-add | Specify without-artifact behavior |
| Only structural checks | Correct shape with garbage content passes | Add content quality assertions |
