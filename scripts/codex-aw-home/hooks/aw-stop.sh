#!/usr/bin/env bash
set -euo pipefail

# Capture stdin before invoking the non-blocking telemetry sidecar.
STDIN=$(cat)

TELEMETRY_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-usage-stop.js"
if [[ -f "$TELEMETRY_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$TELEMETRY_HOOK" >/dev/null 2>&1 || true
fi

MEMORY_SYNC_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-memory-sync.js"
MEMORY_INTENT_HOOK="$HOME/.aw-ecc/scripts/hooks/aw-memory-intent-capture.js"
if [[ -f "$MEMORY_INTENT_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$MEMORY_INTENT_HOOK" >/dev/null 2>&1 || true
fi

if [[ -f "$MEMORY_SYNC_HOOK" ]] && command -v node >/dev/null 2>&1; then
  printf '%s' "$STDIN" | AW_HARNESS=codex node "$MEMORY_SYNC_HOOK" >/dev/null 2>&1 || true
fi

exit 0
