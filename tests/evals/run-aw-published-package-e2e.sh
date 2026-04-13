#!/usr/bin/env bash

set -euo pipefail

ROOT="${1:-/tmp/aw-published-package-e2e}"
PACKAGE_SPEC="${2:-@ghl-ai/aw@beta}"
ECC_MODE="${3:-with-ecc}"
AUTH_MODE="${4:-tool-home}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRESH_ENV_RUNNER="$REPO_ROOT/tests/evals/run-aw-fresh-env-cli-smoke.sh"

if [[ ! -x "$FRESH_ENV_RUNNER" ]]; then
  echo "Missing fresh env runner: $FRESH_ENV_RUNNER" >&2
  exit 1
fi

export AW_PACKAGE_SPEC="$PACKAGE_SPEC"

echo "Running published package E2E"
echo "root=$ROOT"
echo "package_spec=$PACKAGE_SPEC"
echo "ecc_mode=$ECC_MODE"
echo "auth_mode=$AUTH_MODE"
echo

bash "$FRESH_ENV_RUNNER" "$ROOT" package "$ECC_MODE" "$AUTH_MODE"
