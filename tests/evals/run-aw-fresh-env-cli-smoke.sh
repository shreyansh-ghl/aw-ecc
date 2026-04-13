#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-/tmp/aw-fresh-env-cli-smoke}"
INIT_MODE="${2:-package}"
ECC_MODE="${3:-with-ecc}"
AUTH_MODE="${4:-tool-home}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REAL_HOME="${AW_REAL_HOME:-$HOME}"
SETUP_HELPER="$REPO_ROOT/tests/evals/setup-aw-isolated-space.sh"
INIT_HELPER="$REPO_ROOT/tests/evals/run-aw-isolated-init.sh"
SMOKE_RUNNER="$REPO_ROOT/tests/evals/run-aw-cross-harness-cli-smoke.js"

if [[ ! -x "$INIT_HELPER" ]]; then
  echo "Missing init helper: $INIT_HELPER" >&2
  exit 1
fi

if [[ ! -x "$SETUP_HELPER" ]]; then
  echo "Missing setup helper: $SETUP_HELPER" >&2
  exit 1
fi

if [[ ! -f "$SMOKE_RUNNER" ]]; then
  echo "Missing smoke runner: $SMOKE_RUNNER" >&2
  exit 1
fi

bash "$SETUP_HELPER" --inherit-gh --inherit-cli-auth "$ROOT" >/dev/null
"$INIT_HELPER" "$ROOT" "$INIT_MODE" "$ECC_MODE"

ISO_HOME="$ROOT/home"
ISO_WS="$ROOT/workspace"
RESULT_ROOT="$ROOT/cli-e2e"
mkdir -p "$RESULT_ROOT"

run_harness() {
  local harness="$1"
  local home_dir="$2"
  local xdg_config="$3"
  local xdg_data="$4"
  local result_dir="$5"

  mkdir -p "$result_dir"
  (
    export HOME="$home_dir"
    export XDG_CONFIG_HOME="$xdg_config"
    export XDG_DATA_HOME="$xdg_data"
    export AW_CLI_SMOKE_RESULT_DIR="$result_dir"
    export AW_CLI_SMOKE_TIMEOUT_MS="${AW_CLI_SMOKE_TIMEOUT_MS:-120000}"
    export AW_CLI_SMOKE_HARNESSES="$harness"
    cd "$ISO_WS"
    node "$SMOKE_RUNNER"
  )
}

set +e
if [[ "$AUTH_MODE" == "isolated-home" ]]; then
  CURSOR_HOME="$ISO_HOME"
  CURSOR_XDG_CONFIG="$ISO_HOME/.config"
  CURSOR_XDG_DATA="$ISO_HOME/.local/share"
  CODEX_HOME="$ISO_HOME"
  CODEX_XDG_CONFIG="$ISO_HOME/.config"
  CODEX_XDG_DATA="$ISO_HOME/.local/share"
  CLAUDE_HOME="$ISO_HOME"
  CLAUDE_XDG_CONFIG="$ISO_HOME/.config"
  CLAUDE_XDG_DATA="$ISO_HOME/.local/share"
else
  CURSOR_HOME="$REAL_HOME"
  CURSOR_XDG_CONFIG="${AW_REAL_XDG_CONFIG_HOME:-$REAL_HOME/.config}"
  CURSOR_XDG_DATA="${AW_REAL_XDG_DATA_HOME:-$REAL_HOME/.local/share}"
  CODEX_HOME="$REAL_HOME"
  CODEX_XDG_CONFIG="${AW_REAL_XDG_CONFIG_HOME:-$REAL_HOME/.config}"
  CODEX_XDG_DATA="${AW_REAL_XDG_DATA_HOME:-$REAL_HOME/.local/share}"
  CLAUDE_HOME="$REAL_HOME"
  CLAUDE_XDG_CONFIG="${AW_REAL_XDG_CONFIG_HOME:-$REAL_HOME/.config}"
  CLAUDE_XDG_DATA="${AW_REAL_XDG_DATA_HOME:-$REAL_HOME/.local/share}"
fi

run_harness "cursor" "$CURSOR_HOME" "$CURSOR_XDG_CONFIG" "$CURSOR_XDG_DATA" "$RESULT_ROOT/cursor" >"$RESULT_ROOT/cursor.log" 2>&1
CURSOR_STATUS=$?

run_harness "codex" "$CODEX_HOME" "$CODEX_XDG_CONFIG" "$CODEX_XDG_DATA" "$RESULT_ROOT/codex" >"$RESULT_ROOT/codex.log" 2>&1
CODEX_STATUS=$?

run_harness "claude" "$CLAUDE_HOME" "$CLAUDE_XDG_CONFIG" "$CLAUDE_XDG_DATA" "$RESULT_ROOT/claude" >"$RESULT_ROOT/claude.log" 2>&1
CLAUDE_STATUS=$?
set -e

cat > "$RESULT_ROOT/summary.txt" <<EOF
Fresh Environment CLI Smoke
===========================

root=$ROOT
init_mode=$INIT_MODE
ecc_mode=$ECC_MODE
auth_mode=$AUTH_MODE
workspace=$ISO_WS
isolated_home=$ISO_HOME

cursor_exit=$CURSOR_STATUS
cursor_summary=$RESULT_ROOT/cursor/summary.json
cursor_log=$RESULT_ROOT/cursor.log

codex_exit=$CODEX_STATUS
codex_summary=$RESULT_ROOT/codex/summary.json
codex_log=$RESULT_ROOT/codex.log

claude_exit=$CLAUDE_STATUS
claude_summary=$RESULT_ROOT/claude/summary.json
claude_log=$RESULT_ROOT/claude.log
EOF

cat "$RESULT_ROOT/summary.txt"

if [[ "$CURSOR_STATUS" -ne 0 || "$CODEX_STATUS" -ne 0 || "$CLAUDE_STATUS" -ne 0 ]]; then
  exit 1
fi
