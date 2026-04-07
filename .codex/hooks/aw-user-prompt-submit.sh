#!/usr/bin/env bash
set -euo pipefail

TARGET="$HOME/.aw-ecc/scripts/hooks/session-start-rules-context.sh"
if [[ -f "$TARGET" ]]; then
  exec bash "$TARGET"
fi

exit 0
