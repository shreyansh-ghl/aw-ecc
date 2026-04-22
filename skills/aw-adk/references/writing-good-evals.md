# Writing Good Evals

An eval measures whether an AI agent, skill, or command actually works. Good evals discriminate between correct and incorrect outputs. Bad evals pass for everything and give false confidence.

## Before / After: Eval Quality

### Bad — always-pass eval

```yaml
name: test-code-review
scenario: "Review a PR with a security vulnerability"
assertions:
  - "Output file exists"
  - "Output is not empty"
  - "Output contains the word 'review'"
```

Problems: This passes for *any* output that mentions "review." An agent that writes "This is a review. Everything looks great." passes despite missing the security vulnerability entirely. The eval has zero discriminating power.

### Good — discriminating eval

```yaml
name: test-code-review-detects-hardcoded-secret
scenario: "Review a PR that introduces `const API_KEY = 'sk-live-abc123'` in a service file"
assertions:
  structural:
    - "Output contains a finding with severity CRITICAL or HIGH"
    - "Output references the file path containing the hardcoded secret"
    - "Output mentions the specific line or pattern (API_KEY, sk-live)"
  behavioral:
    - "Verdict is BLOCK (not APPROVE)"
    - "Finding includes a remediation suggestion (env variable or secret manager)"
  negative:
    - "Does NOT approve the PR"
    - "Does NOT classify the finding as LOW or MEDIUM"
```

Why this works: The eval checks that the agent found the *specific* issue, classified it correctly, and recommended the right fix. An agent that misses the vulnerability fails. An agent that finds it but approves anyway fails. Only correct behavior passes.

### Bad — subjective grader with no rubric

```yaml
grader: "model-based"
prompt: "Did the agent do a good job? Rate 1-5."
pass_threshold: 3
```

A model grading "good job" with no criteria will give 4/5 to almost anything coherent.

### Good — rubric-based model grader

```yaml
grader: "model-based"
rubric:
  criteria:
    - name: "vulnerability_detected"
      weight: 40
      description: "Agent identified the hardcoded API key as a security issue"
      pass: "Explicitly mentions hardcoded secret/API key/credential"
      fail: "Does not mention secrets, credentials, or hardcoded values"
    - name: "correct_severity"
      weight: 30
      description: "Finding is classified as CRITICAL or HIGH"
      pass: "Severity is CRITICAL or HIGH"
      fail: "Severity is MEDIUM, LOW, or not specified"
    - name: "actionable_fix"
      weight: 20
      description: "Provides a concrete remediation"
      pass: "Suggests environment variable, secret manager, or similar"
      fail: "No fix suggested or fix is vague ('fix the issue')"
    - name: "correct_verdict"
      weight: 10
      description: "Overall verdict blocks the PR"
      pass: "Verdict is BLOCK"
      fail: "Verdict is APPROVE or APPROVE WITH COMMENTS"
  pass_threshold: 80
```

## Anti-Pattern Catalog

### 1. Happy-Path Only

**Symptom:** All eval scenarios test the golden path. No edge cases, no adversarial inputs, no ambiguous situations.

**Fix:** For every happy-path scenario, write at least one:
- **Failure scenario:** Input that should trigger a specific error or rejection
- **Edge case:** Empty input, massive input, malformed input
- **Ambiguous case:** Input where the correct answer requires judgment

```yaml
scenarios:
  - name: "happy_path"
    input: "PR with clear bug"
    expected: "Agent finds the bug"
  - name: "false_positive_resistance"
    input: "PR with code that looks suspicious but is correct"
    expected: "Agent does NOT flag it as a bug"
  - name: "empty_input"
    input: "PR with no changed files"
    expected: "Agent reports no changes to review"
```

### 2. Subjective Graders Without Rubrics

**Symptom:** Model-based grader with a vague prompt like "is this response good?"

**Fix:** Always provide a rubric with weighted criteria, concrete pass/fail descriptions, and a numeric threshold.

### 3. No Baseline Comparison

**Symptom:** Eval shows 85% pass rate. Is that good? There's no baseline to compare against.

**Fix:** Establish baselines:
- **Before:** Run eval against a naive prompt (no skill/agent customization). Record pass rate.
- **After:** Run eval with the skill/agent. The delta is the real measure of value.
- **Regression:** Re-run evals after changes. Pass rate should not drop.

### 4. Assertions Too Weak

**Symptom:** Assertions check for the presence of keywords rather than the correctness of the output.

**Fix:** Layer assertions by strength:

| Strength | Example | Catches |
|----------|---------|---------|
| **Weak** | "Output contains 'error'" | Almost nothing |
| **Medium** | "Output contains finding with severity CRITICAL for file X" | Wrong file, wrong severity |
| **Strong** | "Output blocks PR, cites line 42, suggests env variable replacement" | Wrong line, wrong fix, wrong verdict |

Use medium and strong assertions. Weak assertions are only useful as sanity checks alongside stronger ones.

