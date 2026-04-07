# Review Findings Severity

Use alongside `aw-review`.

## Severity Scale

- `blocking`: must be fixed before release or handoff
- `major`: high-value fix expected before release unless explicitly accepted
- `minor`: should be fixed soon but does not block the current gate
- `note`: advisory improvement or follow-up

## Review Axes

- correctness
- readability and simplicity
- architecture
- security
- performance

## GHL Escalation Heuristics

Default to `blocking` when the issue risks:

- tenant isolation
- auth or secret handling
- staging or rollback safety
- destructive data behavior
- broken core customer flow

## Required Finding Shape

- severity
- scope
- evidence
- why it matters
- required fix or follow-up
