#!/usr/bin/env bash
set -euo pipefail

cat >/dev/null || true

CONTEXT=$(cat <<'EOF'
# AW Session Context

using-aw-skills is active. Treat the AW router as already loaded before any substantive response.

## First Response Rule
- Select the smallest correct AW skill stack before exploration, implementation, or clarifying questions.
- Honor explicit `/aw:plan`, `/aw:execute`, `/aw:verify`, `/aw:deploy`, and `/aw:ship` commands first.
- If no explicit command is present, choose one primary AW route by intent, then load deeper domain skills only as needed.

## Public AW Surface
- `/aw:plan` - planning artifacts, specs, architecture, and task breakdown
- `/aw:execute` - implement approved work and continue active execution
- `/aw:verify` - evidence, review, testing, readiness, and governance
- `/aw:deploy` - one verified release outcome such as a PR, branch handoff, or deploy
- `/aw:ship` - clearly end-to-end multi-stage delivery

## Routing Priority
- Process skills first: `aw-brainstorm`, `aw-debug`, `aw-review`, `aw-prepare`
- Stage skills second: `aw-plan`, `aw-execute`, `aw-verify`, `aw-deploy`
- Domain skills third: frontend, backend, data, infra, review, and test skills

## Intent Mapping
- Fuzzy requests, PRDs, architecture, design, or task breakdown -> `/aw:plan`
- Approved implementation, bug fixes, or continuing work -> `/aw:execute`
- Review, validation, testing, readiness, or compliance -> `/aw:verify`
- One release outcome -> `/aw:deploy`
- PR plus deploy, or clearly end-to-end work -> `/aw:ship`

## Skill loading
- Read stage/domain SKILL.md via the Skill tool when routing requires it.
- Do not enumerate the full registry at session start.
EOF
)

JSON_CONTEXT=$(printf '%s' "$CONTEXT" | python3 -c '
import sys, json
print(json.dumps(sys.stdin.read()))
' 2>/dev/null || printf '%s' "$CONTEXT" | sed 's/\\/\\\\/g; s/"/\\"/g' | awk '{printf "%s\\n", $0}')

if [[ -n "${CURSOR_PLUGIN_ROOT:-}" ]]; then
  echo "{\"additional_context\": ${JSON_CONTEXT}}"
else
  echo "{\"hookSpecificOutput\": {\"hookEventName\": \"SessionStart\", \"additionalContext\": ${JSON_CONTEXT}}}"
fi
