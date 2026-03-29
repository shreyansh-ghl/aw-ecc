#!/usr/bin/env bash
# Test harness for verifying SDLC skill auto-triggering across AI CLIs.
#
# Usage:
#   ./test-skill-triggers.sh                  # Test all available CLIs
#   ./test-skill-triggers.sh claude            # Test Claude only
#   ./test-skill-triggers.sh codex             # Test Codex only
#   ./test-skill-triggers.sh claude codex      # Test specific CLIs
#
# Each test sends a prompt via `<cli> -p "<prompt>"` and checks if the
# expected skill name appears in the output.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
WORKSPACE_DIR="/Users/prathameshai/Documents/Agentic Workspace"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$RESULTS_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- Test Cases ---
# Format: "prompt|expected_skill|description"
TEST_CASES=(
  "add a contact sync worker to the backend|aw-brainstorm|Feature request triggers brainstorm"
  "fix the failing test in users.service.ts|systematic-debugging|Bug fix triggers debug mode"
  "what skills are available|using-aw-skills|Skill discovery query"
  "create a new API endpoint for contacts|aw-brainstorm|API creation triggers brainstorm"
  "review the code I just wrote|code-review|Code review request"
  "deploy this to staging|deploy|Deploy request"
)

# --- CLI Detection ---
detect_clis() {
  local clis=()
  if command -v claude &>/dev/null; then clis+=("claude"); fi
  if command -v codex &>/dev/null; then clis+=("codex"); fi
  if command -v cursor &>/dev/null; then clis+=("cursor"); fi
  if command -v opencode &>/dev/null; then clis+=("opencode"); fi
  echo "${clis[@]}"
}

# --- CLI-specific prompt command ---
run_prompt() {
  local cli="$1"
  local prompt="$2"
  local output_file="$3"
  local timeout_sec=120

  case "$cli" in
    claude)
      timeout "$timeout_sec" claude -p "$prompt" \
        --output-format text \
        --max-turns 1 \
        2>&1 > "$output_file" || true
      ;;
    codex)
      timeout "$timeout_sec" codex exec \
        -p "$prompt" \
        --max-turns 1 \
        2>&1 > "$output_file" || true
      ;;
    cursor)
      # Cursor CLI uses similar syntax
      timeout "$timeout_sec" cursor -p "$prompt" \
        2>&1 > "$output_file" || true
      ;;
    opencode)
      timeout "$timeout_sec" opencode -p "$prompt" \
        2>&1 > "$output_file" || true
      ;;
    *)
      echo "Unknown CLI: $cli" > "$output_file"
      return 1
      ;;
  esac
}

# --- Check output for skill trigger ---
check_skill_triggered() {
  local output_file="$1"
  local expected_skill="$2"

  if [ ! -f "$output_file" ]; then
    echo "no_output"
    return
  fi

  local content
  content=$(cat "$output_file")

  # Check for skill name mention (case insensitive)
  if echo "$content" | grep -qi "$expected_skill"; then
    echo "triggered"
    return
  fi

  # Check for common skill invocation patterns
  if echo "$content" | grep -qi "using.*skill\|invoking.*skill\|Skill(skill:"; then
    echo "skill_invoked_different"
    return
  fi

  # Check if it just answered without triggering a skill
  if [ ${#content} -gt 50 ]; then
    echo "responded_no_skill"
    return
  fi

  echo "no_response"
}

# --- Run single test ---
run_test() {
  local cli="$1"
  local prompt="$2"
  local expected_skill="$3"
  local description="$4"
  local test_id="$5"

  local output_file="$RESULTS_DIR/${cli}_${test_id}_${TIMESTAMP}.txt"

  printf "  %-50s " "$description"

  run_prompt "$cli" "$prompt" "$output_file"

  local result
  result=$(check_skill_triggered "$output_file" "$expected_skill")

  case "$result" in
    triggered)
      printf "${GREEN}PASS${NC} — %s triggered\n" "$expected_skill"
      return 0
      ;;
    skill_invoked_different)
      printf "${YELLOW}PARTIAL${NC} — skill invoked but not %s\n" "$expected_skill"
      return 0
      ;;
    responded_no_skill)
      printf "${RED}FAIL${NC} — responded without invoking skill\n"
      return 1
      ;;
    no_response)
      printf "${RED}FAIL${NC} — no response\n"
      return 1
      ;;
    no_output)
      printf "${RED}FAIL${NC} — no output file\n"
      return 1
      ;;
  esac
}

# --- Run all tests for a CLI ---
run_cli_tests() {
  local cli="$1"
  local pass=0
  local fail=0
  local total=${#TEST_CASES[@]}

  echo ""
  printf "${BLUE}=== Testing: %s ===${NC}\n" "$cli"
  echo ""

  for i in "${!TEST_CASES[@]}"; do
    IFS='|' read -r prompt expected_skill description <<< "${TEST_CASES[$i]}"
    if run_test "$cli" "$prompt" "$expected_skill" "$description" "$i"; then
      ((pass++))
    else
      ((fail++))
    fi
  done

  echo ""
  printf "  Results: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}, %d total\n" "$pass" "$fail" "$total"
  echo ""

  return "$fail"
}

# --- Generate report ---
generate_report() {
  local report_file="$RESULTS_DIR/report_${TIMESTAMP}.md"

  cat > "$report_file" << EOF
# Skill Trigger Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**CLIs tested:** $*
**Workspace:** $WORKSPACE_DIR

## Results

EOF

  for cli in "$@"; do
    echo "### $cli" >> "$report_file"
    echo "" >> "$report_file"
    echo "| # | Prompt | Expected Skill | Result |" >> "$report_file"
    echo "|---|--------|---------------|--------|" >> "$report_file"

    for i in "${!TEST_CASES[@]}"; do
      IFS='|' read -r prompt expected_skill description <<< "${TEST_CASES[$i]}"
      local output_file="$RESULTS_DIR/${cli}_${i}_${TIMESTAMP}.txt"
      local result
      if [ -f "$output_file" ]; then
        result=$(check_skill_triggered "$output_file" "$expected_skill")
      else
        result="not_run"
      fi
      echo "| $i | $description | \`$expected_skill\` | $result |" >> "$report_file"
    done

    echo "" >> "$report_file"
  done

  echo "Report saved: $report_file"
}

# --- Main ---
main() {
  local clis_to_test=()

  if [ $# -gt 0 ]; then
    clis_to_test=("$@")
  else
    IFS=' ' read -ra clis_to_test <<< "$(detect_clis)"
  fi

  if [ ${#clis_to_test[@]} -eq 0 ]; then
    echo "No AI CLIs found. Install claude, codex, cursor, or opencode."
    exit 1
  fi

  echo "======================================="
  echo "  Skill Trigger Test Harness"
  echo "======================================="
  echo ""
  echo "CLIs: ${clis_to_test[*]}"
  echo "Tests: ${#TEST_CASES[@]} per CLI"
  echo "Results: $RESULTS_DIR/"
  echo ""

  local total_failures=0

  for cli in "${clis_to_test[@]}"; do
    if ! command -v "$cli" &>/dev/null; then
      printf "${YELLOW}SKIP${NC}: %s not found\n" "$cli"
      continue
    fi
    run_cli_tests "$cli" || ((total_failures+=$?))
  done

  generate_report "${clis_to_test[@]}"

  echo "======================================="
  if [ "$total_failures" -eq 0 ]; then
    printf "  ${GREEN}ALL TESTS PASSED${NC}\n"
  else
    printf "  ${RED}%d FAILURES${NC}\n" "$total_failures"
  fi
  echo "======================================="

  exit "$total_failures"
}

main "$@"
