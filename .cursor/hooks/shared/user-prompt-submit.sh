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

# Resolve using-aw-skills SKILL.md — single source of truth for routing rules
resolve_skill_path() {
  local search="$SCRIPT_DIR"
  while [[ "$search" != "/" ]]; do
    if [[ -f "$search/skills/using-aw-skills/SKILL.md" ]]; then
      printf '%s/skills/using-aw-skills/SKILL.md' "$search"
      return 0
    fi
    search="$(dirname "$search")"
  done
  for candidate in \
    "$HOME/.aw-ecc/skills/using-aw-skills/SKILL.md" \
    "$HOME/.aw_registry/platform/core/skills/using-aw-skills/SKILL.md" \
    "$HOME/.aw/.aw_registry/platform/core/skills/using-aw-skills/SKILL.md"
  do
    if [[ -f "$candidate" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  return 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_PATH="$(resolve_skill_path || true)"

if [[ -n "$SKILL_PATH" && -f "$SKILL_PATH" ]]; then
  HARD_GATE="$(awk '/^## Hard Gate/{p=1} p && /^## / && !/^## Hard Gate/{exit} p{print}' "$SKILL_PATH" || true)"
  printf '[AW Session Context] using-aw-skills is ALREADY LOADED — do NOT reload it. Apply routing rules from your context.\n\n'
  printf '%s\n' "$HARD_GATE"
else
  printf '[AW Router reminder] Re-apply using-aw-skills and select the smallest correct AW route before substantive work.\n'
fi

printf '\n[Rule reminder] Read %s/routing/AGENTS.md (mandatory gate), %s/universal/AGENTS.md, and %s/security/AGENTS.md, then the touched domain AGENTS.md plus references/ on demand.\n' \
  "$RULES_ROOT" "$RULES_ROOT" "$RULES_ROOT"
