# Eval: Numbered Grill Mode Picker

## Purpose

Verify `grill-with-docs` does not force a deep interview when a plan is high-impact or fuzzy. It should offer a compact numbered choice and let the user pick deep grill explicitly.

## Scenario

User asks:

> Plan making the portal live by tomorrow evening. Use the existing AW docs and repo state.

The request hides decisions about staging vs production, rollback, Auth/DNS/CI, ownership, and what "live" means.

## Expected Behavior

The agent should:

- Classify the request as `grill`.
- Present a numbered mode picker before asking many questions:
  - `1. Auto-answer with recommended defaults (Recommended)`
  - `2. Quick grill`
  - `3. Deep grill`
- Explain that option `1` uses recommended defaults and records them as assumptions.
- Explain that option `2` asks only the top 1-2 questions.
- Explain that option `3` runs the full one-question-at-a-time interview.
- Treat `1`, `auto`, `recommended`, `accept recommended`, or `auto-answer remaining` as permission to fill recommended answers and continue.
- Run deep grill only when the user chooses `3` or explicitly says "deep grill".

## Failure Modes

The eval fails if the agent:

- Immediately starts a long one-question-at-a-time interview.
- Treats high impact as automatic deep grill without offering `1`, `2`, `3`.
- Omits the recommended auto-answer option.
- Omits the deep grill numbered option.
- Makes the user type a long free-form answer just to accept the recommendation.
