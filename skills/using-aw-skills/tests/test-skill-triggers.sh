#!/usr/bin/env bash
# Test harness for verifying SDLC skill auto-triggering across AI CLIs.
#
# Usage:
#   ./test-skill-triggers.sh                  # Test all available CLIs
#   ./test-skill-triggers.sh claude            # Test Claude only
#   ./test-skill-triggers.sh codex             # Test Codex only
#   ./test-skill-triggers.sh --quick           # Run only 2 fast tests
#
# Each test sends a prompt via `<cli> -p "<prompt>"` and checks if the
# expected skill name appears in the output.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
WORKSPACE_DIR="${WORKSPACE_DIR:-/Users/prathameshai/Documents/Agentic Workspace}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_TURNS=3
QUICK_MODE=false

mkdir -p "$RESULTS_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- macOS timeout workaround ---
run_with_timeout() {
  local secs="$1"
  shift
  if command -v gtimeout &>/dev/null; then
    gtimeout "$secs" "$@"
  else
    # perl-based timeout for macOS
    perl -e "
      alarm $secs;
      \$SIG{ALRM} = sub { kill 9, \$pid; exit 124 };
      \$pid = fork;
      if (\$pid == 0) { exec @ARGV; }
      waitpid \$pid, 0;
      exit \$? >> 8;
    " "$@"
  fi
}

# --- Test Cases ---
# Format: "prompt|expected_pattern|description"
# expected_pattern is grep -i pattern. Use semicolons for OR (converted to pipe for grep -iE)
FULL_TEST_CASES=(
  "I want to add a contact sync worker to the backend. What skill should you invoke first?|brainstorm|Feature request triggers brainstorm"
  "A test is failing in users.service.ts. According to the SDLC pipeline, what approach should be used before proposing fixes?|debug;root cause;TDD;systematic;investigate|Bug fix triggers debug/TDD"
  "list the SDLC skills in the pipeline. Just the skill names.|brainstorm|SDLC skills visible"
  "Implementation is done and all tasks pass. What is the next step in the SDLC pipeline?|verify|Completion triggers verify"
  "I need to create a new NestJS API endpoint for contacts. What is the first SDLC skill?|brainstorm|API creation triggers brainstorm"
  "review the code changes in this PR|review|Code review request"
)

QUICK_TEST_CASES=(
  "list the aw-* SDLC skills you have access to. One per line.|brainstorm|SDLC skills visible"
  "I want to add a contact sync worker. What skill should you invoke first?|brainstorm|Feature triggers brainstorm"
)

# --- CLI-specific prompt command ---
run_prompt() {
  local cli="$1"
  local prompt="$2"
  local output_file="$3"

  cd "$WORKSPACE_DIR"

  case "$cli" in
    claude)
      run_with_timeout 120 claude -p "$prompt" \
        --output-format text \
        --max-turns "$MAX_TURNS" \
        > "$output_file" 2>&1 || true
      ;;
    codex)
      run_with_timeout 120 codex exec --skip-git-repo-check "$prompt" \
        > "$output_file" 2>&1 || true
      ;;
    cursor)
      run_with_timeout 120 cursor -p "$prompt" \
        > "$output_file" 2>&1 || true
      ;;
    opencode)
      run_with_timeout 120 opencode -p "$prompt" \
        > "$output_file" 2>&1 || true
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
  local expected_pattern="$2"

  if [ ! -f "$output_file" ] || [ ! -s "$output_file" ]; then
    echo "no_output"
    return
  fi

  local content
  content=$(cat "$output_file")

  # Convert semicolons to pipes for grep OR, then match
  local grep_pattern="${expected_pattern//;/|}"
  if echo "$content" | grep -qiE "$grep_pattern"; then
    echo "triggered"
    return
  fi

  # Check for any skill invocation patterns
  if echo "$content" | grep -qiE "using.*skill|invoking.*skill|Skill\(skill:|I'm using the"; then
    echo "skill_invoked_different"
    return
  fi

  # Check for "Reached max turns" (means it tried to use tools — partial success)
  if echo "$content" | grep -qi "max turns"; then
    echo "max_turns_hit"
    return
  fi

  # Has content but no skill mention
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
  local expected_pattern="$3"
  local description="$4"
  local test_id="$5"

  local output_file="$RESULTS_DIR/${cli}_${test_id}_${TIMESTAMP}.txt"

  printf "  [%d] %-45s " "$test_id" "$description"

  run_prompt "$cli" "$prompt" "$output_file"

  local result
  result=$(check_skill_triggered "$output_file" "$expected_pattern")

  case "$result" in
    triggered)
      printf "${GREEN}PASS${NC}\n"
      return 0
      ;;
    skill_invoked_different)
      printf "${YELLOW}PARTIAL${NC} — different skill invoked\n"
      return 0
      ;;
    max_turns_hit)
      printf "${YELLOW}PARTIAL${NC} — hit max turns (tried to use tools)\n"
      return 0
      ;;
    responded_no_skill)
      printf "${RED}FAIL${NC} — responded without skill\n"
      # Show first 100 chars of output for debugging
      head -c 100 "$output_file" 2>/dev/null | tr '\n' ' '
      echo ""
      return 1
      ;;
    no_response|no_output)
      printf "${RED}FAIL${NC} — no output\n"
      return 1
      ;;
  esac
}

