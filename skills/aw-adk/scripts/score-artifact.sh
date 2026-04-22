#!/usr/bin/env bash
# score-artifact.sh — Applies quality rubric to a CASRE artifact
# Usage: bash skills/aw-adk/scripts/score-artifact.sh <path> <type>
# Types: command | agent | skill | rule | eval
#
# This script performs structural scoring (presence/absence of sections).
# For deeper qualitative scoring, use the ADK skill's score mode which
# applies the full rubric with LLM judgment.
#
# Returns JSON with per-dimension scores and tier assignment.

set -euo pipefail

ARTIFACT_PATH="${1:-}"
ARTIFACT_TYPE="${2:-}"

if [[ -z "$ARTIFACT_PATH" || -z "$ARTIFACT_TYPE" ]]; then
  echo '{"error": "Usage: score-artifact.sh <path> <type>"}' >&2
  exit 1
fi

if [[ ! -f "$ARTIFACT_PATH" ]]; then
  echo "{\"error\": \"File not found: $ARTIFACT_PATH\"}" >&2
  exit 1
fi

CONTENT=$(cat "$ARTIFACT_PATH")

# Helper: check if content matches pattern (case-insensitive), return 1 if found
has_pattern() {
  if echo "$CONTENT" | grep -qi "$1" 2>/dev/null; then
    echo 1
  else
    echo 0
  fi
}

# Helper: count occurrences of pattern
count_pattern() {
  local count
  count=$(echo "$CONTENT" | grep -ci "$1" 2>/dev/null) || true
  echo "${count:-0}"
}

# Scoring function: returns 0-10 based on presence/quality signals
score_dimension() {
  local name="$1"
  local score=0

  case "$name" in
    frontmatter)
      [[ $(has_pattern '^---$') -eq 1 ]] && score=$((score + 3))
      [[ $(has_pattern '^name:') -eq 1 ]] && score=$((score + 3))
      [[ $(has_pattern '^description:') -eq 1 ]] && score=$((score + 2))
      [[ $(has_pattern '^trigger:') -eq 1 ]] && score=$((score + 2))
      ;;
    sections)
      HEADING_COUNT=$(count_pattern '^##')
      if [[ $HEADING_COUNT -ge 8 ]]; then score=10
      elif [[ $HEADING_COUNT -ge 5 ]]; then score=7
      elif [[ $HEADING_COUNT -ge 3 ]]; then score=5
      elif [[ $HEADING_COUNT -ge 1 ]]; then score=3
      fi
      ;;
    code_examples)
      CODE_BLOCKS=$(echo "$CONTENT" | grep -c '```' 2>/dev/null) || true
      CODE_BLOCKS=${CODE_BLOCKS:-0}
      CODE_BLOCKS=$((CODE_BLOCKS / 2))  # pairs of ```
      if [[ $CODE_BLOCKS -ge 3 ]]; then score=10
      elif [[ $CODE_BLOCKS -ge 2 ]]; then score=7
      elif [[ $CODE_BLOCKS -ge 1 ]]; then score=5
      fi
      ;;
    length)
      WORD_COUNT=$(echo "$CONTENT" | wc -w | tr -d ' ')
      if [[ $WORD_COUNT -ge 200 && $WORD_COUNT -le 5000 ]]; then score=10
      elif [[ $WORD_COUNT -ge 100 ]]; then score=7
      elif [[ $WORD_COUNT -ge 50 ]]; then score=5
      elif [[ $WORD_COUNT -ge 20 ]]; then score=3
      fi
      ;;
    checklists)
      CHECKLIST_ITEMS=$(count_pattern '^\- \[')
      TABLE_ROWS=$(count_pattern '^\|')
      TOTAL=$((CHECKLIST_ITEMS + TABLE_ROWS))
      if [[ $TOTAL -ge 10 ]]; then score=10
      elif [[ $TOTAL -ge 5 ]]; then score=7
      elif [[ $TOTAL -ge 2 ]]; then score=5
      elif [[ $TOTAL -ge 1 ]]; then score=3
      fi
      ;;
  esac

  echo $score
}

# Score universal dimensions
D_FRONTMATTER=$(score_dimension "frontmatter")
D_SECTIONS=$(score_dimension "sections")
D_CODE=$(score_dimension "code_examples")
D_LENGTH=$(score_dimension "length")
D_CHECKLISTS=$(score_dimension "checklists")

# Type-specific dimensions (structural check only)
D_TYPE_1=0
D_TYPE_2=0
D_TYPE_3=0
D_TYPE_4=0
D_TYPE_5=0

