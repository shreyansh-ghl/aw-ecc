#!/usr/bin/env bash

set -euo pipefail

ROOT_INPUT="${1:-/tmp/aw-release-gate}"
PACKAGE_SPEC="${2:-@ghl-ai/aw@beta}"
ECC_MODE="${3:-with-ecc}"
AUTH_MODE="${4:-tool-home}"

mkdir -p "$ROOT_INPUT"
ROOT="$(cd "$ROOT_INPUT" && pwd -P)"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INIT_HELPER="$REPO_ROOT/tests/evals/run-aw-isolated-init.sh"
SMOKE_RUNNER="$REPO_ROOT/tests/evals/run-aw-cross-harness-cli-smoke.js"
HOOK_CONTRACT_TEST="$REPO_ROOT/tests/hooks/harness-hook-output-contracts.test.js"
CURSOR_GEN_TEST="$REPO_ROOT/tests/lib/cursor-aw-generated-output.test.js"
CODEX_GEN_TEST="$REPO_ROOT/tests/lib/codex-aw-generated-output.test.js"
CLAUDE_GEN_TEST="$REPO_ROOT/tests/lib/claude-aw-generated-output.test.js"

if [[ -n "${AW_RELEASE_GATE_CASES:-}" ]]; then
  IFS=',' read -r -a CASES <<< "${AW_RELEASE_GATE_CASES}"
else
  CASES=(
    "plan-backend-service"
    "investigate-runtime-failure"
    "review-security-risk"
  )
fi

if [[ -n "${AW_RELEASE_GATE_HARNESSES:-}" ]]; then
  IFS=',' read -r -a HARNESSES <<< "${AW_RELEASE_GATE_HARNESSES}"
else
  HARNESSES=(
    "cursor"
    "codex"
    "claude"
  )
fi

SUMMARY_DIR="${ROOT%/}.release-gate"
FINAL_SUMMARY_DIR="$ROOT/release-gate"
SUMMARY_JSON="$SUMMARY_DIR/summary.json"
SUMMARY_TXT="$SUMMARY_DIR/summary.txt"
WORKSPACE_ROOT="$ROOT/workspace"

record_json() {
  local key="$1"
  local value="$2"
  python3 - "$SUMMARY_JSON" "$key" "$value" <<'PY'
import json, os, sys
path, key, value = sys.argv[1:]
data = {}
if os.path.exists(path):
    with open(path, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
data[key] = value
with open(path, 'w', encoding='utf-8') as fh:
    json.dump(data, fh, indent=2, sort_keys=True)
PY
}

run_gate() {
  local label="$1"
  shift
  mkdir -p "$SUMMARY_DIR"
  echo "== $label ==" | tee -a "$SUMMARY_TXT"
  if "$@" >>"$SUMMARY_TXT" 2>&1; then
    echo "PASS $label" | tee -a "$SUMMARY_TXT"
    record_json "$label" "PASS"
  else
    echo "FAIL $label" | tee -a "$SUMMARY_TXT"
    record_json "$label" "FAIL"
    exit 1
  fi
  echo | tee -a "$SUMMARY_TXT"
}

rm -rf "$ROOT" "$SUMMARY_DIR"
mkdir -p "$ROOT"

run_gate "hook-contracts" node "$HOOK_CONTRACT_TEST"
run_gate "cursor-generated-output" node "$CURSOR_GEN_TEST"
run_gate "codex-generated-output" node "$CODEX_GEN_TEST"
run_gate "claude-generated-output" node "$CLAUDE_GEN_TEST"
run_gate "published-package-init" env AW_PACKAGE_SPEC="$PACKAGE_SPEC" bash "$INIT_HELPER" "$ROOT" package "$ECC_MODE"

mkdir -p "$SUMMARY_DIR"
: > "$SUMMARY_TXT"
echo "AW Release Gate" >> "$SUMMARY_TXT"
echo "root=$ROOT" >> "$SUMMARY_TXT"
echo "package_spec=$PACKAGE_SPEC" >> "$SUMMARY_TXT"
echo "ecc_mode=$ECC_MODE" >> "$SUMMARY_TXT"
echo "auth_mode=$AUTH_MODE" >> "$SUMMARY_TXT"
echo >> "$SUMMARY_TXT"
record_json "hook-contracts" "PASS"
record_json "cursor-generated-output" "PASS"
record_json "codex-generated-output" "PASS"
record_json "claude-generated-output" "PASS"
record_json "published-package-init" "PASS"

for harness in "${HARNESSES[@]}"; do
  for case_id in "${CASES[@]}"; do
    result_dir="$SUMMARY_DIR/$harness/$case_id"
    mkdir -p "$result_dir"
    echo "== smoke:$harness:$case_id ==" | tee -a "$SUMMARY_TXT"
    if env \
      HOME="${AW_REAL_HOME:-$HOME}" \
      XDG_CONFIG_HOME="${AW_REAL_XDG_CONFIG_HOME:-${AW_REAL_HOME:-$HOME}/.config}" \
      XDG_DATA_HOME="${AW_REAL_XDG_DATA_HOME:-${AW_REAL_HOME:-$HOME}/.local/share}" \
      AW_CLI_SMOKE_WORKSPACE="$WORKSPACE_ROOT" \
      AW_CLI_SMOKE_RESULT_DIR="$result_dir" \
      AW_CLI_SMOKE_HARNESSES="$harness" \
      AW_CLI_SMOKE_CASES="$case_id" \
      AW_CLI_SMOKE_RETRIES="${AW_CLI_SMOKE_RETRIES:-1}" \
      AW_CLI_SMOKE_TIMEOUT_MS="${AW_CLI_SMOKE_TIMEOUT_MS:-120000}" \
      node "$SMOKE_RUNNER" >>"$SUMMARY_TXT" 2>&1
    then
      echo "PASS smoke:$harness:$case_id" | tee -a "$SUMMARY_TXT"
      record_json "smoke:$harness:$case_id" "PASS"
    else
      echo "FAIL smoke:$harness:$case_id" | tee -a "$SUMMARY_TXT"
      record_json "smoke:$harness:$case_id" "FAIL"
      exit 1
    fi
    echo | tee -a "$SUMMARY_TXT"
  done
done

record_json "workspace" "$WORKSPACE_ROOT"
record_json "result_root" "$FINAL_SUMMARY_DIR"
echo "ALL GREEN" | tee -a "$SUMMARY_TXT"
rm -rf "$FINAL_SUMMARY_DIR"
mkdir -p "$FINAL_SUMMARY_DIR"
cp -R "$SUMMARY_DIR"/. "$FINAL_SUMMARY_DIR"/
