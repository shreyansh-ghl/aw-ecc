#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT=""
SEARCH_ROOT="$SCRIPT_DIR"
while [[ "$SEARCH_ROOT" != "/" ]]; do
  if [[ -f "$SEARCH_ROOT/skills/using-aw-skills/SKILL.md" ]]; then
    LOCAL_ROOT="$SEARCH_ROOT"
    break
  fi
  SEARCH_ROOT="$(dirname "$SEARCH_ROOT")"
done

AW_REGISTRY_ROOT=""
SEARCH_ROOT="$SCRIPT_DIR"
while [[ "$SEARCH_ROOT" != "/" ]]; do
  if [[ -d "$SEARCH_ROOT/.aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT/.aw_registry"
    break
  fi
  if [[ "$(basename "$SEARCH_ROOT")" == ".aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT"
    break
  fi
  SEARCH_ROOT="$(dirname "$SEARCH_ROOT")"
done

if [[ -z "$LOCAL_ROOT" && -z "$AW_REGISTRY_ROOT" ]]; then
  echo '{"hookSpecificOutput": {"additionalContext": "WARNING: .aw_registry not found. AW skills unavailable."}}'
  exit 0
fi

ROOT_CANDIDATES=()
if [[ -n "$LOCAL_ROOT" ]]; then
  ROOT_CANDIDATES+=("$LOCAL_ROOT")
fi
if [[ -n "$AW_REGISTRY_ROOT" ]]; then
  ROOT_CANDIDATES+=("$AW_REGISTRY_ROOT")
fi

# --- Discover all skills ---
SKILLS_LIST=""
while IFS= read -r skill_file; do
  # Extract name from frontmatter
  skill_name=$(grep -m1 '^name:' "$skill_file" 2>/dev/null | sed 's/^name:[[:space:]]*//' || true)
  # Extract description from frontmatter
  skill_desc=$(grep -m1 '^description:' "$skill_file" 2>/dev/null | sed 's/^description:[[:space:]]*//' || true)

  if [[ -n "$skill_name" ]]; then
    SKILLS_LIST="${SKILLS_LIST}- ${skill_name}: ${skill_desc}\n"
  fi
done < <(
  for root in "${ROOT_CANDIDATES[@]}"; do
    find "$root" -path "*/skills/*/SKILL.md" -type f 2>/dev/null
  done | sort -u
)

# --- Discover all commands ---
COMMANDS_LIST=""
while IFS= read -r cmd_file; do
  cmd_basename=$(basename "$cmd_file" .md)
  # Extract description from first non-empty, non-frontmatter line
  cmd_desc=$(awk '
    /^---$/ { in_fm = !in_fm; next }
    in_fm { next }
    /^[[:space:]]*$/ { next }
    /^#/ { gsub(/^#+[[:space:]]*/, ""); print; exit }
    { print; exit }
  ' "$cmd_file" 2>/dev/null || true)

  if [[ -n "$cmd_basename" ]]; then
    COMMANDS_LIST="${COMMANDS_LIST}- ${cmd_basename}: ${cmd_desc}\n"
  fi
done < <(
  for root in "${ROOT_CANDIDATES[@]}"; do
    find "$root" -path "*/commands/*.md" -type f 2>/dev/null
  done | sort -u
)

# --- Read using-aw-skills SKILL.md ---
ROUTING_SKILL_CONTENT=""
ROUTING_SKILL_PATHS=()
if [[ -n "$LOCAL_ROOT" ]]; then
  ROUTING_SKILL_PATHS+=("$LOCAL_ROOT/skills/using-aw-skills/SKILL.md")
fi
if [[ -n "$AW_REGISTRY_ROOT" ]]; then
  ROUTING_SKILL_PATHS+=("$AW_REGISTRY_ROOT/platform/core/skills/using-aw-skills/SKILL.md")
  ROUTING_SKILL_PATHS+=("$AW_REGISTRY_ROOT/skills/using-aw-skills/SKILL.md")
fi

for ROUTING_SKILL_PATH in "${ROUTING_SKILL_PATHS[@]}"; do
  if [[ -f "$ROUTING_SKILL_PATH" ]]; then
    ROUTING_SKILL_CONTENT=$(cat "$ROUTING_SKILL_PATH")
    break
  fi
done

# --- Combine into additionalContext ---
CONTEXT="# AW Session Context

## Available Skills
${SKILLS_LIST}

## Available Commands
${COMMANDS_LIST}

## Routing Skill
${ROUTING_SKILL_CONTENT}"

# --- Output in Claude Code hookSpecificOutput format ---
# Escape for JSON: newlines, quotes, backslashes
JSON_CONTEXT=$(printf '%s' "$CONTEXT" | python3 -c '
import sys, json
content = sys.stdin.read()
print(json.dumps(content))
' 2>/dev/null || printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | awk '{printf "%s\\n", $0}')

echo "{\"hookSpecificOutput\": {\"additionalContext\": ${JSON_CONTEXT}}}"
