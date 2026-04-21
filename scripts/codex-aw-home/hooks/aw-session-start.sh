#!/usr/bin/env bash
# aw-managed: codex-global-session-start
set -euo pipefail

# Capture stdin so we can feed it to both telemetry and the AW router delegate.
STDIN=$(cat)

# Fire session_start telemetry (non-blocking, all output suppressed).
TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-session-start.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

TARGETS=(
  "$HOME/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
)

for target in "${TARGETS[@]}"; do
  if [[ -f "$target" ]]; then
    printf '%s' "$STDIN" | bash "$target"
    exit $?
  fi
done

CONTEXT="# AW Session Context

WARNING: AW using-aw-skills hook not found in ~/.aw_registry. Run aw init or aw pull platform."

JSON_CONTEXT=$(printf '%s' "$CONTEXT" | python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))')

echo "{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":${JSON_CONTEXT}}}"
