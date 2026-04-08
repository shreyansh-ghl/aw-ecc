#!/usr/bin/env bash
set -euo pipefail

# Drain stdin because harnesses can stream a JSON payload even though the AW
# session-start hook only emits routing context.
cat >/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

CANDIDATES=(
  "$ROOT_DIR/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
)

for TARGET_SCRIPT in "${CANDIDATES[@]}"; do
  if [[ -f "$TARGET_SCRIPT" ]]; then
    exec bash "$TARGET_SCRIPT"
  fi
done

echo '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "WARNING: AW session-start hook not found in the installed aw-ecc bundle or ~/.aw_registry."}}'
exit 0
