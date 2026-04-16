#!/usr/bin/env bash
set -euo pipefail

RAW="$(cat || true)"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

RESULT="$(printf '%s' "$RAW" | bash "$SCRIPT_DIR/shared/session-start.sh")"

if [ -z "$RESULT" ]; then
  printf '%s' "$RAW"
  exit 0
fi

JSON_CONTEXT="$(
  printf '%s' "$RESULT" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => input += chunk);
    process.stdin.on("end", () => {
      try {
        const parsed = JSON.parse(input || "{}");
        const context =
          (parsed && parsed.hookSpecificOutput && parsed.hookSpecificOutput.additionalContext) ||
          parsed.additional_context ||
          "";
        if (typeof context === "string" && context.trim()) {
          process.stdout.write(JSON.stringify({ additional_context: context }, null, 2) + "\n");
          return;
        }
      } catch {}
      process.stdout.write(process.env.ECC_FALLBACK_RAW || "");
    });
  ' ECC_FALLBACK_RAW="$RAW"
)"

printf '%s' "$JSON_CONTEXT"
