#!/usr/bin/env bash
set -euo pipefail

TARGETS=(
  "$HOME/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
)

for target in "${TARGETS[@]}"; do
  if [[ -f "$target" ]]; then
    exec bash "$target"
  fi
done

CONTEXT="# AW Session Context

WARNING: AW using-aw-skills hook not found in ~/.aw_registry. Run aw init or aw pull platform."

JSON_CONTEXT=$(printf '%s' "$CONTEXT" | python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))')

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":${JSON_CONTEXT}}}"
