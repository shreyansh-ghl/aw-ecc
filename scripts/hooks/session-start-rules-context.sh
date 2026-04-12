#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REMINDER="$(bash "$SCRIPT_DIR/shared/user-prompt-submit.sh" || true)"

if [[ -z "${REMINDER}" ]]; then
  exit 0
fi

JSON_REMINDER="$(printf '%s' "$REMINDER" | python3 -c 'import json, sys; print(json.dumps(sys.stdin.read()))')"
printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}\n' "$JSON_REMINDER"
