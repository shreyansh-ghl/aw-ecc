#!/usr/bin/env bash
set -euo pipefail

RAW="$(cat || true)"

extract_workspace_root() {
  printf '%s' "$1" | sed -n 's/.*"workspace_roots"[[:space:]]*:[[:space:]]*\[[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

extract_cwd() {
  printf '%s' "$1" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

extract_prompt() {
  printf '%s' "$1" | sed -n 's/.*"prompt"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

state_has_github_link() {
  local state="$1"
  grep -Eq '"(remote_url|github_url|repository_url|github)"[[:space:]]*:[[:space:]]*"https://github.com/' "$state"
}

state_has_devtools_link() {
  local state="$1"
  grep -Eq '"(teamofone_url|teamofone|devtools_url|devtools|remoteUrl)"[[:space:]]*:[[:space:]]*"https://devtools\.servers\.stg\.msgsndr\.net/' "$state"
}

state_needs_echo_handoff() {
  local state="$1"
  if grep -Eq '"status"[[:space:]]*:[[:space:]]*"generated_(hca_)?fallback"|"publish_status"[[:space:]]*:[[:space:]]*"(local_only|blocked|not_requested)"' "$state"; then
    return 0
  fi
  if grep -q '"html_companion_artifacts"' "$state" \
    && ! state_has_github_link "$state"; then
    return 0
  fi
  if grep -q '"html_companion_artifacts"' "$state" \
    && ! state_has_devtools_link "$state"; then
    return 0
  fi
  return 1
}

state_has_published_echo_links() {
  local state="$1"
  grep -Eq '"status"[[:space:]]*:[[:space:]]*"(generated|generated_echo|html_generated_and_published|published)"' "$state" \
    && grep -q '"publish_status"[[:space:]]*:[[:space:]]*"published"' "$state" \
    && state_has_github_link "$state" \
    && state_has_devtools_link "$state"
}

echo_direct_skill_path() {
  printf '%s/.aw/.aw_registry/platform/core/skills/echo-direct/SKILL.md' "${HOME:-}"
}

hca_skill_path() {
  printf '%s/.aw/.aw_registry/platform/core/skills/human-collaboration-artifacts/SKILL.md' "${HOME:-}"
}

ECHO_DIRECT_HOME_CONTRACT_PRINTED=""
print_echo_direct_home_contract() {
  if [ -n "$ECHO_DIRECT_HOME_CONTRACT_PRINTED" ]; then
    return 0
  fi
  ECHO_DIRECT_HOME_CONTRACT_PRINTED="1"

  local echo_path
  local hca_path
  echo_path="$(echo_direct_skill_path)"
  hca_path="$(hca_skill_path)"

  printf '[AW Echo Direct] Echo Direct SKILL.md: %s\n' "$echo_path"
  printf '[AW Echo Direct] HCA SKILL.md: %s\n' "$hca_path"
  printf '[AW Echo Direct] A missing callable tool, MCP route, or subagent is not a blocker; read these SKILL.md files directly.\n'

  if [ ! -f "$echo_path" ] || [ ! -f "$hca_path" ]; then
    printf '[AW Echo Direct blocker] Echo Direct skill is not installed at the canonical AW home path. Run: aw init --silent\n'
  fi
}

prompt_needs_echo_direct_hint() {
  local prompt_lc="$1"
  case "$prompt_lc" in
    *"/aw:plan"*|*"aw plan"*|*"aw docs"*|*"echo direct"*|*"echo-direct"*|*"html companion"*|*"html sidecar"*|*"sidecar"*|*"remote docs"*|*"devtools"*|*"state.json"*)
      return 0
      ;;
  esac
  return 1
}

print_echo_gate_header() {
  cat <<'EOF'
[AW Echo gate] Existing AW docs have incomplete human handoff. Do not answer "plan already exists" until this is repaired.
Required action: keep /aw:plan active, run `platform-core:echo-direct` for HTML companion generation, refresh colocated .html sidecars, let Echo Direct handle the approved docs publish handoff, update state.json, and return Devtools + GitHub remote links. In Codex/skill-native harnesses, running Echo Direct means loading and applying the installed skill body in the current session; do not block only because no separate callable Echo Direct tool is exposed.
Completion gate: no generated_fallback/generated_hca_fallback statuses, no local_only/blocked publish statuses, plain-text absolute Devtools Remote Docs URLs present in the final handoff, and GitHub links present as compact links or visible URLs.
EOF
  print_echo_direct_home_contract
}

print_remote_docs_reminder() {
  local state="$1"
  cat <<'EOF'
[AW Remote Docs reminder] Matching AW plan already has Echo Direct HTML companions published.
Required final handoff: include plain-text absolute Devtools remote docs URLs from .aw_docs/last-publish.json `remoteUrl` when available, plus compact GitHub links or visible GitHub URLs; do not hide Devtools behind Markdown labels, do not only say "plan already exists", or return bare Devtools/GitHub labels.
Relative `/too/docs/...` paths are not enough for chat handoff when the absolute public base URL is https://devtools.servers.stg.msgsndr.net/.
EOF
  printf '[AW Remote Docs reminder] Complete state: %s\n' "$state"
}

detect_incomplete_echo_docs() {
  local root="${1:-}"
  local prompt="${2:-}"
  local features_dir="$root/.aw_docs/features"
  local state
  local printed=""
  local count=0
  local prompt_lc
  local preferred_state=""

  if [ -z "$root" ] || [ ! -d "$features_dir" ]; then
    return 0
  fi

  prompt_lc="$(printf '%s' "$prompt" | tr '[:upper:]' '[:lower:]')"
  case "$prompt_lc" in
    *"file icon"*|*"side drawer"*|*"browser files"*|*"browse files"*)
      preferred_state="$features_dir/teamofone-awdocs-file-browser-side-drawer/state.json"
      ;;
  esac

  if [ -n "$preferred_state" ] && [ -f "$preferred_state" ] && state_needs_echo_handoff "$preferred_state"; then
    print_echo_gate_header
    printf '[AW Echo gate] Incomplete state: %s\n' "${preferred_state#$root/}"
    return 0
  fi

  if [ -n "$preferred_state" ] && [ -f "$preferred_state" ] && state_has_published_echo_links "$preferred_state"; then
    print_remote_docs_reminder "${preferred_state#$root/}"
    return 0
  fi

  while IFS= read -r state; do
    if state_needs_echo_handoff "$state"; then
      if [ -z "$printed" ]; then
        print_echo_gate_header
        printf '[AW Echo gate] Repair only the feature folder that matches the current request.\n'
        printed="1"
      fi
      printf '[AW Echo gate] Incomplete state: %s\n' "${state#$root/}"
      count=$((count + 1))
      if [ "$count" -ge 5 ]; then
        printf '[AW Echo gate] Additional incomplete feature folders omitted for prompt hygiene.\n'
        return 0
      fi
    fi
  done < <(find "$features_dir" -maxdepth 2 -name state.json -type f 2>/dev/null | sort)
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
CWD_ROOT="$(extract_cwd "$RAW")"
if [ -z "$WORKSPACE_ROOT" ]; then
  WORKSPACE_ROOT="$CWD_ROOT"
fi
PROMPT="$(extract_prompt "$RAW")"

RULES_ROOT="$(resolve_rules_root "$WORKSPACE_ROOT" || true)"
if [ -z "$RULES_ROOT" ]; then
  RULES_ROOT="$HOME/.aw_rules/platform"
fi

cat <<EOF
[AW Router reminder] Re-apply using-aw-skills and select the smallest correct AW route before substantive work.
[Rule reminder] Read ${RULES_ROOT}/universal/AGENTS.md and ${RULES_ROOT}/security/AGENTS.md, then the touched domain AGENTS.md plus references/ on demand.
EOF
PROMPT_LC="$(printf '%s' "$PROMPT" | tr '[:upper:]' '[:lower:]')"
if prompt_needs_echo_direct_hint "$PROMPT_LC"; then
  print_echo_direct_home_contract
fi
detect_incomplete_echo_docs "$WORKSPACE_ROOT" "$PROMPT"
if [ -n "$CWD_ROOT" ] && [ "$CWD_ROOT" != "$WORKSPACE_ROOT" ]; then
  detect_incomplete_echo_docs "$CWD_ROOT" "$PROMPT"
fi
