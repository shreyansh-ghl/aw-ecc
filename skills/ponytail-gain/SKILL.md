---
name: ponytail-gain
description: >
  Show ponytail's measured impact as a compact scoreboard: less code, less
  cost, more speed, from the benchmark medians. One-shot display, not a
  persistent mode, and not a per-repo number. Trigger: /ponytail-gain,
  "ponytail gain", "what does ponytail save", "show ponytail impact",
  "ponytail scoreboard".
---

# Ponytail Gain

Display this scoreboard when invoked. One-shot: do NOT change mode, write flag
files, or persist anything.

The figures are upstream ponytail's published agentic benchmark: a headless
Claude Code session editing a real FastAPI + React repo, 12 feature tickets,
the same agent with and without the skill, n=4, Haiku 4.5, scored on the
`git diff` it leaves behind. They are measured there, not computed from the
current repo. Source: upstream `benchmarks/results/` and the README.

These figures hold on Claude runners. Upstream reports the cost and latency win
inverting on reasoning models that spend thinking tokens deliberating the rungs
(GPT-5.5 is slower and more expensive with ponytail on), so do not quote the
cost or speed line for Codex/GPT runs — the code-size reduction still holds.

## Scoreboard

Render plain ASCII bars. The bar length shows the measured range; the label
carries the exact figure:

```
  ponytail gain                 agentic benchmark · 12 tasks · Haiku 4.5 · n=4

  Lines of code   no-skill  ████████████████████  100%
                  ponytail  █████████···········   46%     ▼ 54%  (up to 94%)
  Tokens          no-skill  ████████████████████  100%
                  ponytail  ███████████████▌····   78%     ▼ 22%
  Cost            no-skill  ████████████████████  100%
                  ponytail  ████████████████····   80%     ▼ 20%   Claude only
  Time            no-skill  ████████████████████  100%
                  ponytail  ██████████████▌·····   73%     ▼ 27%   Claude only
  Safety          ponytail  ▸ 100% of guards kept

  This repo:  /aw:ponytail-debt  (shortcuts you deferred)
              /aw:ponytail-audit (what's still cuttable)
```

The cut is biggest where there is a real over-build trap and near zero on code
that is already minimal — 54% is the mean across the 12 tasks, not a promise for
any single change.

## Honesty boundary

These are benchmark medians, not this repo. NEVER print a per-repo savings
number ("you saved X lines/tokens here"): the unbuilt version was never
written, so there is no real baseline to subtract from in a live repo. The
only real per-repo figures come from `/ponytail-debt` (a counted ledger), and
this card points there instead of inventing one.

## Boundaries

One-shot display. Edits nothing, changes no mode.
"stop ponytail" or "normal mode": revert.
