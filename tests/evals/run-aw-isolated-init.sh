#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-/tmp/aw-isolated-run}"
AW_MODE="${2:-package}"
ECC_MODE="${3:-with-ecc}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REAL_HOME="${AW_REAL_HOME:-$HOME}"
SETUP_HELPER="$REPO_ROOT/tests/evals/setup-aw-isolated-space.sh"
PACKAGE_SPEC="${AW_PACKAGE_SPEC:-@ghl-ai/aw@0.1.38-beta.23}"

rm -rf "$ROOT"
mkdir -p "$ROOT/home" "$ROOT/workspace"

if [[ ! -f "$ROOT/auth.env" || ! -f "$ROOT/gitconfig" ]]; then
  bash "$SETUP_HELPER" --inherit-gh --inherit-cli-auth "$ROOT" >/dev/null
fi

. "$ROOT/auth.env"

ISO_HOME="$ROOT/home"
ISO_WS="$ROOT/workspace"
LOG="$ROOT/init.log"
DEBUG_LOG="$ROOT/init-debug.log"

CLI_CMD=()
case "$AW_MODE" in
  package)
    CLI_CMD=(npx --yes "$PACKAGE_SPEC" init --silent)
    ;;
  *)
    echo "Unknown AW_MODE: $AW_MODE (supported: package)" >&2
    exit 1
    ;;
esac

export HOME="$ISO_HOME"
export XDG_CONFIG_HOME="$ISO_HOME/.config"
export XDG_DATA_HOME="$ISO_HOME/.local/share"
export npm_config_cache="$ISO_HOME/.npm"
export npm_config_yes=true
export GIT_CONFIG_GLOBAL="$ROOT/gitconfig"
export GH_CONFIG_DIR="${AW_GH_CONFIG_DIR:-$REAL_HOME/.config/gh}"
export GH_TOKEN="${GH_TOKEN:-}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-}"
export GIT_TERMINAL_PROMPT=0
export AW_DEBUG_INIT_LOG="$DEBUG_LOG"

if [[ "$ECC_MODE" == "no-ecc" ]]; then
  export AW_NO_ECC=1
else
  unset AW_NO_ECC || true
fi

cd "$ISO_WS"

{
  echo "ROOT=$ROOT"
  echo "AW_MODE=$AW_MODE"
  echo "ECC_MODE=$ECC_MODE"
  echo "WORKDIR=$ISO_WS"
  echo "HOME=$ISO_HOME"
  echo "--- command ---"
  printf '%q ' "${CLI_CMD[@]}"
  printf '\n'
  echo "--- begin ---"
} > "$LOG"

if "${CLI_CMD[@]}" >> "$LOG" 2>&1; then
  STATUS=0
else
  STATUS=$?
fi

copy_file_if_present() {
  local src="$1"
  local dest="$2"
  if [[ -f "$src" ]]; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  fi
}

if [[ "$STATUS" == "0" ]]; then
  copy_file_if_present "$REAL_HOME/.codex/auth.json" "$ISO_HOME/.codex/auth.json"
  copy_file_if_present "$REAL_HOME/.cursor/cli-config.json" "$ISO_HOME/.cursor/cli-config.json"
  copy_file_if_present "$REAL_HOME/.cursor/agent-cli-state.json" "$ISO_HOME/.cursor/agent-cli-state.json"
fi

{
  echo
  echo "--- end ---"
  echo "EXIT=$STATUS"
} >> "$LOG"

echo "EXIT=$STATUS"
echo "LOG=$LOG"
echo "DEBUG_LOG=$DEBUG_LOG"
echo "ROOT=$ROOT"
echo "--- tail ---"
tail -n 80 "$LOG"
echo "--- workspace ---"
ls -la "$ISO_WS" | sed -n '1,120p'
echo "--- home ---"
ls -la "$ISO_HOME" | sed -n '1,120p'

exit "$STATUS"
