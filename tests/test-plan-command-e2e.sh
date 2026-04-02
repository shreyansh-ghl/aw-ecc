#!/usr/bin/env bash
# End-to-end routing test harness for the experimental aw:plan command.
#
# Usage:
#   ./tests/test-plan-command-e2e.sh                  # Detect and test installed CLIs
#   ./tests/test-plan-command-e2e.sh claude codex    # Test specific CLIs
#   ./tests/test-plan-command-e2e.sh --quick         # Run a smaller smoke suite
#   ./tests/test-plan-command-e2e.sh --turns=2       # Adjust max turns for Claude
#
# This harness does not rely on native slash-command loading. Instead, it
# injects commands/plan.md into the prompt and asks each CLI to apply the
# command's routing logic to a set of requests, then validates the returned JSON.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"
COMMAND_FILE="$REPO_DIR/commands/plan.md"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MAX_TURNS=2
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

cursor_cli_usable() {
  if ! command -v cursor &>/dev/null; then
    return 1
  fi

  if ! command -v cursor-agent &>/dev/null; then
    return 1
  fi

  run_with_timeout 5 cursor-agent --help >/dev/null 2>&1
}

FULL_TEST_CASES=(
  "Create a PRD for the new marketplace onboarding flow.|prd|single|ux;architecture;task-plan;code|PRD single-scope"
  "Research why users abandon the AI marketplace setup flow.|research|single|prd;ux;task-plan;code|Research single-scope"
  "Write a UX brief for onboarding to the marketplace.|ux|single|prd;architecture;task-plan;code|UX single-scope"
  "Plan the implementation for the new billing webhook retry worker.|task-plan|single|ux;design generation;code|Engineering plan single-scope"
  "Create a PRD and UX brief for the first-run marketplace flow.|prd|linked|code;deploy|PRD+UX linked scope"
  "Plan this end to end before development starts: marketplace onboarding.|research|full|code;deploy|Full pre-build planning"
)

QUICK_TEST_CASES=(
  "Create a PRD for the new marketplace onboarding flow.|prd|single|ux;architecture;task-plan;code|PRD single-scope"
  "Plan the implementation for the new billing webhook retry worker.|task-plan|single|ux;design generation;code|Engineering plan single-scope"
)

build_prompt() {
  local request="$1"
  local command_body
  command_body=$(cat "$COMMAND_FILE")
  cat <<EOF
You are running an end-to-end test for a command definition.

Apply the routing logic from the command below to the USER REQUEST.
Do not improve or rewrite the command. Do not execute the command. Classify only.

Return ONLY valid JSON with this exact shape:
{"artifact":"research|prd|ux|architecture|task-plan","breadth":"single|linked|full","in_scope":["..."],"out_of_scope":["..."],"needs_clarification":true|false,"reason":"short string"}

Rules:
- Use the command definition exactly as written.
- If the request is clear, "needs_clarification" must be false.
- "out_of_scope" should reflect areas the command should not drift into for this request.
- Do not wrap the JSON in markdown fences.

COMMAND:
${command_body}

USER REQUEST:
${request}
EOF
}

run_prompt() {
  local cli="$1"
  local prompt="$2"
  local output_file="$3"

  cd "$REPO_DIR"

  case "$cli" in
    claude)
      run_with_timeout 180 claude -p "$prompt" \
        --output-format text \
        --max-turns "$MAX_TURNS" \
        > "$output_file" 2>&1 || true
      ;;
    codex)
      local last_message_file="${output_file%.txt}.last_message.txt"
      rm -f "$last_message_file"
      run_with_timeout 180 codex exec --skip-git-repo-check \
        --output-last-message "$last_message_file" \
        "$prompt" \
        > "$output_file" 2>&1 || true
      if [ -f "$last_message_file" ] && [ -s "$last_message_file" ]; then
        printf "\n" >> "$output_file"
        cat "$last_message_file" >> "$output_file"
      fi
      ;;
    cursor)
      if ! cursor_cli_usable; then
        echo "unsupported_cursor_cli" > "$output_file"
      else
        run_with_timeout 180 cursor-agent -p "$prompt" \
          > "$output_file" 2>&1 || true
      fi
      ;;
    opencode)
      run_with_timeout 180 opencode -p "$prompt" \
        > "$output_file" 2>&1 || true
      ;;
    *)
      echo "Unknown CLI: $cli" > "$output_file"
      return 1
      ;;
  esac
}

