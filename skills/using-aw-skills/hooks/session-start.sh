#!/usr/bin/env bash
set -euo pipefail

escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

emit_session_start_payload() {
  local content="$1"
  local escaped
  escaped="$(escape_for_json "$content")"

  case "${AW_SESSION_OUTPUT:-claude}" in
    cursor)
      printf '{\n  "additional_context": "%s"\n}\n' "$escaped"
      ;;
    *)
      printf '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$escaped"
      ;;
  esac
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_ROOT=""
SEARCH_ROOT="$SCRIPT_DIR"
while [[ "$SEARCH_ROOT" != "/" ]]; do
  if [[ -f "$SEARCH_ROOT/skills/using-aw-skills/SKILL.md" ]]; then
    LOCAL_ROOT="$SEARCH_ROOT"
    break
  fi
  SEARCH_ROOT="$(dirname "$SEARCH_ROOT")"
done

AW_REGISTRY_ROOT=""
SEARCH_ROOT="$SCRIPT_DIR"
while [[ "$SEARCH_ROOT" != "/" ]]; do
  if [[ -d "$SEARCH_ROOT/.aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT/.aw_registry"
    break
  fi
  if [[ "$(basename "$SEARCH_ROOT")" == ".aw_registry" ]]; then
    AW_REGISTRY_ROOT="$SEARCH_ROOT"
    break
  fi
  SEARCH_ROOT="$(dirname "$SEARCH_ROOT")"
done

if [[ -z "$LOCAL_ROOT" && -z "$AW_REGISTRY_ROOT" ]]; then
  emit_session_start_payload "WARNING: .aw_registry not found. AW skills unavailable."
  exit 0
fi

CONTEXT="# AW Session Context

## First Response Rule
Before any substantive response, select the smallest correct AW skill stack from the repo-local router.
Honor an explicit AW command and its mapped stage skill first.
Otherwise choose the needed process skill, primary stage skill, and matching route by intent, then load deeper domain skills.
Do not start with generic implementation, review, or deploy advice before skill selection.

## Primary Routes
- /aw:plan -> ideas, specs, task breakdown, architecture direction
- /aw:build -> approved implementation work
- /aw:investigate -> bugs, alerts, or unclear runtime failures
- /aw:test -> QA proof and regression evidence
- /aw:review -> findings, risk review, and readiness
- /aw:deploy -> rollout or release execution
- /aw:ship -> release closeout and final handoff

## Compatibility Routes
- /aw:execute -> compatibility route; resolve to /aw:build
- /aw:verify -> compatibility route; resolve to /aw:test or /aw:review

## Router Source
Use skills/using-aw-skills/SKILL.md as the repo-local router.
Load domain, platform, and craft skills only after the smallest correct AW route is selected."

emit_session_start_payload "$CONTEXT"
