#!/usr/bin/env bash
set -euo pipefail

# Capture stdin so we can feed it to both telemetry and the reminder delegate.
STDIN=$(cat)

# aw-usage telemetry is owned by the aw CLI (~/.aw/aw-usage); the aw-ecc copy
# is only a fallback until it is removed.
TELEMETRY_HOOK="$HOME/.aw/aw-usage/hooks/aw-usage-prompt-submit.js"
[[ -f "$TELEMETRY_HOOK" ]] || TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-prompt-submit.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

TARGET="$HOME/.aw-ecc/scripts/hooks/session-start-rules-context.sh"
if [[ -f "$TARGET" ]]; then
  printf '%s' "$STDIN" | bash "$TARGET"
  exit $?
fi

exit 0
