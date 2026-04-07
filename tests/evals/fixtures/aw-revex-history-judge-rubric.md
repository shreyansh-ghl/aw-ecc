# RevEx History Benchmark Judge Rubric

Use this rubric when comparing an AW-generated candidate PR artifact against the stored baseline PR from a real RevEx commit.

The judge may score the candidate higher than the baseline when the improvement is justified.

## Output Contract

Return structured JSON with:

- `overall_score`
- `verdict`
- `dimensions`
- `strengths`
- `gaps`
- `rationale`

The `dimensions` object must include these exact keys:

- `problem_coverage`
- `correctness`
- `scope_discipline`
- `verification_quality`
- `pr_quality`
- `risk_posture`

## Dimensions

Score each dimension from `1` to `5`.

### 1. Problem Coverage

- Did the candidate solve the real underlying problem from the sparse ticket prompt?
- Did it miss core behavior the baseline actually addressed?

### 2. Correctness

- Does the candidate appear technically sound for the inferred repo and change type?
- Is the proposed solution internally coherent?

### 3. Scope Discipline

- Did the candidate stay focused and reviewable?
- Did it avoid unnecessary churn compared with the baseline?

### 4. Verification Quality

- Does the candidate include credible narrow proof that supports the PR artifact?
- Judge this proportionally to the benchmark scope: this family is optimizing for PR-output parity, not design fidelity or full UI/browser evidence.
- Is the evidence posture equal to or better than the baseline clues for the same changed surface?

### 5. PR Quality

- Is the PR artifact clear, structured, and helpful for reviewers?
- Does it communicate problem, change scope, and validation well?

### 6. Risk Posture

- Does the candidate recognize rollout, compatibility, or regression risk?
- Is the rollback or mitigation thinking stronger than the baseline where relevant?

## Verdict Guidance

- `better_than_baseline`
- `roughly_equal_to_baseline`
- `worse_than_baseline`
- `inconclusive`

## Judge Rules

- Do not reward verbosity on its own.
- Prefer smaller safe solutions over broader speculative ones.
- Penalize hidden risk, missing verification, or PR artifacts that are hard to review.
- Do not require browser, screenshot, or design-fidelity evidence unless the baseline artifact itself clearly depends on that kind of proof.
- If the baseline itself is weak, the candidate may still outscore it.