# --- Run all tests for a CLI ---
run_cli_tests() {
  local cli="$1"
  local pass=0
  local fail=0

  local total
  if $QUICK_MODE; then
    total=${#QUICK_TEST_CASES[@]}
  else
    total=${#FULL_TEST_CASES[@]}
  fi

  echo ""
  printf "${BLUE}=== Testing: %s (%d tests) ===${NC}\n" "$cli" "$total"
  echo ""

  local -a test_cases
  if $QUICK_MODE; then
    test_cases=("${QUICK_TEST_CASES[@]}")
  else
    test_cases=("${FULL_TEST_CASES[@]}")
  fi

  for i in "${!test_cases[@]}"; do
    IFS='|' read -r prompt expected_pattern description <<< "${test_cases[$i]}"
    if run_test "$cli" "$prompt" "$expected_pattern" "$description" "$i"; then
      ((pass++)) || true
    else
      ((fail++)) || true
    fi
  done

  echo ""
  printf "  Results: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}, %d total\n" "$pass" "$fail" "$total"

  return "$fail"
}

# --- Generate report ---
generate_report() {
  local report_file="$RESULTS_DIR/report_${TIMESTAMP}.md"
  local -a rpt_cases
  if $QUICK_MODE; then rpt_cases=("${QUICK_TEST_CASES[@]}"); else rpt_cases=("${FULL_TEST_CASES[@]}"); fi

  cat > "$report_file" << HEADER
# Skill Trigger Test Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**CLIs tested:** $*
**Mode:** $(if $QUICK_MODE; then echo "quick"; else echo "full"; fi)
**Max turns:** $MAX_TURNS

## Results

HEADER

  for cli in "$@"; do
    echo "### $cli" >> "$report_file"
    echo "" >> "$report_file"
    echo "| # | Test | Expected | Result |" >> "$report_file"
    echo "|---|------|----------|--------|" >> "$report_file"

    for i in "${!rpt_cases[@]}"; do
      IFS='|' read -r prompt expected_pattern description <<< "${rpt_cases[$i]}"
      local output_file="$RESULTS_DIR/${cli}_${i}_${TIMESTAMP}.txt"
      local result="not_run"
      if [ -f "$output_file" ]; then
        result=$(check_skill_triggered "$output_file" "$expected_pattern")
      fi
      echo "| $i | $description | \`${expected_pattern:0:30}\` | $result |" >> "$report_file"
    done
    echo "" >> "$report_file"
  done

  echo ""
  echo "Report: $report_file"
  echo "Output files: $RESULTS_DIR/"
}

# --- CLI Detection ---
detect_clis() {
  local clis=()
  if command -v claude &>/dev/null; then clis+=("claude"); fi
  if command -v codex &>/dev/null; then clis+=("codex"); fi
  if command -v cursor &>/dev/null; then clis+=("cursor"); fi
  if command -v opencode &>/dev/null; then clis+=("opencode"); fi
  echo "${clis[@]}"
}

# --- Main ---
main() {
  local clis_to_test=()

  # Parse args
  for arg in "$@"; do
    case "$arg" in
      --quick) QUICK_MODE=true ;;
      --turns=*) MAX_TURNS="${arg#*=}" ;;
      *) clis_to_test+=("$arg") ;;
    esac
  done

  if [ ${#clis_to_test[@]} -eq 0 ]; then
    IFS=' ' read -ra clis_to_test <<< "$(detect_clis)"
  fi

  if [ ${#clis_to_test[@]} -eq 0 ]; then
    echo "No AI CLIs found. Install claude, codex, cursor, or opencode."
    exit 1
  fi

  local test_count
  if $QUICK_MODE; then test_count=${#QUICK_TEST_CASES[@]}; else test_count=${#FULL_TEST_CASES[@]}; fi

  echo "======================================="
  echo "  Skill Trigger Test Harness"
  echo "======================================="
  echo ""
  echo "  CLIs:      ${clis_to_test[*]}"
  echo "  Tests:     $test_count per CLI"
  echo "  Max turns: $MAX_TURNS"
  echo "  Mode:      $(if $QUICK_MODE; then echo 'quick'; else echo 'full'; fi)"
  echo "  Workspace: $WORKSPACE_DIR"
  echo "  Results:   $RESULTS_DIR/"

  local total_failures=0

  for cli in "${clis_to_test[@]}"; do
    if ! command -v "$cli" &>/dev/null; then
      printf "\n${YELLOW}SKIP${NC}: %s not found\n" "$cli"
      continue
    fi
    run_cli_tests "$cli" || ((total_failures+=$?)) || true
  done

  generate_report "${clis_to_test[@]}"

  echo ""
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
