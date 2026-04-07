# Debug Triage

Use alongside `aw-investigate` and `aw-debug`.

## Sequence

1. capture the signal
2. define expected vs actual
3. narrow the likely fault surface
4. run the next confirming probe
5. only then patch

## Evidence Sources

- failing command output
- logs and traces
- screenshots or browser runtime evidence
- recent diff or rollout context

## Stop-The-Line Triggers

- third speculative fix attempt
- alert keeps moving without clear cause
- patch scope is growing faster than understanding
