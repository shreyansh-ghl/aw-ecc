#!/usr/bin/env bash
set -euo pipefail

RAW="$(cat || true)"

extract_workspace_root() {
  printf '%s' "$1" | sed -n 's/.*"workspace_roots"[[:space:]]*:[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

extract_cwd() {
  printf '%s' "$1" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

resolve_rules_root() {
  local root="${1:-}"
  local cwd_dir
  cwd_dir="$(pwd)"
  local candidate

  for candidate in \
    "$root/.aw/.aw_rules/platform" \
    "$root/.aw_rules/platform" \
    "$cwd_dir/.aw/.aw_rules/platform" \
    "$cwd_dir/.aw_rules/platform" \
    "$HOME/.aw/.aw_rules/platform" \
    "$HOME/.aw_rules/platform" \
    "$HOME/.aw/.aw_registry/.aw_rules/platform"
  do
    if [ -n "$candidate" ] && [ -d "$candidate" ]; then
      printf '%s' "$candidate"
      return 0
    fi
  done

  return 1
}

WORKSPACE_ROOT="$(extract_workspace_root "$RAW")"
if [ -z "$WORKSPACE_ROOT" ]; then
  WORKSPACE_ROOT="$(extract_cwd "$RAW")"
fi

RULES_ROOT="$(resolve_rules_root "$WORKSPACE_ROOT" || true)"
if [ -z "$RULES_ROOT" ]; then
  RULES_ROOT="$HOME/.aw_rules/platform"
fi

cat <<EOF
[AW Skill Routing — MUST]
using-aw-skills is ALREADY LOADED from session start — DO NOT invoke Skill tool to reload it.
Apply its routing rules directly from your context. Calling Skill("using-aw-skills") again wastes tokens and is a no-op.

Before ANY substantive response to a task, feature, fix, or build request:
  1. Select the correct AW route using the decision tree already in your context.
  2. Invoke the Skill tool for the STAGE skill only (not using-aw-skills):
       /aw:plan        → new feature, spec, architecture — no approved plan yet
       /aw:build       → approved plan/spec exists — implement it
       /aw:investigate → runtime bug, alert, unclear failure
       /aw:test        → QA scope, behavior evidence
       /aw:review      → findings, readiness, standards check
  3. Produce the required output shape fields before handing off.
Responding substantively before invoking the stage skill is a compliance failure.

[Rule reminder] Read ${RULES_ROOT}/routing/AGENTS.md (mandatory gate), ${RULES_ROOT}/universal/AGENTS.md, and ${RULES_ROOT}/security/AGENTS.md, then the touched domain AGENTS.md plus references/ on demand.
EOF
