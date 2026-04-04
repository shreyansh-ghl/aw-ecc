---
name: memory-workflow
description: Automated memory capture and retrieval workflow for agent sessions
origin: ECC
---

# Memory Workflow Skill

Automated memory capture and retrieval workflow that integrates with agent session lifecycle events.

## When to Activate

- Starting a new agent session that benefits from prior context
- Completing a task that produced reusable learnings
- Ending a session where key decisions or discoveries were made
- Setting up automatic memory capture for a project
- Configuring memory extraction rules for a team

## How It Works

This skill hooks into the agent session lifecycle to automatically capture and retrieve memories.

### On Session Start

1. Detect the current project namespace from `.sync-config.json`
2. Call `memory_pack` with task description to load relevant context
3. Inject the memory pack into the session context

### On Task Complete

1. Extract key learnings from the task result
2. Call `curated_store` for each learning
3. Log the curation decisions

### On Session End

1. Summarize the session's key decisions and discoveries
2. Call `curated_store` for session-level memories
3. Update access counts for memories that were used

## Auto-Capture Rules

| Pattern | Source | Type |
|---------|--------|------|
| Lines containing "always", "never", "prefer" | Code review comments | `convention` |
| Error → investigation → fix sequences | Error resolutions | `pitfall` |
| Architecture rationale in PR descriptions | PR descriptions | `decision` |
| Repeated corrections from user feedback | Session transcripts | `pattern` |

### Skip Conditions

- Ephemeral or debug information
- One-time API outages or transient errors
- Simple typos and syntax fixes
- Session-specific context that does not generalize

## Configuration

Create a `config.json` alongside this SKILL.md to customize:

```json
{
  "auto_capture": true,
  "min_session_length": 10,
  "max_memories_per_session": 10,
  "confidence_threshold": 0.5,
  "namespaces": ["project", "team", "personal"],
  "skip_patterns": [
    "debug_output",
    "transient_errors",
    "simple_typos"
  ]
}
```

## Hook Setup

Add to your `~/.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/session-end-extract.js\"",
        "async": true,
        "timeout": 10
      }]
    }]
  }
}
```

## Related

- `/memory` command — Manual memory store, search, and pack operations
- `memory-curator` agent — Periodic memory quality management
- `continuous-learning` skill — Session-level pattern extraction (complements this skill)
