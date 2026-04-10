#!/usr/bin/env bash
# Test harness for verifying SDLC skill auto-triggering across AI CLIs.
# Public AW surface under test: /aw:plan, /aw:build, /aw:investigate,
# /aw:test, /aw:review, /aw:deploy, and /aw:ship.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
CASES_FILE="$SCRIPT_DIR/skill-trigger-cases.tsv"
DEFAULT_WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-$DEFAULT_WORKSPACE_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_TURNS=3
QUICK_MODE=false

mkdir -p "$RESULTS_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

run_with_timeout() {
  local secs="$1"
  shift
  if command -v gtimeout &>/dev/null; then
    gtimeout "$secs" "$@"
  else
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

load_test_cases() {
  local mode_filter="$1"
  local -n out_cases="$2"

  if [ ! -f "$CASES_FILE" ]; then
    echo "Missing cases file: $CASES_FILE" >&2
    exit 1
  fi

  while IFS=$'\t' read -r mode prompt expected_pattern description expected_route primary_skill supporting_skills; do
    if [ -z "${mode:-}" ] || [[ "$mode" == \#* ]]; then
      continue
    fi

    if [ "$mode_filter" = "quick" ] && [ "$mode" != "quick" ]; then
      continue
    fi

    out_cases+=("$prompt|$expected_pattern|$description|$expected_route|$primary_skill|$supporting_skills")
  done < "$CASES_FILE"
}

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
      run_with_timeout 120 codex exec --skip-git-repo-check --sandbox read-only "$prompt" \
        > "$output_file" 2>&1 || true
      ;;
    cursor)
      run_with_timeout 120 cursor -p "$prompt" > "$output_file" 2>&1 || true
      ;;
    opencode)
      run_with_timeout 120 opencode -p "$prompt" > "$output_file" 2>&1 || true
      ;;
    *)
      echo "Unknown CLI: $cli" > "$output_file"
      return 1
      ;;
  esac
}

check_skill_triggered() {
  local output_file="$1"
  local expected_pattern="$2"

  if [ ! -f "$output_file" ] || [ ! -s "$output_file" ]; then
    echo "no_output"
    return
  fi

  local content
  content=$(cat "$output_file")

  local grep_pattern="${expected_pattern//;/|}"
  if echo "$content" | grep -qiE "$grep_pattern"; then
    echo "triggered"
    return
  fi

  if echo "$content" | grep -qiE "using.*skill|invoking.*skill|Skill\(skill:|I'm using the"; then
    echo "skill_invoked_different"
    return
  fi

  if echo "$content" | grep -qi "max turns"; then
    echo "max_turns_hit"
    return
  fi

  if [ ${#content} -gt 50 ]; then
    echo "responded_no_skill"
    return
  fi

  echo "no_response"
}

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
