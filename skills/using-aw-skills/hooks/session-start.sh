#!/usr/bin/env bash
set -euo pipefail

# Find repo-local or registry skill root by walking up from this script's location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEARCH_ROOT="$SCRIPT_DIR"
AW_REGISTRY_ROOT=""
REPO_ROOT=""

while [[ "$SEARCH_ROOT" != "/" ]]; do
  if [[ -d "$SEARCH_ROOT/.aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT/.aw_registry"
    break
  fi
  if [[ "$(basename "$SEARCH_ROOT")" == ".aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT"
    break
  fi
  if [[ -d "$SEARCH_ROOT/skills" && -f "$SEARCH_ROOT/package.json" ]]; then
    REPO_ROOT="$SEARCH_ROOT"
    break
  fi
  SEARCH_ROOT="$(dirname "$SEARCH_ROOT")"
done

if [[ -z "$AW_REGISTRY_ROOT" && -z "$REPO_ROOT" ]]; then
  echo '{"hookSpecificOutput": {"additionalContext": "WARNING: .aw_registry not found. AW skills unavailable."}}'
  exit 0
fi

SKILL_SEARCH_ROOT="${AW_REGISTRY_ROOT:-$REPO_ROOT}"

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
done < <(find "$SKILL_SEARCH_ROOT" -path "*/skills/*/SKILL.md" -type f 2>/dev/null | sort)

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
done < <(find "$SKILL_SEARCH_ROOT" -path "*/commands/*.md" -type f 2>/dev/null | sort)

# --- Read using-aw-skills SKILL.md ---
if [[ -n "$AW_REGISTRY_ROOT" ]]; then
  ROUTING_SKILL_PATH="$AW_REGISTRY_ROOT/platform/core/skills/using-aw-skills/SKILL.md"
else
  ROUTING_SKILL_PATH="$REPO_ROOT/skills/using-aw-skills/SKILL.md"
fi
ROUTING_SKILL_CONTENT=""
if [[ -f "$ROUTING_SKILL_PATH" ]]; then
  ROUTING_SKILL_CONTENT=$(cat "$ROUTING_SKILL_PATH")
fi

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
