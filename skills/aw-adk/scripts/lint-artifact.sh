#!/usr/bin/env bash
# lint-artifact.sh — Validates CASRE artifact structure
# Usage: bash skills/aw-adk/scripts/lint-artifact.sh <path> <type>
# Types: command | agent | skill | rule | eval
# Returns JSON with pass/fail per check

set -euo pipefail

ARTIFACT_PATH="${1:-}"
ARTIFACT_TYPE="${2:-}"
ERRORS=()
WARNINGS=()

if [[ -z "$ARTIFACT_PATH" || -z "$ARTIFACT_TYPE" ]]; then
  echo '{"error": "Usage: lint-artifact.sh <path> <type>"}' >&2
  exit 1
fi

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "{\"error\": \"File not found: $ARTIFACT_PATH\"}" >&2
  exit 1
fi

# Read file content
CONTENT=$(cat "$ARTIFACT_PATH")

# Check 1: YAML frontmatter exists
if ! echo "$CONTENT" | head -1 | grep -q '^---$'; then
  ERRORS+=("frontmatter_missing: No YAML frontmatter (must start with ---)")
fi

# Check 2: Frontmatter has 'name' field
if ! echo "$CONTENT" | grep -q '^name:'; then
  ERRORS+=("name_missing: No 'name' field in frontmatter")
fi

# Check 3: Frontmatter has 'description' field
if ! echo "$CONTENT" | grep -q '^description:'; then
  ERRORS+=("description_missing: No 'description' field in frontmatter")
fi

# Type-specific checks
case "$ARTIFACT_TYPE" in
  command)
    # Commands need phases
    if ! echo "$CONTENT" | grep -qi 'phase'; then
      WARNINGS+=("no_phases: Command has no phase structure")
    fi
    # Commands need agent roster
    if ! echo "$CONTENT" | grep -qi 'agent.*roster\|## Agent'; then
      WARNINGS+=("no_agent_roster: Command has no agent roster section")
    fi
    ;;
  agent)
    # Agents need identity section
    if ! echo "$CONTENT" | grep -qi '## Identity\|## Core Mission'; then
      WARNINGS+=("no_identity: Agent has no Identity or Core Mission section")
    fi
    # Agents need tools in frontmatter
    if ! echo "$CONTENT" | grep -q '^tools:'; then
      WARNINGS+=("no_tools: Agent has no 'tools' field in frontmatter")
    fi
    ;;
  skill)
    # Skills: SKILL.md must be the filename
    BASENAME=$(basename "$ARTIFACT_PATH")
    if [[ "$BASENAME" != "SKILL.md" ]]; then
      ERRORS+=("wrong_filename: Skill must be named SKILL.md, got $BASENAME")
    fi
    # Skills need When to Use
    if ! echo "$CONTENT" | grep -qi '## When to Use'; then
      WARNINGS+=("no_when_to_use: Skill has no 'When to Use' section")
    fi
    # Check word count (should be < 5000)
    WORD_COUNT=$(echo "$CONTENT" | wc -w | tr -d ' ')
    if [[ "$WORD_COUNT" -gt 5000 ]]; then
      WARNINGS+=("too_long: Skill is $WORD_COUNT words (recommended < 5000)")
    fi
    ;;
  rule)
    # Rules need WRONG/RIGHT or Always/Never examples
    if ! echo "$CONTENT" | grep -qi 'WRONG\|Never\|Always'; then
      WARNINGS+=("no_examples: Rule has no WRONG/RIGHT or Always/Never examples")
    fi
    ;;
  eval)
    # Evals need pass/fail criteria
    if ! echo "$CONTENT" | grep -qi 'pass\|fail\|expect'; then
      WARNINGS+=("no_criteria: Eval has no pass/fail criteria")
    fi
    ;;
  *)
    echo "{\"error\": \"Unknown type: $ARTIFACT_TYPE. Must be: command|agent|skill|rule|eval\"}" >&2
    exit 1
    ;;
esac

# ─── Dependency resolution checks ───
# Find the .aw/.aw_registry/ root by walking up from the artifact path
REGISTRY_ROOT=""
SEARCH_DIR=$(dirname "$ARTIFACT_PATH")
for _ in $(seq 1 10); do
  if [[ -d "$SEARCH_DIR/.aw_registry" ]]; then
    # We're inside .aw/ already
    REGISTRY_ROOT="$SEARCH_DIR"
    break
  elif [[ -d "$SEARCH_DIR/.aw/.aw_registry" ]]; then
    REGISTRY_ROOT="$SEARCH_DIR/.aw"
    break
  fi
  SEARCH_DIR=$(dirname "$SEARCH_DIR")
done

