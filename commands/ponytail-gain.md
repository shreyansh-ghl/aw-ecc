---
name: ponytail-gain
description: Show ponytail's measured impact scoreboard (less code, cost, time)
command: true
---

# Ponytail Gain

Load and follow the `ponytail-gain` skill, then carry out the instruction below.

The instruction text is vendored verbatim from upstream ponytail
(`commands/ponytail-gain.toml`, MIT, DietrichGebert/ponytail) so behavior matches the
original. See `skills/ponytail/references/aw-integration.md` for how this fits
the AW SDLC and which AW rules outrank the ladder.

## Instruction

Show the ponytail gain scoreboard. One shot, change nothing: do not switch mode, write flag files, or persist anything. Render the published benchmark medians (5 everyday tasks; models Haiku, Sonnet, Opus; source benchmarks/ and the README) as plain ASCII bars: Lines of code, no-skill 100% vs ponytail 6-20% (down 80-94%); Cost, no-skill 100% vs ponytail 23-53% (down 47-77%); Speed, ponytail 3-6x faster. The bar length shows the measured range, the label carries the exact figure. These are benchmark medians, not this repo. NEVER print a per-repo savings number: the unbuilt version was never written, so there is no real baseline to subtract from in a live repo. For real per-repo figures, point to /ponytail-debt (the counted shortcut ledger) and /ponytail-audit (what is still cuttable). Report only.
