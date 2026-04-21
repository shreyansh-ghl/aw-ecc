#!/usr/bin/env bash
set -euo pipefail

# Capture stdin before invoking the non-blocking telemetry sidecar.
STDIN=$(cat)

TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-post-tool-use.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

exit 0