extract_and_validate_json() {
  local output_file="$1"
  local expected_artifact="$2"
  local expected_breadth="$3"
  local forbidden="$4"

  python3 - "$output_file" "$expected_artifact" "$expected_breadth" "$forbidden" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
expected_artifact = sys.argv[2]
expected_breadth = sys.argv[3]
forbidden = [item.strip().lower() for item in sys.argv[4].split(";") if item.strip()]

if not path.exists() or path.stat().st_size == 0:
    print("no_output")
    sys.exit(0)

content = path.read_text(errors="ignore").strip()

if "You've hit your limit" in content or "rate limit" in content.lower():
    print("rate_limited")
    sys.exit(0)

if "unsupported_cursor_cli" in content or "'p' is not in the list of known options" in content:
    print("unsupported_cli")
    sys.exit(0)

def find_json_candidates(text: str):
    candidates = []
    stack = []
    start = None
    in_string = False
    escape = False

    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if not stack:
                start = i
            stack.append(ch)
        elif ch == "}" and stack:
            stack.pop()
            if not stack and start is not None:
                candidates.append(text[start:i + 1])
                start = None
    return candidates

payload = None
for candidate in reversed(find_json_candidates(content)):
    try:
        json.loads(candidate)
        payload = candidate
        break
    except Exception:
        continue

if payload is None:
    print("no_json")
    sys.exit(0)

try:
    data = json.loads(payload)
except Exception:
    print("invalid_json")
    sys.exit(0)

artifact = str(data.get("artifact", "")).strip().lower()
breadth = str(data.get("breadth", "")).strip().lower()
out_of_scope = data.get("out_of_scope", [])

if not isinstance(out_of_scope, list):
    print("bad_shape")
    sys.exit(0)

normalized = " ".join(str(item).lower() for item in out_of_scope)

if artifact != expected_artifact:
    print(f"wrong_artifact:{artifact}")
    sys.exit(0)

if breadth != expected_breadth:
    print(f"wrong_breadth:{breadth}")
    sys.exit(0)

missing_forbidden = [item for item in forbidden if item not in normalized]
if missing_forbidden:
    print("missing_out_of_scope:" + ",".join(missing_forbidden))
    sys.exit(0)

print("pass")
PY
}

run_test() {
  local cli="$1"
  local request="$2"
  local expected_artifact="$3"
  local expected_breadth="$4"
  local forbidden="$5"
  local description="$6"
  local test_id="$7"

  local output_file="$RESULTS_DIR/${cli}_${test_id}_${TIMESTAMP}.txt"
  local prompt
  prompt=$(build_prompt "$request")

  printf "  [%d] %-38s " "$test_id" "$description"

  run_prompt "$cli" "$prompt" "$output_file"

  local result
  result=$(extract_and_validate_json "$output_file" "$expected_artifact" "$expected_breadth" "$forbidden")

  case "$result" in
    pass)
      printf "${GREEN}PASS${NC}\n"
      return 0
      ;;
    rate_limited)
      printf "${YELLOW}SKIP${NC} — rate limited\n"
      return 0
      ;;
    unsupported_cli)
      printf "${YELLOW}SKIP${NC} — unsupported local CLI mode\n"
      return 0
      ;;
    no_output|no_json|invalid_json|bad_shape)
      printf "${RED}FAIL${NC} — %s\n" "$result"
      return 1
      ;;
    wrong_artifact:*)
      printf "${RED}FAIL${NC} — expected artifact %s, got %s\n" "$expected_artifact" "${result#wrong_artifact:}"
      return 1
      ;;
    wrong_breadth:*)
      printf "${RED}FAIL${NC} — expected breadth %s, got %s\n" "$expected_breadth" "${result#wrong_breadth:}"
      return 1
      ;;
    missing_out_of_scope:*)
      printf "${RED}FAIL${NC} — missing out_of_scope %s\n" "${result#missing_out_of_scope:}"
      return 1
      ;;
    *)
      printf "${RED}FAIL${NC} — %s\n" "$result"
      return 1
      ;;
  esac
}

