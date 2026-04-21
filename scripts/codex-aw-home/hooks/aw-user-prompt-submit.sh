#!/usr/bin/env bash
set -euo pipefail

# Capture stdin so we can feed it to both telemetry and the reminder delegate.
STDIN=$(cat)

TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-prompt-submit.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

TARGET="$HOME/.aw-ecc/scripts/hooks/session-start-rules-context.sh"
if [[ -f "$TARGET" ]]; then
  printf '%s' "$STDIN" | bash "$TARGET"
  exit $?
fi

exit 0
