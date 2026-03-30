#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

MODE="${1:-all}"
: "${AW_SDLC_EVAL_REF:=WORKTREE}"
export AW_SDLC_EVAL_REF

run() {
  echo
  echo "==> $1"
  shift
  "$@"
}

run_optional_test_group() {
  local pattern="$1"
  local title_prefix="$2"
  local matched=0

  while IFS= read -r test_file; do
    [[ -n "$test_file" ]] || continue
    matched=1
    run "$title_prefix $(basename "$test_file" .js)" node "$test_file"
  done < <(find "$ROOT_DIR/tests/evals" -maxdepth 1 -type f -name "$pattern" | sort)

  return 0
}

run_deterministic() {
  run "Goal gates" node "$ROOT_DIR/tests/evals/aw-sdlc-goal-gates.test.js"
  run "Command contract completeness" node "$ROOT_DIR/tests/evals/aw-sdlc-command-contract-completeness.test.js"
  run "Command/skill mapping" node "$ROOT_DIR/tests/evals/aw-sdlc-command-skill-mapping.test.js"
  run "Command quality" node "$ROOT_DIR/tests/evals/aw-sdlc-command-quality.test.js"
  run "Command boundaries" node "$ROOT_DIR/tests/evals/aw-sdlc-command-boundaries.test.js"
  run "Ship command" node "$ROOT_DIR/tests/evals/aw-sdlc-ship-command.test.js"
  run "Customer coverage" node "$ROOT_DIR/tests/evals/aw-sdlc-customer-coverage.test.js"
  run "Default session coverage" node "$ROOT_DIR/tests/evals/aw-sdlc-default-session-coverage.test.js"
  run "Session hook precedence" node "$ROOT_DIR/tests/evals/aw-sdlc-session-hook-precedence.test.js"
  run "GHL staging baselines" node "$ROOT_DIR/tests/evals/aw-sdlc-ghl-staging-baselines.test.js"
  run "Eval workspace isolation" node "$ROOT_DIR/tests/evals/aw-sdlc-eval-workspace-isolation.test.js"
  run_optional_test_group "aw-sdlc-plan-*.test.js" "Plan"
  run_optional_test_group "aw-sdlc-brainstorm-*.test.js" "Brainstorm"
  run_optional_test_group "aw-sdlc-prepare-*.test.js" "Preparation"
  run_optional_test_group "aw-sdlc-execute-*.test.js" "Execution"
  run_optional_test_group "aw-sdlc-verify-*.test.js" "Verification"
  run_optional_test_group "aw-sdlc-finish-*.test.js" "Finish"
  run_optional_test_group "aw-sdlc-install*.test.js" "Installability"
  run "Real coverage" node "$ROOT_DIR/tests/evals/aw-sdlc-real-coverage.test.js"
}

run_live() {
  run "Public routing (Codex)" node "$ROOT_DIR/tests/evals/aw-sdlc-codex-routing.test.js"
  run "Stage resolution (Codex)" node "$ROOT_DIR/tests/evals/aw-sdlc-stage-resolution.test.js"
  run "Customer behavior core (Codex)" node "$ROOT_DIR/tests/evals/aw-sdlc-customer-behavior.test.js"
}

run_live_full() {
  AW_SDLC_EVAL_SUITE=full run "Customer behavior full (Codex)" node "$ROOT_DIR/tests/evals/aw-sdlc-customer-behavior.test.js"
}

run_real() {
  run "Real outcomes (Codex)" node "$ROOT_DIR/tests/evals/aw-sdlc-real-outcomes.test.js"
}

run_real_parallel() {
  run "Real outcomes parallel (Codex)" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-real-parallel.sh"
}

case "$MODE" in
  deterministic)
    run_deterministic
    ;;
  live)
    run_live
    ;;
  live-full)
    run_live
    run_live_full
    ;;
  real)
    run_real
    ;;
  real-parallel)
    run_real_parallel
    ;;
  all)
    run_deterministic
    run_live
    ;;
  *)
    echo "Usage: $0 [deterministic|live|live-full|real|real-parallel|all]" >&2
    exit 1
    ;;
esac
