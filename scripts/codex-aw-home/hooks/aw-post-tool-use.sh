#!/usr/bin/env bash
set -euo pipefail

# Capture stdin before invoking the non-blocking telemetry sidecar.
STDIN=$(cat)

# aw-usage telemetry is owned by the aw CLI (~/.aw/aw-usage); the aw-ecc copy
# is only a fallback until it is removed.
TELEMETRY_HOOK="$HOME/.aw/aw-usage/hooks/aw-usage-post-tool-use.js"
[[ -f "$TELEMETRY_HOOK" ]] || TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-post-tool-use.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

exit 0