### 5. No Failure Scenarios

**Symptom:** Every scenario expects the agent to succeed. No scenarios test what happens when the agent *should* fail or refuse.

**Fix:** Include negative test cases:

```yaml
- name: "should_not_hallucinate_findings"
  input: "Clean PR with no issues"
  expected: "Agent approves with no findings (or only minor suggestions)"
  fail_if: "Agent reports CRITICAL or HIGH findings"

- name: "should_refuse_out_of_scope"
  input: "Request to review infrastructure Terraform, but agent is scoped to backend TypeScript"
  expected: "Agent reports this is outside its scope"
  fail_if: "Agent attempts to review Terraform files"
```

### 6. Vanity Metrics

**Symptom:** Eval measures "did the agent produce output?" (100% pass rate) instead of "did the agent produce correct output?"

**Fix:** Every assertion must test *correctness*, not just *activity*. If your eval has a 95%+ pass rate on first run, your assertions are probably too weak.

## Scenario Design Methodology

### Start From Failure Modes, Not Success Criteria

Most eval authors start by asking "what should the agent do right?" This produces happy-path-only evals.

Instead, start by asking: **"How can the agent fail?"**

```
Failure mode analysis for code-review agent:
1. Misses a real vulnerability (false negative)
2. Flags clean code as vulnerable (false positive)
3. Finds the issue but assigns wrong severity
4. Finds the issue but suggests wrong fix
5. Produces unstructured output that can't be parsed
6. Crashes on empty diff
7. Reviews out-of-scope files
8. Approves a PR that should be blocked
```

Each failure mode becomes a scenario. This produces evals with real discriminating power.

### Scenario Template

```yaml
- name: "descriptive_snake_case_name"
  description: "One sentence explaining what this tests"
  failure_mode: "Which failure mode this scenario targets"
  input:
    description: "What the agent receives"
    files: [...]  # or inline content
  expected:
    behavior: "What the agent should do"
    output_contains: [...]  # structural checks
    output_must_not_contain: [...]  # negative checks
  grader: "deterministic | model-based | hybrid"
```

## Grader Selection

### Deterministic (Script-Based)

**Use when:** The correct answer has a specific structure, contains specific strings, or follows a checkable pattern.

```yaml
grader: deterministic
checks:
  - type: "json_schema"
    schema: "review-output.schema.json"
  - type: "contains"
    values: ["CRITICAL", "hardcoded", "API_KEY"]
  - type: "regex"
    pattern: "severity:\\s*(CRITICAL|HIGH)"
```

**Strengths:** Fast, reproducible, zero cost, no false positives.
**Weaknesses:** Can't evaluate quality of prose, reasoning, or judgment.

### Model-Based

**Use when:** Correctness requires understanding natural language, evaluating reasoning quality, or assessing subjective attributes.

```yaml
grader: model-based
model: opus  # use a strong model for grading
rubric: [see rubric example above]
```

**Strengths:** Can evaluate nuanced quality, reasoning, and judgment.
**Weaknesses:** Slower, costs tokens, can be inconsistent. Always use a rubric.

### Hybrid

**Use when:** Both structure and quality matter.

```yaml
grader: hybrid
deterministic:
  - "Output is valid JSON matching schema"
  - "Contains at least one finding with severity field"
  - "Verdict field is present and one of BLOCK/APPROVE/APPROVE_WITH_COMMENTS"
model_based:
  - criteria: "Finding explanations are clear and actionable"
    weight: 50
  - criteria: "Remediation suggestions are specific and correct"
    weight: 50
```

Run deterministic checks first. If they fail, skip the model-based grading (saves tokens). Only grade quality if structure is correct.

## Bottom-Up Eval Design

Let failure modes emerge from real usage rather than inventing them theoretically.

### Process

1. **Deploy the agent/skill** with minimal evals (basic smoke tests).
2. **Collect real failures** from actual usage (wrong outputs, user corrections, missed issues).
3. **Convert each failure into a scenario** with assertions that would have caught it.
4. **Run the expanded eval suite** and fix the agent/skill until it passes.
5. **Repeat** as new failure modes surface.

This produces evals grounded in reality rather than theoretical completeness.

## Eval Quality Checklist

- [ ] At least 1 failure scenario for every happy-path scenario
- [ ] Assertions test correctness, not just activity (no "output exists" only)
- [ ] Negative assertions included (what should NOT appear)
- [ ] Baseline established (pass rate before vs after the skill/agent)
- [ ] Grader type matches the evaluation need (deterministic for structure, model-based for quality)
- [ ] Model-based graders have weighted rubrics with concrete pass/fail criteria
- [ ] Pass threshold set below 100% only with documented justification
- [ ] Edge cases covered: empty input, large input, malformed input, out-of-scope input
- [ ] Scenarios derived from failure modes, not just success criteria
- [ ] Eval pass rate on first run is below 90% (if above, assertions are likely too weak)
