#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RAW="$(cat || true)"

extract_workspace_root() {
  printf '%s' "$1" | sed -n 's/.*"workspace_roots"[[:space:]]*:[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

extract_cwd() {
  printf '%s' "$1" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

HOOK_CWD="$(extract_workspace_root "$RAW")"
if [ -z "$HOOK_CWD" ]; then
  HOOK_CWD="$(extract_cwd "$RAW")"
fi

if printf '%s' "$RAW" | grep -Eq 'sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36,}|AKIA[A-Z0-9]{16}|xox[bpsa]-[A-Za-z0-9-]+|-----BEGIN (RSA |EC )?PRIVATE KEY-----'; then
  >&2 echo '[ECC] WARNING: Potential secret detected in prompt!'
  >&2 echo '[ECC] Remove secrets before submitting. Use environment variables instead.'
fi

if [ -n "$HOOK_CWD" ] && [ -d "$HOOK_CWD" ]; then
  printf '%s' "$RAW" | (
    cd "$HOOK_CWD"
    bash "$SCRIPT_DIR/shared/user-prompt-submit.sh"
  ) >&2 || true
else
  printf '%s' "$RAW" | bash "$SCRIPT_DIR/shared/user-prompt-submit.sh" >&2 || true
fi

printf '%s' "$RAW"
