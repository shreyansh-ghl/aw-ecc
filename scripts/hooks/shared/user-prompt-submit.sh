#!/usr/bin/env bash
# UserPromptSubmit hook — inject a compact AW routing reminder plus scoped rule reminders
#
# Output is printed to stdout as a plain-text prompt reminder.

set -euo pipefail

INPUT=$(cat)

TMPFILE=$(mktemp) || exit 0
trap 'rm -f "$TMPFILE"' EXIT

PYTHON_CMD=""
PYTHON_ARGS=()

resolve_python_cmd() {
  if [ -n "${CLV2_PYTHON_CMD:-}" ] && command -v "$CLV2_PYTHON_CMD" >/dev/null 2>&1; then
    PYTHON_CMD="$CLV2_PYTHON_CMD"
    PYTHON_ARGS=()
    return 0
  fi

  if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
    PYTHON_ARGS=()
    return 0
  fi

  if command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
    PYTHON_ARGS=()
    return 0
  fi

  if command -v py >/dev/null 2>&1; then
    PYTHON_CMD="py"
    PYTHON_ARGS=(-3)
    return 0
  fi

  return 1
}

resolve_python_cmd || exit 0

if [ "${#PYTHON_ARGS[@]}" -gt 0 ]; then
  echo "$INPUT" | "$PYTHON_CMD" "${PYTHON_ARGS[@]}" -c "
import os, sys, json, re
d = json.load(sys.stdin)
cwd = d.get('cwd', '')
prompt = d.get('prompt', '')
cwd = re.sub(r'[^a-zA-Z0-9./_@:\\\ -]', '', cwd)
prompt = prompt[:500]
stack_overlays_enabled = os.environ.get('AW_ENABLE_STACK_OVERLAY_RULES') == '1'
print(f'CWD={cwd}')
prompt_lower = prompt.lower()
if any(k in prompt_lower for k in ['controller', 'service', 'module', '@body', 'nestjs', 'worker', 'dto']):
    print('DOMAIN=backend')
    if stack_overlays_enabled and any(k in prompt_lower for k in ['nestjs', '@body', '@controller', '@module', 'class-validator', 'dto']):
        print('STACK=nestjs')
    elif stack_overlays_enabled and any(k in prompt_lower for k in ['connectrpc', 'connect-go', 'buf.gen', 'protoc-gen-connect-go']):
        print('STACK=go-connect')
elif any(k in prompt_lower for k in ['vue', 'component', 'template', 'frontend', '<script', 'nuxt']):
    print('DOMAIN=frontend')
    if stack_overlays_enabled and any(k in prompt_lower for k in ['nuxt', 'app.vue', 'useasyncdata', 'definepagemeta']):
        print('STACK=nuxt')
    elif stack_overlays_enabled and any(k in prompt_lower for k in ['vue', '<script', 'script setup', 'composable']):
        print('STACK=vue')
elif any(k in prompt_lower for k in ['mongo', 'redis', 'schema', 'migration', 'database', 'index']):
    print('DOMAIN=data')
elif any(k in prompt_lower for k in ['helm', 'terraform', 'kubernetes', 'k8s', 'deploy', 'dockerfile']):
    print('DOMAIN=infra')
else:
    print('DOMAIN=universal')
" > "$TMPFILE" 2>/dev/null || exit 0
else
  echo "$INPUT" | "$PYTHON_CMD" -c "
import os, sys, json, re
d = json.load(sys.stdin)
cwd = d.get('cwd', '')
prompt = d.get('prompt', '')
cwd = re.sub(r'[^a-zA-Z0-9./_@ -]', '', cwd)
prompt = prompt[:500]
stack_overlays_enabled = os.environ.get('AW_ENABLE_STACK_OVERLAY_RULES') == '1'
print(f'CWD={cwd}')
prompt_lower = prompt.lower()
if any(k in prompt_lower for k in ['controller', 'service', 'module', '@body', 'nestjs', 'worker', 'dto']):
    print('DOMAIN=backend')
    if stack_overlays_enabled and any(k in prompt_lower for k in ['nestjs', '@body', '@controller', '@module', 'class-validator', 'dto']):
        print('STACK=nestjs')
    elif stack_overlays_enabled and any(k in prompt_lower for k in ['connectrpc', 'connect-go', 'buf.gen', 'protoc-gen-connect-go']):
        print('STACK=go-connect')
elif any(k in prompt_lower for k in ['vue', 'component', 'template', 'frontend', '<script', 'nuxt']):
    print('DOMAIN=frontend')
    if stack_overlays_enabled and any(k in prompt_lower for k in ['nuxt', 'app.vue', 'useasyncdata', 'definepagemeta']):
        print('STACK=nuxt')
    elif stack_overlays_enabled and any(k in prompt_lower for k in ['vue', '<script', 'script setup', 'composable']):
        print('STACK=vue')
elif any(k in prompt_lower for k in ['mongo', 'redis', 'schema', 'migration', 'database', 'index']):
    print('DOMAIN=data')
elif any(k in prompt_lower for k in ['helm', 'terraform', 'kubernetes', 'k8s', 'deploy', 'dockerfile']):
    print('DOMAIN=infra')
else:
    print('DOMAIN=universal')
" > "$TMPFILE" 2>/dev/null || exit 0
fi

CWD="" DOMAIN="universal" STACK=""
while IFS='=' read -r key value; do
  case "${key:-}" in
    CWD)    CWD="$value" ;;
    DOMAIN) DOMAIN="$value" ;;
    STACK)  STACK="$value" ;;
  esac
done < "$TMPFILE"

RULES_DIR=""
DOMAIN_AGENTS=""
STACK_AGENTS=""

if [ -d "$CWD/.aw_registry/.aw_rules/platform" ]; then
  RULES_DIR="$CWD/.aw_registry/.aw_rules/platform"
  DOMAIN_AGENTS="$RULES_DIR/$DOMAIN/AGENTS.md"
elif [ -d "$CWD/.aw_rules" ]; then
  RULES_DIR="$CWD/.aw_rules"
  DOMAIN_AGENTS="$RULES_DIR/$DOMAIN/AGENTS.md"
fi

[ -n "$RULES_DIR" ] || exit 0
[ -f "$DOMAIN_AGENTS" ] || exit 0

if [ -n "$STACK" ] && [ -f "$RULES_DIR/$DOMAIN/$STACK/AGENTS.md" ]; then
  STACK_AGENTS="$RULES_DIR/$DOMAIN/$STACK/AGENTS.md"
fi

DOMAIN_RULES=$(head -20 "$DOMAIN_AGENTS" 2>/dev/null || echo "")
STACK_RULES=""
if [ -n "$STACK_AGENTS" ]; then
  STACK_RULES=$(head -20 "$STACK_AGENTS" 2>/dev/null || echo "")
fi

RULE_BULLETS=$(printf '%s\n%s\n' "$DOMAIN_RULES" "$STACK_RULES" | grep -E "^\- .*(MUST|Never)" | awk '!seen[$0]++' | head -8 2>/dev/null || true)

[ -z "$DOMAIN_RULES" ] && [ -z "$STACK_RULES" ] && exit 0

cat << EOF
[AW Router reminder] Re-apply using-aw-skills for this prompt and re-select the smallest correct AW route and stage skill before substantive work.
[Rule reminder — $RULES_DIR/$DOMAIN${STACK_AGENTS:+/$STACK}] Active MUST rules for this scope. Follow them.
${RULE_BULLETS:-See $DOMAIN_AGENTS${STACK_AGENTS:+ and $STACK_AGENTS}}
EOF

exit 0
