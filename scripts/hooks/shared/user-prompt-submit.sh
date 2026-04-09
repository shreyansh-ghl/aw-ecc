#!/usr/bin/env bash
# UserPromptSubmit hook — emit a small, reliable AW routing reminder.
#
# This hook intentionally stays simple:
# - drain stdin so the harness can always finish writing payloads
# - remind the model to re-apply using-aw-skills
# - point at AGENTS.md and the canonical .aw_rules/platform tree when present

set -euo pipefail

cat >/dev/null || true

CWD="$(pwd)"
AGENTS_PATH="$CWD/AGENTS.md"
RULES_ROOT=""

for candidate in \
  "$CWD/.aw_rules/platform" \
  "$HOME/.aw_rules/platform" \
  "$HOME/.aw/.aw_rules/platform"
do
  if [ -d "$candidate" ]; then
    RULES_ROOT="$candidate"
    break
  fi
done

RULE_REFS=()

if [ -f "$AGENTS_PATH" ]; then
  RULE_REFS+=("$AGENTS_PATH")
fi

if [ -n "$RULES_ROOT" ]; then
  if [ -f "$RULES_ROOT/universal/AGENTS.md" ]; then
    RULE_REFS+=("$RULES_ROOT/universal/AGENTS.md")
  fi
  if [ -f "$RULES_ROOT/security/AGENTS.md" ]; then
    RULE_REFS+=("$RULES_ROOT/security/AGENTS.md")
  fi
  RULE_SCOPE="Applicable domain rules live under $RULES_ROOT."
else
  RULE_SCOPE="Applicable domain rules live under .aw_rules/platform when synced."
fi

if [ "${#RULE_REFS[@]}" -gt 0 ]; then
  RULE_PATHS=""
  while IFS= read -r line; do
    if [ -z "$RULE_PATHS" ]; then
      RULE_PATHS="$line"
    else
      RULE_PATHS="$RULE_PATHS, $line"
    fi
  done < <(printf '%s\n' "${RULE_REFS[@]}" | awk '!seen[$0]++')
else
  RULE_PATHS="AGENTS.md"
fi

cat <<EOF
[AW Router reminder] Re-apply using-aw-skills for this prompt and select the smallest correct AW route and stage skill before substantive work.
[Rules reminder] Start with $RULE_PATHS. Universal and security rules always apply. $RULE_SCOPE
EOF

exit 0
