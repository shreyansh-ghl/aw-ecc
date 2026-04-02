#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVALS_DIR="$ROOT_DIR/tests/evals"
DETERMINISTIC_DIR="$EVALS_DIR/deterministic"
LIVE_DIR="$EVALS_DIR/live"
REAL_DIR="$EVALS_DIR/real"

MODE="${1:-all}"
: "${AW_SDLC_EVAL_REF:=WORKTREE}"
export AW_SDLC_EVAL_REF

ensure_real_workspace_base() {
  if [[ -z "${AW_SDLC_EVAL_WORKSPACE_BASE_DIR:-}" ]]; then
    AW_SDLC_EVAL_WORKSPACE_BASE_DIR="$ROOT_DIR/tests/results/real-workspaces-$(date +%Y%m%d-%H%M%S)"
  fi

  mkdir -p "$AW_SDLC_EVAL_WORKSPACE_BASE_DIR"
  export AW_SDLC_EVAL_WORKSPACE_BASE_DIR
}

run() {
  echo
  echo "==> $1"
  shift
  "$@"
}

run_optional_test_group() {
  local search_dir="$1"
  shift
  local pattern="$1"
  shift
  local title_prefix="$1"

  while IFS= read -r test_file; do
    [[ -n "$test_file" ]] || continue
    run "$title_prefix $(basename "$test_file" .js)" node "$test_file"
  done < <(find "$search_dir" -type f -name "$pattern" | sort)

  return 0
}

run_deterministic() {
  run "Goal gates" node "$DETERMINISTIC_DIR/aw-sdlc-goal-gates.test.js"
  run "Command contract completeness" node "$DETERMINISTIC_DIR/aw-sdlc-command-contract-completeness.test.js"
  run "Command/skill mapping" node "$DETERMINISTIC_DIR/aw-sdlc-command-skill-mapping.test.js"
  run "Command quality" node "$DETERMINISTIC_DIR/aw-sdlc-command-quality.test.js"
  run "Command boundaries" node "$DETERMINISTIC_DIR/aw-sdlc-command-boundaries.test.js"
  run "Ship command" node "$DETERMINISTIC_DIR/aw-sdlc-ship-command.test.js"
  run "Customer coverage" node "$DETERMINISTIC_DIR/aw-sdlc-customer-coverage.test.js"
  run "Default session coverage" node "$DETERMINISTIC_DIR/aw-sdlc-default-session-coverage.test.js"
  run "Session hook precedence" node "$DETERMINISTIC_DIR/aw-sdlc-session-hook-precedence.test.js"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-activation-*.test.js" "Activation"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-worktree-*.test.js" "Worktree"
  run "GHL staging baselines" node "$DETERMINISTIC_DIR/aw-sdlc-ghl-staging-baselines.test.js"
  run "Eval workspace isolation" node "$DETERMINISTIC_DIR/aw-sdlc-eval-workspace-isolation.test.js"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-plan-*.test.js" "Plan"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-brainstorm-*.test.js" "Brainstorm"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-prepare-*.test.js" "Preparation"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-execute-*.test.js" "Execution"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-verify-*.test.js" "Verification"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-finish-*.test.js" "Finish"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-install*.test.js" "Installability"
  run "Real coverage" node "$REAL_DIR/aw-sdlc-real-coverage.test.js"
  run "Skill trigger coverage" node "$DETERMINISTIC_DIR/aw-sdlc-skill-trigger-coverage.test.js"
  run "Live artifact contract" node "$REAL_DIR/aw-sdlc-live-artifact-contract.test.js"
  run "Live release generator" node "$REAL_DIR/aw-sdlc-live-release-generator.test.js"
  run "BDD coverage" node "$DETERMINISTIC_DIR/aw-sdlc-bdd-coverage.test.js"
}

run_live() {
  run "Public routing (Codex)" node "$LIVE_DIR/aw-sdlc-codex-routing.test.js"
  run "Stage resolution (Codex)" node "$LIVE_DIR/aw-sdlc-stage-resolution.test.js"
  run "Customer behavior core (Codex)" node "$LIVE_DIR/aw-sdlc-customer-behavior.test.js"
}

run_live_full() {
  AW_SDLC_EVAL_SUITE=full run "Customer behavior full (Codex)" node "$LIVE_DIR/aw-sdlc-customer-behavior.test.js"
}

run_real() {
  ensure_real_workspace_base
  run "Real outcomes (Codex)" node "$REAL_DIR/aw-sdlc-real-outcomes.test.js"
}

run_real_parallel() {
  ensure_real_workspace_base
  run "Real outcomes parallel (Codex)" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-real-parallel.sh"
}

run_standalone_smoke() {
  run "Standalone Codex + ghl-ai smoke" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-ghl-ai-standalone-smoke.sh"
}

run_live_artifacts() {
  run "Live release artifact validation" node "$REAL_DIR/aw-sdlc-live-artifacts.test.js"
}

run_live_golden_path() {
  run "Live PR + staging golden path" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-live-golden-path.sh"
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
  standalone-smoke)
    run_standalone_smoke
    ;;
  live-artifacts)
    run_live_artifacts
    ;;
  live-golden-path)
    run_live_golden_path
    ;;
  all)
    run_deterministic
    run_live
    ;;
  *)
    echo "Usage: $0 [deterministic|live|live-full|real|real-parallel|standalone-smoke|live-artifacts|live-golden-path|all]" >&2
    exit 1
    ;;
esac
