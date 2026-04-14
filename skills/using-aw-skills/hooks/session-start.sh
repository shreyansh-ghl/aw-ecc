#!/usr/bin/env bash
set -euo pipefail

# Drain stdin because session-start emits static AW routing context and does
# not inspect the incoming payload.
cat >/dev/null || true

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

if [[ -z "$AW_REGISTRY_ROOT" ]]; then
  for CANDIDATE_ROOT in "$HOME/.aw_registry" "$HOME/.aw/.aw_registry"; do
    if [[ -d "$CANDIDATE_ROOT" ]]; then
      AW_REGISTRY_ROOT="$CANDIDATE_ROOT"
      break
    fi
  done
fi

if [[ -z "$LOCAL_ROOT" && -z "$AW_REGISTRY_ROOT" ]]; then
  echo '{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "WARNING: .aw_registry not found. AW skills unavailable."}}'
  exit 0
fi

read_frontmatter_name() {
  local file_path="$1"
  [[ -f "$file_path" ]] || return 0

  awk '
    NR == 1 && $0 == "---" { in_frontmatter = 1; next }
    in_frontmatter && $0 == "---" { exit }
    in_frontmatter && /^name:[[:space:]]*/ {
      sub(/^name:[[:space:]]*/, "", $0)
      print
      exit
    }
  ' "$file_path"
}

read_skill_content() {
  local file_path="$1"
  [[ -f "$file_path" ]] || return 0
  cat "$file_path"
}

collect_registry_skills() {
  local registry_root="$1"
  local count=0
  [[ -d "$registry_root/platform" ]] || return 0

  while IFS= read -r skill_file; do
    local skill_name=""
    if [[ "$skill_file" == */using-aw-skills/SKILL.md ]]; then
      continue
    fi
    skill_name="$(read_frontmatter_name "$skill_file")"
    if [[ -z "$skill_name" ]]; then
      skill_name="$(basename "$(dirname "$skill_file")")"
    fi
    printf -- "- %s\n" "$skill_name"
    count=$((count + 1))
    if [[ "$count" -ge 6 ]]; then
      break
    fi
  done < <(find "$registry_root/platform" -path '*/skills/*/SKILL.md' | sort)
}

collect_registry_commands() {
  local registry_root="$1"
  local count=0
  [[ -d "$registry_root/commands" ]] || return 0

  while IFS= read -r command_file; do
    local command_slug=""
    local command_name=""
    command_slug="$(basename "$command_file" .md)"
    command_name="$(read_frontmatter_name "$command_file")"
    if [[ -n "$command_name" ]]; then
      printf -- "- %s: %s\n" "$command_slug" "$command_name"
    else
      printf -- "- %s\n" "$command_slug"
    fi
    count=$((count + 1))
    if [[ "$count" -ge 6 ]]; then
      break
    fi
  done < <(find "$registry_root/commands" -mindepth 1 -maxdepth 1 -name '*.md' | sort)
}

ROUTER_SKILL_PATH=""
if [[ -n "$LOCAL_ROOT" && -f "$LOCAL_ROOT/skills/using-aw-skills/SKILL.md" ]]; then
  ROUTER_SKILL_PATH="$LOCAL_ROOT/skills/using-aw-skills/SKILL.md"
elif [[ -n "$AW_REGISTRY_ROOT" && -f "$AW_REGISTRY_ROOT/platform/core/skills/using-aw-skills/SKILL.md" ]]; then
  ROUTER_SKILL_PATH="$AW_REGISTRY_ROOT/platform/core/skills/using-aw-skills/SKILL.md"
fi

ROUTER_CONTENT="$(read_skill_content "$ROUTER_SKILL_PATH")"
REGISTRY_SKILLS=""
REGISTRY_COMMANDS=""
if [[ -n "$AW_REGISTRY_ROOT" ]]; then
  REGISTRY_SKILLS="$(collect_registry_skills "$AW_REGISTRY_ROOT")"
  REGISTRY_COMMANDS="$(collect_registry_commands "$AW_REGISTRY_ROOT")"
fi

CONTEXT="<EXTREMELY_IMPORTANT>
You have the AW Agentic Workspace engine.

# AW Session Context

**Below is the full content of your 'using-aw-skills' skill — your router for all AW workflows. For all other skills, use the Skill tool:**

${ROUTER_CONTENT}
</EXTREMELY_IMPORTANT>

IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.
This is not negotiable. This is not optional. You cannot rationalize your way out of this."

if [[ -n "$REGISTRY_SKILLS" ]]; then
  CONTEXT="${CONTEXT}

## Registry Skills In Scope
${REGISTRY_SKILLS}"
fi

if [[ -n "$REGISTRY_COMMANDS" ]]; then
  CONTEXT="${CONTEXT}

## Registry Commands In Scope
${REGISTRY_COMMANDS}"
fi

# --- Output in Claude Code hookSpecificOutput format ---
# Escape for JSON: newlines, quotes, backslashes
JSON_CONTEXT=$(printf '%s' "$CONTEXT" | python3 -c '
import sys, json
content = sys.stdin.read()
print(json.dumps(content))
' 2>/dev/null || printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | awk '{printf "%s\\n", $0}')

echo "{\"hookSpecificOutput\": {\"hookEventName\": \"SessionStart\", \"additionalContext\": ${JSON_CONTEXT}}}"
