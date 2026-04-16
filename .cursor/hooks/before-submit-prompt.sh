#!/usr/bin/env bash
set -euo pipefail

RAW="$(cat || true)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RESULT="$(printf '%s' "$RAW" | node "$SCRIPT_DIR/before-submit-prompt.js" 2>&1 1>/tmp/aw_cursor_before_submit_stdout.$$)"
STATUS=$?
STDOUT_CONTENT="$(cat /tmp/aw_cursor_before_submit_stdout.$$ 2>/dev/null || true)"
rm -f /tmp/aw_cursor_before_submit_stdout.$$

if [ -n "$RESULT" ]; then
  printf '%s\n' "$RESULT" >&2
fi

printf '%s' "${STDOUT_CONTENT:-$RAW}"
exit "$STATUS"
