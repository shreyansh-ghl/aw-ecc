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

print_echo_gate_header() {
  cat <<'EOF'
[AW Echo gate] Existing AW docs have incomplete human handoff. Do not answer "plan already exists" until this is repaired.
Required action: keep /aw:plan active, run `platform-core:echo-direct` for HTML companion generation, refresh colocated .html sidecars, let Echo Direct handle the approved docs publish handoff, update state.json, and return Devtools + GitHub remote links.
Completion gate: no generated_fallback/generated_hca_fallback statuses, no local_only/blocked publish statuses, plain-text absolute Devtools Remote Docs URLs present in the final handoff, and GitHub links present as compact links or visible URLs.
EOF
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
detect_incomplete_echo_docs "$WORKSPACE_ROOT" "$PROMPT"
if [ -n "$CWD_ROOT" ] && [ "$CWD_ROOT" != "$WORKSPACE_ROOT" ]; then
  detect_incomplete_echo_docs "$CWD_ROOT" "$PROMPT"
fi