case "$ARTIFACT_TYPE" in
  command)
    [[ $(has_pattern 'protocol\|AW-PROTOCOL') -eq 1 ]] && D_TYPE_1=7 || D_TYPE_1=0
    [[ $(has_pattern 'agent.*roster\|## Agent') -eq 1 ]] && D_TYPE_2=7 || D_TYPE_2=0
    [[ $(has_pattern 'skill.*load\|loading gate') -eq 1 ]] && D_TYPE_3=7 || D_TYPE_3=0
    [[ $(has_pattern 'phase') -eq 1 ]] && D_TYPE_4=7 || D_TYPE_4=0
    [[ $(has_pattern 'checkpoint\|human') -eq 1 ]] && D_TYPE_5=7 || D_TYPE_5=0
    ;;
  agent)
    [[ $(has_pattern 'identity\|personality') -eq 1 ]] && D_TYPE_1=7 || D_TYPE_1=0
    [[ $(has_pattern 'core mission\|## Mission') -eq 1 ]] && D_TYPE_2=7 || D_TYPE_2=0
    [[ $(has_pattern 'critical rules\|## Rules') -eq 1 ]] && D_TYPE_3=7 || D_TYPE_3=0
    [[ $(has_pattern 'deliverable') -eq 1 ]] && D_TYPE_4=7 || D_TYPE_4=0
    [[ $(has_pattern 'communication\|voice') -eq 1 ]] && D_TYPE_5=7 || D_TYPE_5=0
    ;;
  skill)
    [[ $(has_pattern 'when to use') -eq 1 ]] && D_TYPE_1=7 || D_TYPE_1=0
    [[ $(has_pattern 'quick start\|## Instructions') -eq 1 ]] && D_TYPE_2=7 || D_TYPE_2=0
    [[ $(has_pattern 'reference') -eq 1 ]] && D_TYPE_3=7 || D_TYPE_3=0
    [[ $(has_pattern 'output format\|## Output') -eq 1 ]] && D_TYPE_4=7 || D_TYPE_4=0
    [[ $(has_pattern 'progressive\|disclosure') -eq 1 ]] && D_TYPE_5=5 || D_TYPE_5=0
    ;;
  rule)
    [[ $(has_pattern 'WRONG\|wrong') -eq 1 ]] && D_TYPE_1=7 || D_TYPE_1=0
    [[ $(has_pattern 'RIGHT\|right\|correct') -eq 1 ]] && D_TYPE_2=7 || D_TYPE_2=0
    [[ $(has_pattern 'MUST\|SHOULD\|severity') -eq 1 ]] && D_TYPE_3=7 || D_TYPE_3=0
    [[ $(has_pattern 'automat\|enforce\|lint') -eq 1 ]] && D_TYPE_4=7 || D_TYPE_4=0
    [[ $(has_pattern 'manifest\|coverage') -eq 1 ]] && D_TYPE_5=5 || D_TYPE_5=0
    ;;
  eval)
    [[ $(has_pattern 'scenario') -eq 1 ]] && D_TYPE_1=7 || D_TYPE_1=0
    [[ $(has_pattern 'grader\|assert') -eq 1 ]] && D_TYPE_2=7 || D_TYPE_2=0
    [[ $(has_pattern 'pass.*criter\|expected') -eq 1 ]] && D_TYPE_3=7 || D_TYPE_3=0
    [[ $(has_pattern 'fail\|edge.*case') -eq 1 ]] && D_TYPE_4=7 || D_TYPE_4=0
    [[ $(has_pattern 'baseline\|reproduc') -eq 1 ]] && D_TYPE_5=5 || D_TYPE_5=0
    ;;
esac

TOTAL=$((D_FRONTMATTER + D_SECTIONS + D_CODE + D_LENGTH + D_CHECKLISTS + D_TYPE_1 + D_TYPE_2 + D_TYPE_3 + D_TYPE_4 + D_TYPE_5))

# Assign tier
if [[ $TOTAL -ge 90 ]]; then TIER="S"
elif [[ $TOTAL -ge 75 ]]; then TIER="A"
elif [[ $TOTAL -ge 60 ]]; then TIER="B"
elif [[ $TOTAL -ge 40 ]]; then TIER="C"
else TIER="D"
fi

cat <<EOF
{
  "path": "$ARTIFACT_PATH",
  "type": "$ARTIFACT_TYPE",
  "total": $TOTAL,
  "tier": "$TIER",
  "dimensions": {
    "frontmatter": $D_FRONTMATTER,
    "sections": $D_SECTIONS,
    "code_examples": $D_CODE,
    "length": $D_LENGTH,
    "checklists": $D_CHECKLISTS,
    "type_specific_1": $D_TYPE_1,
    "type_specific_2": $D_TYPE_2,
    "type_specific_3": $D_TYPE_3,
    "type_specific_4": $D_TYPE_4,
    "type_specific_5": $D_TYPE_5
  },
  "note": "Structural scoring only. For qualitative rubric scoring, use the ADK skill score mode."
}
EOF
