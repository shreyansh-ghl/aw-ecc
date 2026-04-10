#!/usr/bin/env bash
set -euo pipefail

# Drain stdin because Codex writes a JSON payload even though this wrapper
# only returns AW session context and does not use the payload body.
cat >/dev/null || true

TARGETS=(
  "$HOME/.aw-ecc/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.codex/.cursor/skills/using-aw-skills/hooks/session-start.sh"
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
