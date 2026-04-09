#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export AW_SESSION_OUTPUT=cursor

exec bash "$SCRIPT_DIR/shared/session-start.sh"