if [[ -n "$REGISTRY_ROOT" ]]; then
  case "$ARTIFACT_TYPE" in
    agent)
      # Check skills: frontmatter — each skill must exist in the registry
      SKILLS_LINE=$(echo "$CONTENT" | grep -E '^skills:' | head -1)
      if [[ -n "$SKILLS_LINE" ]]; then
        # Extract skill names from YAML: skills: [skill-1, skill-2] or skills: skill-1, skill-2
        SKILL_NAMES=$(echo "$SKILLS_LINE" | sed 's/^skills:[[:space:]]*//;s/\[//g;s/\]//g;s/,/ /g;s/"//g;s/'"'"'//g' | tr -s ' ')
        for SKILL_NAME in $SKILL_NAMES; do
          SKILL_NAME=$(echo "$SKILL_NAME" | xargs) # trim whitespace
          [[ -z "$SKILL_NAME" || "$SKILL_NAME" == "[]" || "$SKILL_NAME" == "-" ]] && continue
          # Search for the skill in the registry
          FOUND=$(find "$REGISTRY_ROOT/.aw_registry" -path "*/skills/$SKILL_NAME/SKILL.md" 2>/dev/null | head -1)
          if [[ -z "$FOUND" ]]; then
            ERRORS+=("phantom_skill: Agent references skill '$SKILL_NAME' but no skills/$SKILL_NAME/SKILL.md found in registry")
          fi
        done
      fi
      ;;
    command)
      # Check agent roster — only extract from the "Agent Roster" section, not Skill Loading Gate
      # Extract lines between "## Agent Roster" and the next "##" heading
      ROSTER_SECTION=$(echo "$CONTENT" | sed -n '/^## Agent Roster/,/^## [^A]/p' | sed '$d')
      if [[ -n "$ROSTER_SECTION" ]]; then
        AGENT_NAMES=$(echo "$ROSTER_SECTION" | grep -E '^\| *`[a-zA-Z]' | sed 's/.*`\([a-zA-Z0-9_-]*\)`.*/\1/' 2>/dev/null || true)
        # Known built-in subagent types (Claude Code native agents, not registry artifacts)
        BUILTIN_AGENTS="general-purpose|planner|code-reviewer|security-reviewer|build-error-resolver|typescript-reviewer|python-reviewer|go-reviewer|rust-reviewer|java-reviewer|kotlin-reviewer|cpp-reviewer|flutter-reviewer|e2e-runner|refactor-cleaner|doc-updater|tdd-guide|architect|harness-optimizer|docs-lookup|database-reviewer|loop-operator"
        for AGENT_NAME in $AGENT_NAMES; do
          [[ -z "$AGENT_NAME" ]] && continue
          # Skip built-in subagent types
          if echo "$AGENT_NAME" | grep -qE "^($BUILTIN_AGENTS)$"; then
            continue
          fi
          # Try exact name first, then progressively strip namespace prefixes
          # e.g. platform-review-security-reviewer → review-security-reviewer → security-reviewer
          FOUND=""
          SEARCH_NAME="$AGENT_NAME"
          while [[ -z "$FOUND" && -n "$SEARCH_NAME" ]]; do
            FOUND=$(find "$REGISTRY_ROOT/.aw_registry" -path "*/agents/$SEARCH_NAME.md" 2>/dev/null | head -1)
            if [[ -z "$FOUND" ]]; then
              # Strip first segment (up to and including first hyphen)
              NEW_NAME="${SEARCH_NAME#*-}"
              # If stripping didn't change anything, stop
              [[ "$NEW_NAME" == "$SEARCH_NAME" ]] && break
              SEARCH_NAME="$NEW_NAME"
            fi
          done
          if [[ -z "$FOUND" ]]; then
            ERRORS+=("phantom_agent: Command references agent '$AGENT_NAME' but no agents/$AGENT_NAME.md found in registry")
          fi
        done
      fi
      ;;
  esac
fi

# Check: file has minimum content (not just frontmatter)
LINE_COUNT=$(echo "$CONTENT" | wc -l | tr -d ' ')
if [[ "$LINE_COUNT" -lt 20 ]]; then
  WARNINGS+=("too_short: Artifact is only $LINE_COUNT lines (minimum recommended: 20)")
fi

# Check: has at least one markdown heading
if ! echo "$CONTENT" | grep -q '^#'; then
  ERRORS+=("no_heading: No markdown heading found")
fi

# Build JSON output
ERROR_COUNT=${#ERRORS[@]}
WARNING_COUNT=${#WARNINGS[@]}
PASS=$([[ $ERROR_COUNT -eq 0 ]] && echo "true" || echo "false")

{
  echo "{"
  echo "  \"path\": \"$ARTIFACT_PATH\","
  echo "  \"type\": \"$ARTIFACT_TYPE\","
  echo "  \"pass\": $PASS,"
  echo "  \"error_count\": $ERROR_COUNT,"
  echo "  \"warning_count\": $WARNING_COUNT,"

  # Errors array
  echo "  \"errors\": ["
  for i in "${!ERRORS[@]}"; do
    COMMA=$([[ $i -lt $((ERROR_COUNT - 1)) ]] && echo "," || echo "")
    echo "    \"${ERRORS[$i]}\"$COMMA"
  done
  echo "  ],"

  # Warnings array
  echo "  \"warnings\": ["
  for i in "${!WARNINGS[@]}"; do
    COMMA=$([[ $i -lt $((WARNING_COUNT - 1)) ]] && echo "," || echo "")
    echo "    \"${WARNINGS[$i]}\"$COMMA"
  done
  echo "  ]"

  echo "}"
}
