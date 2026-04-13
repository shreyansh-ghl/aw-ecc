# AW Hook Contract Matrix

This document captures the hook output contracts AW currently relies on for:

- Cursor
- Codex
- Claude

The goal is to stop treating hook payload shapes as tribal knowledge. If a hook changes, we should update this file and add or adjust a test in the same PR.

## Scope

This is the contract matrix for the AW-managed surfaces we actively use in routing and startup hydration.

It is **not** a full vendor hook API reference for every event each tool supports.

## Contract Summary

| Harness | Event / phase | Expected output shape | Notes |
| --- | --- | --- | --- |
| Cursor | `sessionStart` | `{"additional_context":"..."}` | Cursor expects a top-level `additional_context` string for startup hydration. |
| Cursor | `beforeSubmitPrompt` | full rewritten event JSON | The hook must return valid JSON for the prompt event, not plain text. AW currently rewrites/passes through the original payload with prompt adjustments. |
| Codex | `SessionStart` | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` | Codex expects the Claude-style `hookSpecificOutput` envelope for the AW startup context we inject. |
| Codex | `UserPromptSubmit` | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` | This is the missing contract that causes `hook returned invalid user prompt submit JSON output` when a plain-text reminder is emitted. |
| Claude | `SessionStart` | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}` | Claude plugin startup hydration uses the same envelope. |
| Claude | `UserPromptSubmit` | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` | Claude prompt reminders must emit JSON, not plain text. |

## Canonical Payloads

### Cursor `sessionStart`

```json
{
  "additional_context": "# AW Session Context\n..."
}
```

### Cursor `beforeSubmitPrompt`

Cursor prompt hooks are request-rewrite hooks, so the safe contract is:

- parse the incoming event JSON
- rewrite only the fields you intend to change
- return valid JSON for the same event object

For AW, this means returning the prompt payload with the prompt rewritten or preserved, not emitting a free-form reminder block.

### Codex / Claude `SessionStart`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "# AW Session Context\n..."
  }
}
```

### Codex / Claude `UserPromptSubmit`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "[Rule reminder] ..."
  }
}
```

## Why the Codex Failure Happens

If Codex `UserPromptSubmit` is wired to a script that prints plain text like:

```text
[AW Router reminder] ...
[Rules reminder] ...
```

then Codex rejects it with:

```text
hook returned invalid user prompt submit JSON output
```

because the hook phase expects JSON, not plain text.

## Verification Sources

### Cursor

Implementation-verified:

- `hooks/session-start` emits `additional_context` when running in Cursor-mode root hook
- `/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace/scripts/test-aw-router-startup-beta.sh`

Relevant local adapter behavior:

- `/Users/prathameshai/.cursor/hooks/before-submit-prompt.sh`

### Codex

Implementation-verified:

- `/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace/scripts/test-aw-router-startup-beta.sh`
- `/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace/scripts/start-codex-aw.sh`
- `/Users/prathameshai/.codex/hooks/aw-session-start.sh`
- `/Users/prathameshai/.codex/hooks/aw-user-prompt-submit.sh`

### Claude

Implementation-verified:

- `/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace/libs/aw/tests/hooks-session-start.test.mjs`
- `/Users/prathameshai/Documents/Agentic Workspace/ghl-agentic-workspace/scripts/hooks/session-start-rules-context.sh`

## Required Tests So We Do Not Miss This Again

Every release that touches hooks should verify:

1. `SessionStart` payload shape for Cursor, Codex, and Claude.
2. `UserPromptSubmit` payload shape for Codex and Claude.
3. `beforeSubmitPrompt` rewrite contract for Cursor.
4. One real CLI smoke per harness proving route, stage, and rules behavior.

The focused regression test for this lives at:

- `tests/hooks/harness-hook-output-contracts.test.js`

## Recommended Test Split

### Contract tests

- JSON-parse the raw output of each installed hook entrypoint
- assert the expected top-level key for that harness:
  - Cursor: `additional_context`
  - Codex / Claude: `hookSpecificOutput.additionalContext`

### Behavior tests

- run fresh environment creation
- run real CLI smoke for Cursor, Codex, and Claude
- assert route, stage, consulted rules, and `using-aw-skills` evidence

## Current Known Risk

Vendor docs are not equally explicit for all harnesses.

So the safest operating model is:

- use official docs where clearly published
- treat shipped implementation + passing contract tests as the source of truth where vendor docs are thin
- never rely on memory for hook payload shapes