run_cli_tests() {
  local cli="$1"
  local pass=0
  local fail=0
  local -a test_cases

  if $QUICK_MODE; then
    test_cases=("${QUICK_TEST_CASES[@]}")
  else
    test_cases=("${FULL_TEST_CASES[@]}")
  fi

  echo ""
  printf "${BLUE}=== Testing: %s (%d tests) ===${NC}\n" "$cli" "${#test_cases[@]}"
  echo ""

  for i in "${!test_cases[@]}"; do
    IFS='|' read -r request expected_artifact expected_breadth forbidden description <<< "${test_cases[$i]}"
    if run_test "$cli" "$request" "$expected_artifact" "$expected_breadth" "$forbidden" "$description" "$i"; then
      ((pass++)) || true
    else
      ((fail++)) || true
    fi
  done

  echo ""
  printf "  Results: ${GREEN}%d passed${NC}, ${RED}%d failed${NC}, %d total\n" "$pass" "$fail" "${#test_cases[@]}"
  return "$fail"
}

generate_report() {
  local report_file="$RESULTS_DIR/plan_command_report_${TIMESTAMP}.md"
  cat > "$report_file" <<EOF
# aw:plan E2E Report

**Date:** $(date '+%Y-%m-%d %H:%M:%S')
**CLIs tested:** $*
**Mode:** $(if $QUICK_MODE; then echo "quick"; else echo "full"; fi)
**Command file:** $COMMAND_FILE

Raw outputs are in:
\`$RESULTS_DIR\`
EOF

  echo ""
  echo "Report: $report_file"
}

detect_clis() {
  local clis=()
  if command -v claude &>/dev/null; then clis+=("claude"); fi
  if command -v codex &>/dev/null; then clis+=("codex"); fi
  if cursor_cli_usable; then clis+=("cursor"); fi
  if command -v opencode &>/dev/null; then clis+=("opencode"); fi
  echo "${clis[@]}"
}

main() {
  local clis_to_test=()

  for arg in "$@"; do
    case "$arg" in
      --quick) QUICK_MODE=true ;;
      --turns=*) MAX_TURNS="${arg#*=}" ;;
      *) clis_to_test+=("$arg") ;;
    esac
  done

  if [ ! -f "$COMMAND_FILE" ]; then
    echo "Missing command file: $COMMAND_FILE"
    exit 1
  fi

  if [ ${#clis_to_test[@]} -eq 0 ]; then
    IFS=' ' read -ra clis_to_test <<< "$(detect_clis)"
  fi

  if [ ${#clis_to_test[@]} -eq 0 ]; then
    echo "No supported CLIs found. Supported: claude, codex, cursor, opencode."
    exit 1
  fi

  echo "======================================="
  echo "  aw:plan E2E Test Harness"
  echo "======================================="
  echo ""
  echo "  CLIs:      ${clis_to_test[*]}"
  echo "  Mode:      $(if $QUICK_MODE; then echo 'quick'; else echo 'full'; fi)"
  echo "  Turns:     $MAX_TURNS"
  echo "  Results:   $RESULTS_DIR/"

  local total_failures=0

  for cli in "${clis_to_test[@]}"; do
    if [ "$cli" = "cursor" ] && ! cursor_cli_usable; then
      printf "\n${YELLOW}SKIP${NC}: %s not usable in local non-interactive mode\n" "$cli"
      continue
    fi
    if [ "$cli" != "cursor" ] && ! command -v "$cli" &>/dev/null; then
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
