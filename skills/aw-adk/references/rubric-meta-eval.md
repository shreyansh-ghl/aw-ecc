# Rubric: Meta-Evaluation

Score an eval's quality across 5 dimensions. Total: /50.

## Dimensions

### 1. Scenario Diversity (0-10)

How broadly does the eval cover the artifact's behavior space?

| Score | Description |
|-------|-------------|
| 0 | Single happy-path scenario only |
| 2 | Happy path with minor input variations |
| 5 | Happy path + at least one edge case or failure scenario |
| 7 | Happy path + failure + edge case coverage |
| 10 | Happy path + failure + edge case + adversarial/ambiguous inputs |

**What to look for:**
- Does the eval test what happens when required fields are missing?
- Are boundary conditions exercised (empty input, maximum length, special characters)?
- Is there at least one scenario where the artifact should refuse or fail gracefully?
- Are adversarial prompts included (conflicting instructions, prompt injection attempts)?

### 2. Grader Determinism (0-10)

How reproducible are the eval results across runs?

| Score | Description |
|-------|-------------|
| 0 | Fully subjective -- human judgment with no rubric |
| 3 | Model-based grader with vague instructions ("is this good?") |
| 5 | Model-based grader with specific criteria and examples |
| 7 | Mix of deterministic checks and bounded model grading |
| 10 | Fully deterministic script or model grader with explicit pass/fail boundaries |

**What to look for:**
- Are pass/fail criteria unambiguous enough that two reviewers would agree?
- Does the grader use exact-match, regex, or structured checks where possible?
- If model-based, does the grader prompt include concrete examples of pass and fail?
- Could you automate this grader in CI without human intervention?

### 3. False-Pass Resistance (0-10)

Would a clearly wrong artifact still pass the eval?

| Score | Description |
|-------|-------------|
| 0 | A boilerplate or empty artifact would pass |
| 3 | Checks for presence of output but not correctness |
| 5 | Some specificity -- checks named sections or keywords |
| 7 | Targeted assertions on content, structure, and relationships |
| 10 | Assertions that demonstrably fail on known-wrong artifacts |

**What to look for:**
- Does the eval check content meaning, not just content existence?
- Are there negative assertions (artifact must NOT contain X)?
- Would a copy-paste of the prompt back as output pass? If yes, score low.
- Does the eval verify relationships between parts (e.g., summary matches detail)?

### 4. Criteria Specificity (0-10)

How precisely are success criteria defined?

| Score | Description |
|-------|-------------|
| 0 | Vague ("output should be good", "looks correct") |
| 3 | Named qualities without measurement ("should be comprehensive") |
| 5 | Named sections or fields to check with qualitative descriptions |
| 7 | Quantified thresholds for most criteria (counts, percentages, sizes) |
| 10 | All criteria have quantified thresholds with evidence requirements |

**What to look for:**
- Can you turn each criterion into a binary pass/fail without interpretation?
- Are numeric thresholds stated (e.g., "at least 3 scenarios", "under 200 words")?
- Does the eval require evidence citations or examples in the output?
- Are edge cases in the criteria themselves addressed (what counts as "partial")?

### 5. Baseline Tracking (0-10)

Does the eval support measuring improvement over time?

| Score | Description |
|-------|-------------|
| 0 | No baseline, no comparison methodology |
| 3 | Mentions that results should be compared but no method |
| 5 | References a baseline or before/after comparison |
| 7 | Explicit with/without methodology with defined metrics |
| 10 | Reproducible baseline with versioned artifacts, stored results, and diff method |

**What to look for:**
- Is there a "before" snapshot or known-good baseline to compare against?
- Can you re-run the eval on an older version and get comparable results?
- Does the eval track scores over time (not just pass/fail)?
- Is the comparison methodology documented enough for someone else to reproduce?

## Tier Thresholds

| Tier | Score | Interpretation |
|------|-------|----------------|
| **S** | 45-50 | Production-grade eval. Ship it. |
| **A** | 38-44 | Strong eval. Minor gaps acceptable for non-critical artifacts. |
| **B** | 30-37 | Adequate eval. Acceptable for first iteration; improve before relying on it for regressions. |
| **C** | 20-29 | Weak eval. Provides some signal but has significant blind spots. |
| **D** | 0-19 | Eval provides negligible quality signal. Rewrite before using. |

## How to Use

1. **Score each eval after writing it.** Fill in the 5 dimensions honestly. If you authored the eval, have someone else score it -- author bias inflates scores by 5-10 points on average.

2. **Gate on tier before merging.** New evals for skills and agents should be B-tier or above. Critical-path artifacts (commands, platform rules) should target A-tier.

3. **Use dimension scores to guide improvements.** A low Scenario Diversity score is fixed by adding scenarios. A low Grader Determinism score requires rewriting the grader. Address the lowest-scoring dimension first for maximum impact.

4. **Re-score after changes.** When you modify an eval, re-run the rubric. Track the score in the eval's frontmatter or a changelog comment.

5. **Compare across evals.** Use tier distribution to gauge overall eval maturity for a project. If most evals are C-tier, invest in eval quality before adding more artifacts.

### Scoring Template

```markdown
## Meta-Eval Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Scenario Diversity | /10 | |
| Grader Determinism | /10 | |
| False-Pass Resistance | /10 | |
| Criteria Specificity | /10 | |
| Baseline Tracking | /10 | |
| **Total** | **/50** | **Tier: ?** |
```
