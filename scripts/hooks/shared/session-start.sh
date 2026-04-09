#!/usr/bin/env bash
set -euo pipefail

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

emit_session_start_warning() {
  local message="$1"
  local escaped
  escaped="$(escape_for_json "$message")"

  case "${AW_SESSION_OUTPUT:-claude}" in
    cursor)
      printf '{\n  "additional_context": "%s"\n}\n' "$escaped"
      ;;
    *)
      printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$escaped"
      ;;
  esac
}

# Drain stdin because some harnesses stream a JSON payload even though the
# AW session-start bridge only emits routing context.
cat >/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

CANDIDATES=(
  "$ROOT_DIR/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw-ecc/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
  "$HOME/.aw/.aw_registry/platform/core/skills/using-aw-skills/hooks/session-start.sh"
)

for TARGET_SCRIPT in "${CANDIDATES[@]}"; do
  if [[ -f "$TARGET_SCRIPT" ]]; then
    exec bash "$TARGET_SCRIPT"
  fi
done

emit_session_start_warning "WARNING: AW session-start hook not found in the installed aw-ecc bundle or ~/.aw_registry."
exit 0
