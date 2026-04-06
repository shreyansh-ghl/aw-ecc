#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVALS_DIR="$ROOT_DIR/tests/evals"
DETERMINISTIC_DIR="$EVALS_DIR/deterministic"
ROUTING_DIR="$EVALS_DIR/routing"
OUTCOMES_DIR="$EVALS_DIR/outcomes"

MODE="${1:-all}"
: "${AW_SDLC_EVAL_REF:=WORKTREE}"
export AW_SDLC_EVAL_REF

ensure_real_workspace_base() {
  if [[ -z "${AW_SDLC_EVAL_WORKSPACE_BASE_DIR:-}" ]]; then
    AW_SDLC_EVAL_WORKSPACE_BASE_DIR="$ROOT_DIR/tests/results/outcomes-workspaces-$(date +%Y%m%d-%H%M%S)"
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
  run "Addy validation matrix" node "$DETERMINISTIC_DIR/aw-addy-validation-matrix.test.js"
  run "Archetype scenarios" node "$DETERMINISTIC_DIR/aw-archetype-scenarios.test.js"
  run "Product scenarios" node "$DETERMINISTIC_DIR/aw-product-scenarios.test.js"
  run "RevEx history benchmark" node "$DETERMINISTIC_DIR/aw-revex-history-benchmark.test.js"
  run "RevEx history phase 2 contract" node "$DETERMINISTIC_DIR/aw-revex-history-phase2-contract.test.js"
  run "Eval benchmark scorecard" node "$DETERMINISTIC_DIR/aw-eval-benchmark-scorecard.test.js"
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
  run "Outcomes coverage" node "$OUTCOMES_DIR/aw-sdlc-outcomes-coverage.test.js"
  run "Skill trigger coverage" node "$DETERMINISTIC_DIR/aw-sdlc-skill-trigger-coverage.test.js"
  run "Outcome artifact contract" node "$OUTCOMES_DIR/aw-sdlc-outcome-artifact-contract.test.js"
  run "Outcome release generator" node "$OUTCOMES_DIR/aw-sdlc-outcome-release-generator.test.js"
  run "BDD coverage" node "$DETERMINISTIC_DIR/aw-sdlc-bdd-coverage.test.js"
}

run_routing() {
  run "Public routing (Codex)" node "$ROUTING_DIR/aw-sdlc-codex-routing.test.js"
  run "Stage resolution (Codex)" node "$ROUTING_DIR/aw-sdlc-stage-resolution.test.js"
  run "Archetype routing (Codex)" node "$ROUTING_DIR/aw-archetype-routing.test.js"
  run "Customer behavior core (Codex)" node "$ROUTING_DIR/aw-sdlc-customer-behavior.test.js"
}

run_routing_full() {
  AW_SDLC_EVAL_SUITE=full run "Customer behavior full (Codex)" node "$ROUTING_DIR/aw-sdlc-customer-behavior.test.js"
}

run_outcomes() {
  ensure_real_workspace_base
  run "Outcomes suite (Codex)" node "$OUTCOMES_DIR/aw-sdlc-outcomes.test.js"
}

run_revex_history() {
  ensure_real_workspace_base
  run "RevEx history phase 2 (Codex)" node "$OUTCOMES_DIR/aw-revex-history-phase2.test.js"
}

run_revex_history_smoke() {
  ensure_real_workspace_base
  run "RevEx history phase 2 smoke preset (Codex)" env AW_REVEX_HISTORY_PRESET=smoke node "$OUTCOMES_DIR/aw-revex-history-phase2.test.js"
}

run_outcomes_parallel() {
  ensure_real_workspace_base
  run "Outcomes suite parallel (Codex)" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-outcomes-parallel.sh"
}

run_standalone_smoke() {
  run "Standalone Codex + ghl-ai smoke" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-ghl-ai-standalone-smoke.sh"
}

run_outcome_artifacts() {
  run "Outcome artifact validation" node "$OUTCOMES_DIR/aw-sdlc-outcome-artifacts.test.js"
}

run_routing_golden_path() {
  run "Routing PR + staging golden path" bash "$ROOT_DIR/tests/evals/run-aw-sdlc-routing-golden-path.sh"
}

case "$MODE" in
  deterministic)
    run_deterministic
    ;;
  routing|live)
    run_routing
    ;;
  routing-full|live-full)
    run_routing
    run_routing_full
    ;;
  outcomes|real)
    run_outcomes
    ;;
  revex-history|history-benchmark)
    run_revex_history
    ;;
  revex-history-smoke|history-benchmark-smoke)
    run_revex_history_smoke
    ;;
  outcomes-parallel|real-parallel)
    run_outcomes_parallel
    ;;
  standalone-smoke)
    run_standalone_smoke
    ;;
  outcome-artifacts|live-artifacts)
    run_outcome_artifacts
    ;;
  routing-golden-path|live-golden-path)
    run_routing_golden_path
    ;;
  all)
    run_deterministic
    run_routing
    ;;
  *)
    echo "Usage: $0 [deterministic|routing|routing-full|outcomes|revex-history|revex-history-smoke|outcomes-parallel|standalone-smoke|outcome-artifacts|routing-golden-path|all]" >&2
    exit 1
    ;;
esac
