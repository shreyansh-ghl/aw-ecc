#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

CLIS=()
for arg in "$@"; do
  case "$arg" in
    --quick|--turns=*)
      ;;
    *)
      CLIS+=("$arg")
      ;;
  esac
done

if [ ${#CLIS[@]} -eq 0 ]; then
  node "$REPO_ROOT/scripts/ci/real-cli-smoke.js"
else
  node "$REPO_ROOT/scripts/ci/real-cli-smoke.js" --cli "$(IFS=,; echo "${CLIS[*]}")"
fi
