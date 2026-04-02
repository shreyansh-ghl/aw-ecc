#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULT_DIR="$ROOT_DIR/tests/results/real-outcomes-$(date +%Y%m%d-%H%M%S)"
PARALLELISM="${AW_SDLC_EVAL_PARALLELISM:-2}"

: "${AW_SDLC_EVAL_REF:=WORKTREE}"
: "${AW_SDLC_EVAL_CLI:=codex}"
: "${AW_SDLC_EVAL_WORKSPACE_MODE:=git-init}"
: "${AW_SDLC_EVAL_WORKSPACE_BASE_DIR:=$RESULT_DIR/workspaces}"

mkdir -p "$RESULT_DIR"
mkdir -p "$AW_SDLC_EVAL_WORKSPACE_BASE_DIR"

CASE_IDS=()
while IFS= read -r case_id; do
  [[ -n "$case_id" ]] || continue
  CASE_IDS+=("$case_id")
done < <(node "$ROOT_DIR/tests/evals/aw-sdlc-real-outcomes.test.js" --list-cases)

run_case() {
  local case_id="$1"
  local log_file="$RESULT_DIR/${case_id}.log"
  local exit_file="$RESULT_DIR/${case_id}.exit"

  if AW_SDLC_REAL_CASE="$case_id" \
    AW_SDLC_EVAL_REF="$AW_SDLC_EVAL_REF" \
    AW_SDLC_EVAL_CLI="$AW_SDLC_EVAL_CLI" \
    AW_SDLC_EVAL_WORKSPACE_MODE="$AW_SDLC_EVAL_WORKSPACE_MODE" \
    node "$ROOT_DIR/tests/evals/aw-sdlc-real-outcomes.test.js" >"$log_file" 2>&1; then
    echo 0 > "$exit_file"
  else
    echo $? > "$exit_file"
  fi
}

export ROOT_DIR RESULT_DIR AW_SDLC_EVAL_REF AW_SDLC_EVAL_CLI AW_SDLC_EVAL_WORKSPACE_MODE AW_SDLC_EVAL_WORKSPACE_BASE_DIR
export -f run_case

printf '%s\n' "${CASE_IDS[@]}" | xargs -I{} -P "$PARALLELISM" bash -lc 'run_case "$@"' _ {}

passed=0
failed=0

echo
echo "=== AW SDLC Real Outcomes Parallel Summary ==="
echo "Result dir: $RESULT_DIR"
echo "Workspace mode: $AW_SDLC_EVAL_WORKSPACE_MODE"
echo "Workspace base dir: $AW_SDLC_EVAL_WORKSPACE_BASE_DIR"
echo "Parallelism: $PARALLELISM"

for case_id in "${CASE_IDS[@]}"; do
  exit_code="$(cat "$RESULT_DIR/${case_id}.exit")"
  if [[ "$exit_code" == "0" ]]; then
    echo "  PASS $case_id"
    passed=$((passed + 1))
  else
    echo "  FAIL $case_id (exit=$exit_code) — see $RESULT_DIR/${case_id}.log"
    failed=$((failed + 1))
  fi
done

echo
echo "Passed: $passed"
echo "Failed: $failed"

if [[ "$failed" -gt 0 ]]; then
  exit 1
fi
