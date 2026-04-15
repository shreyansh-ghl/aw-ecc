#!/usr/bin/env bash
set -euo pipefail

RAW="$(cat || true)"

extract_workspace_root() {
  printf '%s' "$1" | sed -n 's/.*"workspace_roots"[[:space:]]*:[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

extract_cwd() {
  printf '%s' "$1" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

resolve_rules_root() {
  local root="${1:-}"
  local cwd_dir
  cwd_dir="$(pwd)"
  local candidate

  for candidate in \
    "$root/.aw/.aw_rules/platform" \
    "$root/.aw_rules/platform" \
    "$cwd_dir/.aw/.aw_rules/platform" \
    "$cwd_dir/.aw_rules/platform" \
    "$HOME/.aw/.aw_rules/platform" \
    "$HOME/.aw_rules/platform" \
    "$HOME/.aw/.aw_registry/.aw_rules/platform"
  do
    if [ -n "$candidate" ] && [ -d "$candidate" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  return 1
}

WORKSPACE_ROOT="$(extract_workspace_root "$RAW")"
if [ -z "$WORKSPACE_ROOT" ]; then
  WORKSPACE_ROOT="$(extract_cwd "$RAW")"
fi

RULES_ROOT="$(resolve_rules_root "$WORKSPACE_ROOT" || true)"
if [ -z "$RULES_ROOT" ]; then
  RULES_ROOT="$HOME/.aw_rules/platform"
fi

# Load routing gate message from central source — single source of truth
GATE_FILE="${RULES_ROOT}/routing/gate.md"
if [ -f "$GATE_FILE" ]; then
  cat "$GATE_FILE"
else
  printf '[AW Router reminder] Re-apply using-aw-skills and select the smallest correct AW route before substantive work.\n'
fi

printf '[Rule reminder] Read %s/routing/AGENTS.md (mandatory gate), %s/universal/AGENTS.md, and %s/security/AGENTS.md, then the touched domain AGENTS.md plus references/ on demand.\n' \
  "$RULES_ROOT" "$RULES_ROOT" "$RULES_ROOT"
