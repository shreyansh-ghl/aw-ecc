#!/usr/bin/env bash

set -euo pipefail

INHERIT_GH=false
INHERIT_CLI_AUTH=false
ROOT_DIR="/tmp/aw-isolated-test"
REAL_HOME="${AW_REAL_HOME:-$HOME}"
GH_CONFIG_BASE="${AW_GH_CONFIG_DIR:-$REAL_HOME/.config/gh}"

for arg in "$@"; do
  case "$arg" in
    --inherit-gh)
      INHERIT_GH=true
      ;;
    --inherit-cli-auth)
      INHERIT_CLI_AUTH=true
      ;;
    *)
      ROOT_DIR="$arg"
      ;;
  esac
done

HOME_DIR="$ROOT_DIR/home"
WORKSPACE_DIR="$ROOT_DIR/workspace"
NPM_CACHE_DIR="$HOME_DIR/.npm"
CONFIG_DIR="$HOME_DIR/.config"
DATA_DIR="$HOME_DIR/.local/share"
ISOLATED_GITCONFIG="$ROOT_DIR/gitconfig"
AUTH_ENV_FILE="$ROOT_DIR/auth.env"

mkdir -p "$HOME_DIR" "$WORKSPACE_DIR" "$NPM_CACHE_DIR" "$CONFIG_DIR" "$DATA_DIR"

GH_STATUS_MESSAGE=""
GH_SETUP_MESSAGE=""
INHERIT_EXPORTS=""
INHERIT_STATUS=""
CLI_AUTH_STATUS=""

if command -v gh >/dev/null 2>&1; then
  if GH_CONFIG_DIR="$GH_CONFIG_BASE" gh auth status >/dev/null 2>&1; then
    GH_STATUS_MESSAGE="GitHub CLI auth: available"
    if GH_CONFIG_DIR="$GH_CONFIG_BASE" gh auth setup-git >/dev/null 2>&1; then
      GH_SETUP_MESSAGE="gh auth setup-git: completed"
    else
      GH_SETUP_MESSAGE="gh auth setup-git: failed (run manually)"
    fi
  else
    GH_STATUS_MESSAGE="GitHub CLI auth: not logged in"
    GH_SETUP_MESSAGE="Run: gh auth login && gh auth setup-git"
  fi
else
  GH_STATUS_MESSAGE="GitHub CLI auth: gh not installed"
  GH_SETUP_MESSAGE="Install gh, then run: gh auth login && gh auth setup-git"
fi

if $INHERIT_GH; then
  INHERIT_STATUS="Credential inheritance: enabled"
  GH_TOKEN="$(GH_CONFIG_DIR="$GH_CONFIG_BASE" gh auth token 2>/dev/null || true)"

  if [[ -n "$GH_TOKEN" ]]; then
    cat > "$ISOLATED_GITCONFIG" <<EOF
[include]
	path = $REAL_HOME/.gitconfig
[url "https://x-access-token:$GH_TOKEN@github.com/"]
	insteadOf = https://github.com/
[url "https://x-access-token:$GH_TOKEN@gist.github.com/"]
	insteadOf = https://gist.github.com/
EOF
    cat > "$AUTH_ENV_FILE" <<EOF
export GH_TOKEN='$GH_TOKEN'
export GITHUB_TOKEN='$GH_TOKEN'
EOF
  else
    cat > "$ISOLATED_GITCONFIG" <<EOF
[include]
	path = $REAL_HOME/.gitconfig
EOF
    : > "$AUTH_ENV_FILE"
  fi

  chmod 600 "$AUTH_ENV_FILE"

  INHERIT_EXPORTS=$(cat <<EOF
  export GIT_CONFIG_GLOBAL="$ISOLATED_GITCONFIG"
  export GH_CONFIG_DIR="$GH_CONFIG_BASE"
  source "$AUTH_ENV_FILE"
EOF
)
else
  INHERIT_STATUS="Credential inheritance: disabled"
  : > "$AUTH_ENV_FILE"
  cat > "$ISOLATED_GITCONFIG" <<EOF
[include]
	path = $REAL_HOME/.gitconfig
EOF
fi

if $INHERIT_CLI_AUTH; then
  CLI_AUTH_STATUS="CLI auth inheritance: enabled (Codex/Cursor auth files copied during isolated init)"
else
  CLI_AUTH_STATUS="CLI auth inheritance: disabled"
fi

cat <<EOF
Isolated AW space is ready.

Root:      $ROOT_DIR
Home:      $HOME_DIR
Workspace: $WORKSPACE_DIR

$GH_STATUS_MESSAGE
$GH_SETUP_MESSAGE
$INHERIT_STATUS
$CLI_AUTH_STATUS

Use it in your shell:

  export HOME="$HOME_DIR"
  export XDG_CONFIG_HOME="\$HOME/.config"
  export XDG_DATA_HOME="\$HOME/.local/share"
  export npm_config_cache="\$HOME/.npm"
$INHERIT_EXPORTS
  cd "$WORKSPACE_DIR"
EOF
