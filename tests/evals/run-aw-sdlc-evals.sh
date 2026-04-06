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

resolve_deterministic_test() {
  local basename="$1"
  local resolved

  resolved="$(find "$DETERMINISTIC_DIR" -type f -name "$basename" | sort | head -n 1)"
  if [[ -z "$resolved" ]]; then
    echo "Missing deterministic test: $basename" >&2
    exit 1
  fi

  printf '%s\n' "$resolved"
}

run_deterministic_test() {
  local title="$1"
  local basename="$2"
  local resolved

  resolved="$(resolve_deterministic_test "$basename")"
  run "$title" node "$resolved"
}

run_deterministic() {
  run_deterministic_test "Addy validation matrix" "aw-addy-validation-matrix.test.js"
  run_deterministic_test "Archetype scenarios" "aw-archetype-scenarios.test.js"
  run_deterministic_test "Product scenarios" "aw-product-scenarios.test.js"
  run_deterministic_test "RevEx history benchmark" "aw-revex-history-benchmark.test.js"
  run_deterministic_test "RevEx history phase 2 contract" "aw-revex-history-phase2-contract.test.js"
  run_deterministic_test "Eval benchmark scorecard" "aw-eval-benchmark-scorecard.test.js"
  run_deterministic_test "Goal gates" "aw-sdlc-goal-gates.test.js"
  run_deterministic_test "Command contract completeness" "aw-sdlc-command-contract-completeness.test.js"
  run_deterministic_test "Command/skill mapping" "aw-sdlc-command-skill-mapping.test.js"
  run_deterministic_test "Command quality" "aw-sdlc-command-quality.test.js"
  run_deterministic_test "Command boundaries" "aw-sdlc-command-boundaries.test.js"
  run_deterministic_test "Ship command" "aw-sdlc-ship-command.test.js"
  run_deterministic_test "Customer coverage" "aw-sdlc-customer-coverage.test.js"
  run_deterministic_test "Default session coverage" "aw-sdlc-default-session-coverage.test.js"
  run_deterministic_test "Session hook precedence" "aw-sdlc-session-hook-precedence.test.js"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-activation-*.test.js" "Activation"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-worktree-*.test.js" "Worktree"
  run_deterministic_test "GHL staging baselines" "aw-sdlc-ghl-staging-baselines.test.js"
  run_deterministic_test "Eval workspace isolation" "aw-sdlc-eval-workspace-isolation.test.js"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-plan-*.test.js" "Plan"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-brainstorm-*.test.js" "Brainstorm"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-prepare-*.test.js" "Preparation"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-execute-*.test.js" "Execution"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-verify-*.test.js" "Verification"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-finish-*.test.js" "Finish"
  run_optional_test_group "$DETERMINISTIC_DIR" "aw-sdlc-install*.test.js" "Installability"
  run "Outcomes coverage" node "$OUTCOMES_DIR/aw-sdlc-outcomes-coverage.test.js"
  run_deterministic_test "Skill trigger coverage" "aw-sdlc-skill-trigger-coverage.test.js"
  run "Outcome artifact contract" node "$OUTCOMES_DIR/aw-sdlc-outcome-artifact-contract.test.js"
  run "Outcome release generator" node "$OUTCOMES_DIR/aw-sdlc-outcome-release-generator.test.js"
  run_deterministic_test "BDD coverage" "aw-sdlc-bdd-coverage.test.js"
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

run_named_suite() {
  local suite_id="$1"
  local mode_filter="${2:-}"

  if [[ -n "$mode_filter" ]]; then
    run "Eval suite ${suite_id} (${mode_filter})" node "$EVALS_DIR/run-aw-suite.js" "$suite_id" "$mode_filter"
  else
    run "Eval suite ${suite_id}" node "$EVALS_DIR/run-aw-suite.js" "$suite_id"
  fi
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
  suite)
    if [[ -z "${2:-}" ]]; then
      echo "Usage: $0 suite <suite-id> [deterministic|routing|outcomes]" >&2
      exit 1
    fi
    run_named_suite "$2" "${3:-}"
    ;;
  list-suites)
    node "$EVALS_DIR/run-aw-suite.js" --list
    ;;
  all)
    run_deterministic
    run_routing
    ;;
  *)
    echo "Usage: $0 [deterministic|routing|routing-full|outcomes|revex-history|revex-history-smoke|outcomes-parallel|standalone-smoke|outcome-artifacts|routing-golden-path|suite <suite-id> [deterministic|routing|outcomes]|list-suites|all]" >&2
    exit 1
    ;;
esac
