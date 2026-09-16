---
name: ponytail
description: Switch ponytail intensity level (lite/full/ultra/off)
argument-hint: "[lite|full|ultra|off]"
command: true
---

# Ponytail

Load and follow the `ponytail` skill, then carry out the instruction below.

The instruction text is vendored verbatim from upstream ponytail
(`commands/ponytail.toml`, MIT, DietrichGebert/ponytail) so behavior matches the
original. See `skills/ponytail/references/aw-integration.md` for how this fits
the AW SDLC and which AW rules outrank the ladder.

## Instruction

Switch to ponytail $ARGUMENTS mode. If no level specified, use full. Lazy senior dev mode, before any code: does it need to exist at all (YAGNI)? Does the standard library do it? A native platform feature? Can it be one line? Build the minimum that works. No unrequested abstractions, no avoidable dependencies, no boilerplate. Mark deliberate simplifications that cut a real corner with a known ceiling using a ponytail: comment that names the ceiling and upgrade path.
