#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULT_DIR="${AW_SDLC_GOLDEN_RESULT_DIR:-$ROOT_DIR/tests/results/routing-golden-path-$(date +%Y%m%d-%H%M%S)}"
CODEX_CONFIG_PATH="${CODEX_CONFIG_PATH:-$HOME/.codex/config.toml}"

AW_SDLC_GOLDEN_REPO="${AW_SDLC_GOLDEN_REPO:-GoHighLevel/ghl-revex-frontend}"
AW_SDLC_GOLDEN_PR_NUMBER="${AW_SDLC_GOLDEN_PR_NUMBER:-5120}"
AW_SDLC_GOLDEN_APP="${AW_SDLC_GOLDEN_APP:-communities-builder}"
AW_SDLC_GOLDEN_APP_ALIASES="${AW_SDLC_GOLDEN_APP_ALIASES:-communities}"
AW_SDLC_GOLDEN_TEAM="${AW_SDLC_GOLDEN_TEAM:-revex}"
AW_SDLC_GOLDEN_JENKINS_PATH="${AW_SDLC_GOLDEN_JENKINS_PATH:-staging-versions/revex/ghl-revex-frontend}"
AW_SDLC_GOLDEN_PROFILE="${AW_SDLC_GOLDEN_PROFILE:-revex-microfrontend-staging}"
AW_SDLC_GOLDEN_MODE="${AW_SDLC_GOLDEN_MODE:-staging}"
AW_SDLC_GOLDEN_TIMEOUT_SEC="${AW_SDLC_GOLDEN_TIMEOUT_SEC:-60}"

mkdir -p "$RESULT_DIR"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command gh
require_command python3
require_command node

RUNTIME_INFO_FILE="$RESULT_DIR/runtime-info.txt"

CODEX_CONFIG_PATH="$CODEX_CONFIG_PATH" \
RUNTIME_INFO_FILE="$RUNTIME_INFO_FILE" \
AW_SDLC_GHL_AI_URL="${AW_SDLC_GHL_AI_URL:-}" \
AW_SDLC_GHL_AI_BEARER_TOKEN="${AW_SDLC_GHL_AI_BEARER_TOKEN:-}" \
GHL_AI_MCP_BEARER_TOKEN="${GHL_AI_MCP_BEARER_TOKEN:-}" \
eval "$(python3 <<'PY'
import os
import pathlib
import re
import shlex

config_path = pathlib.Path(os.environ["CODEX_CONFIG_PATH"]).expanduser()
runtime_info_path = pathlib.Path(os.environ["RUNTIME_INFO_FILE"])
default_url = "https://services.leadconnectorhq.com/agentic-workspace/mcp"

url = os.environ.get("AW_SDLC_GHL_AI_URL", "").strip() or default_url
token = (
    os.environ.get("AW_SDLC_GHL_AI_BEARER_TOKEN", "").strip()
    or os.environ.get("GHL_AI_MCP_BEARER_TOKEN", "").strip()
)
token_source = "environment" if token else "missing"

if config_path.exists():
    text = config_path.read_text(encoding="utf-8", errors="replace")
    section_match = re.search(r"(?ms)^\[mcp_servers\.ghl-ai\]\s*(.*?)^\[", text + "\n[")
    section_text = section_match.group(1) if section_match else ""
    headers_match = re.search(r"(?ms)^\[mcp_servers\.ghl-ai\.headers\]\s*(.*?)^\[", text + "\n[")
    headers_text = headers_match.group(1) if headers_match else ""

    url_match = re.search(r'^\s*url\s*=\s*"([^"]+)"', section_text, re.MULTILINE)
    if url_match:
        url = url_match.group(1).strip()

    if not token:
        bearer_match = re.search(r'^\s*bearer_token\s*=\s*"([^"]+)"', section_text, re.MULTILINE)
        if bearer_match:
            token = bearer_match.group(1).strip()
            token_source = "config.bearer_token"
        else:
            auth_match = re.search(
                r'^\s*Authorization\s*=\s*"Bearer\s+([^"]+)"',
                headers_text,
                re.MULTILINE,
            )
            if auth_match:
                token = auth_match.group(1).strip()
                token_source = "config.headers.Authorization"

runtime_info_path.write_text(
    "\n".join([url, token_source, "1" if token else "0"]) + "\n",
    encoding="utf-8",
)

def emit(name, value):
    print(f"{name}={shlex.quote(value)}")

emit("AW_SDLC_GHL_AI_URL", url)
emit("AW_SDLC_GHL_AI_TOKEN_SOURCE", token_source)
emit("AW_SDLC_GHL_AI_TOKEN_PRESENT", "1" if token else "0")
emit("AW_SDLC_GHL_AI_TOKEN", token)
PY
)"

if [[ "$AW_SDLC_GHL_AI_TOKEN_PRESENT" != "1" ]]; then
  echo "Missing ghl-ai token in env or $CODEX_CONFIG_PATH" >&2
  exit 1
fi

gh pr view "$AW_SDLC_GOLDEN_PR_NUMBER" \
  --repo "$AW_SDLC_GOLDEN_REPO" \
  --json number,title,headRefName,baseRefName,state,url,body \
  > "$RESULT_DIR/pr.json"

eval "$(RESULT_DIR="$RESULT_DIR" python3 <<'PY'
import json
import os
import pathlib

pr = json.loads((pathlib.Path(os.environ["RESULT_DIR"]) / "pr.json").read_text())
branch = pr["headRefName"]
version = branch.replace("/", "-")
print(f"AW_SDLC_GOLDEN_BRANCH='{branch}'")
print(f"AW_SDLC_GOLDEN_VERSION='{version}'")
print(f"AW_SDLC_GOLDEN_PR_URL='{pr['url']}'")
print(f"AW_SDLC_GOLDEN_PR_STATE='{pr['state']}'")
PY
)"

AW_SDLC_GHL_AI_URL="$AW_SDLC_GHL_AI_URL" \
AW_SDLC_GHL_AI_TOKEN="$AW_SDLC_GHL_AI_TOKEN" \
AW_SDLC_GOLDEN_REPO="$AW_SDLC_GOLDEN_REPO" \
AW_SDLC_GOLDEN_PR_NUMBER="$AW_SDLC_GOLDEN_PR_NUMBER" \
AW_SDLC_GOLDEN_JENKINS_PATH="$AW_SDLC_GOLDEN_JENKINS_PATH" \
AW_SDLC_GOLDEN_BRANCH="$AW_SDLC_GOLDEN_BRANCH" \
AW_SDLC_GOLDEN_VERSION="$AW_SDLC_GOLDEN_VERSION" \
AW_SDLC_GOLDEN_APP="$AW_SDLC_GOLDEN_APP" \
AW_SDLC_GOLDEN_APP_ALIASES="$AW_SDLC_GOLDEN_APP_ALIASES" \
AW_SDLC_GOLDEN_TIMEOUT_SEC="$AW_SDLC_GOLDEN_TIMEOUT_SEC" \
RESULT_DIR="$RESULT_DIR" \
python3 <<'PY'
import json
import os
import pathlib
import re
import urllib.error
import urllib.request

result_dir = pathlib.Path(os.environ["RESULT_DIR"])
url = os.environ["AW_SDLC_GHL_AI_URL"]
token = os.environ["AW_SDLC_GHL_AI_TOKEN"]
jenkins_path = os.environ["AW_SDLC_GOLDEN_JENKINS_PATH"]
branch = os.environ["AW_SDLC_GOLDEN_BRANCH"]
version = os.environ["AW_SDLC_GOLDEN_VERSION"]
app = os.environ["AW_SDLC_GOLDEN_APP"]
aliases = [item.strip() for item in os.environ["AW_SDLC_GOLDEN_APP_ALIASES"].split(",") if item.strip()]
timeout_sec = int(os.environ["AW_SDLC_GOLDEN_TIMEOUT_SEC"])

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": "aw-sdlc-routing-golden-path/1.0",
}

queue_pattern = re.compile(r"https://jenkins\.msgsndr\.net/queue/item/\d+/", re.I)
build_pattern = re.compile(r"https://jenkins\.msgsndr\.net/job/.+/\d+/", re.I)
build_number_pattern = re.compile(r'\"number\"\s*:\s*(\d+)')

def write_json(path, payload):
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

def call_mcp(name, payload):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    response_payload = {
        "name": name,
        "ok": False,
        "http_status": None,
        "json": None,
        "error": None,
    }
    try:
        with urllib.request.urlopen(request, timeout=timeout_sec) as response:
            body = response.read().decode("utf-8")
            response_payload["http_status"] = response.status
            response_payload["json"] = json.loads(body)
            response_payload["ok"] = 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        response_payload["http_status"] = exc.code
        response_payload["error"] = body
    except Exception as exc:
        response_payload["error"] = f"{type(exc).__name__}: {exc}"
    write_json(result_dir / f"{name}.json", response_payload)
    return response_payload

def extract_text(response_payload):
    content = ((response_payload.get("json") or {}).get("result") or {}).get("content") or []
    return "\n".join(item.get("text", "") for item in content)

job_before = call_mcp(
    "golden-job-before",
    {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": "jenkins_get-job", "arguments": {"path": jenkins_path}},
    },
)

job_before_text = extract_text(job_before)
job_before_last_build = None
match = build_number_pattern.search(job_before_text)
if match:
    job_before_last_build = int(match.group(1))

attempts = []
for flag_name in [app] + aliases:
    args = {"path": jenkins_path, "Branch": branch, "Version": version, flag_name: True}
    response = call_mcp(
        f"golden-trigger-{flag_name.replace('/', '-').replace(' ', '-')}",
        {
            "jsonrpc": "2.0",
            "id": len(attempts) + 2,
            "method": "tools/call",
            "params": {"name": "jenkins_trigger-build", "arguments": args},
        },
    )
    text = extract_text(response)
    attempts.append(
        {
            "flag_name": flag_name,
            "args": args,
            "ok": response["ok"],
            "http_status": response["http_status"],
            "queue_url": queue_pattern.search(text).group(0) if queue_pattern.search(text) else None,
            "build_url": build_pattern.search(text).group(0) if build_pattern.search(text) else None,
            "text": text,
            "error": response["error"],
        }
    )
    if attempts[-1]["queue_url"] or attempts[-1]["build_url"]:
        break

job_after = call_mcp(
    "golden-job-after",
    {
        "jsonrpc": "2.0",
        "id": 99,
        "method": "tools/call",
        "params": {"name": "jenkins_get-job", "arguments": {"path": jenkins_path}},
    },
)

job_after_text = extract_text(job_after)
job_after_last_build = None
match = build_number_pattern.search(job_after_text)
if match:
    job_after_last_build = int(match.group(1))

selected = attempts[-1] if attempts else None
build_url = selected["build_url"] if selected else None
queue_url = selected["queue_url"] if selected else None
if not build_url and job_after_last_build and job_after_last_build != job_before_last_build:
    build_url = f"https://jenkins.msgsndr.net/job/staging-versions/job/revex/job/ghl-revex-frontend/{job_after_last_build}/"

summary = {
    "repo": os.environ.get("AW_SDLC_GOLDEN_REPO"),
    "pr_number": os.environ.get("AW_SDLC_GOLDEN_PR_NUMBER"),
    "branch": branch,
    "version": version,
    "app": app,
    "aliases": aliases,
    "job_path": jenkins_path,
    "job_before_last_build": job_before_last_build,
    "job_after_last_build": job_after_last_build,
    "queue_url": queue_url,
    "build_url": build_url,
    "selected_flag": selected["flag_name"] if selected else None,
    "attempts": attempts,
}

write_json(result_dir / "golden-summary.json", summary)
PY

eval "$(RESULT_DIR="$RESULT_DIR" AW_SDLC_GOLDEN_TEAM="$AW_SDLC_GOLDEN_TEAM" AW_SDLC_GOLDEN_APP="$AW_SDLC_GOLDEN_APP" python3 <<'PY'
import json
import os
import pathlib

summary = json.loads((pathlib.Path(os.environ["RESULT_DIR"]) / "golden-summary.json").read_text())
queue_url = summary.get("queue_url") or ""
build_url = summary.get("build_url") or ""
selected_flag = summary.get("selected_flag") or os.environ["AW_SDLC_GOLDEN_APP"]
job_before = summary.get("job_before_last_build")
job_after = summary.get("job_after_last_build")

attempt_lines = []
for attempt in summary.get("attempts", []):
    status = "ok" if attempt.get("ok") else "error"
    detail = attempt.get("error") or attempt.get("text") or "no response text"
    attempt_lines.append(f"Attempted jenkins_trigger-build with {attempt['flag_name']}=true ({status}): {detail}")

build_status = "IN_PROGRESS" if queue_url or build_url else "BLOCKED"
outcome = (
    "Live PR-plus-staging golden-path evidence captured."
    if queue_url or build_url
    else "Live PR capture succeeded, but the staging trigger did not return queue/build evidence through production ghl-ai."
)
recommended_next = (
    "Poll the Jenkins build to final status, confirm the remoteEntry.js is reachable, then run the strict outcome-artifacts gate with PR required."
    if queue_url or build_url
    else "Investigate the production ghl-ai jenkins_trigger-build write path for branch-scoped revex frontend deploys, then rerun this golden-path script."
)
testing_url = build_url or ""
versioned_link = f"https://staging.appcdn.leadconnectorhq.com/{os.environ['AW_SDLC_GOLDEN_TEAM']}/{os.environ['AW_SDLC_GOLDEN_APP']}--ver--{summary['version']}/remoteEntry.js"
execution_summary = f"Used PR branch {summary['branch']} from the real GitHub PR as the deploy candidate."
build_links = ""
if job_before and job_after:
    build_links = f"Jenkins lastBuild before trigger attempt: {job_before} || Jenkins lastBuild after trigger attempt: {job_after}"
execution_evidence = " || ".join(attempt_lines)

def emit(name, value):
    escaped = str(value).replace("'", "'\"'\"'")
    print(f"{name}='{escaped}'")

emit('AW_GOLDEN_QUEUE_URL', queue_url)
emit('AW_GOLDEN_BUILD_URL', build_url)
emit('AW_GOLDEN_SELECTED_FLAG', selected_flag)
emit('AW_GOLDEN_BUILD_STATUS', build_status)
emit('AW_GOLDEN_OUTCOME', outcome)
emit('AW_GOLDEN_RECOMMENDED_NEXT', recommended_next)
emit('AW_GOLDEN_TESTING_URL', testing_url)
emit('AW_GOLDEN_VERSIONED_LINK', versioned_link)
emit('AW_GOLDEN_EXECUTION_SUMMARY', execution_summary)
emit('AW_GOLDEN_EXECUTION_EVIDENCE', execution_evidence)
emit('AW_GOLDEN_BUILD_LINKS', build_links)
PY
)"

RELEASE_FILE="$RESULT_DIR/release.md"

AW_SDLC_LIVE_RELEASE_FILE="$RELEASE_FILE" \
AW_SDLC_GOAL="Capture a real PR-plus-staging golden-path artifact for $AW_SDLC_GOLDEN_REPO PR #$AW_SDLC_GOLDEN_PR_NUMBER" \
AW_SDLC_PROFILE_USED="$AW_SDLC_GOLDEN_PROFILE" \
AW_SDLC_SELECTED_MODE="$AW_SDLC_GOLDEN_MODE" \
AW_SDLC_PIPELINE_PROVIDER="ghl-ai -> git-jenkins :: $AW_SDLC_GOLDEN_JENKINS_PATH" \
AW_SDLC_VERSION_STRATEGY="Versioned frontend staging deploy using PR branch $AW_SDLC_GOLDEN_BRANCH" \
AW_SDLC_DEPLOYED_VERSION="$AW_SDLC_GOLDEN_VERSION" \
AW_SDLC_VERSION_ROUTING_SIGNAL="$AW_GOLDEN_SELECTED_FLAG=true" \
AW_SDLC_VERSIONED_LINKS="$AW_GOLDEN_VERSIONED_LINK" \
AW_SDLC_JENKINS_QUEUE_URL="$AW_GOLDEN_QUEUE_URL" \
AW_SDLC_JENKINS_BUILD_URL="$AW_GOLDEN_BUILD_URL" \
AW_SDLC_BUILD_LINKS="$AW_GOLDEN_BUILD_LINKS" \
AW_SDLC_TESTING_AUTOMATION_URL="$AW_GOLDEN_TESTING_URL" \
AW_SDLC_BUILD_STATUS="$AW_GOLDEN_BUILD_STATUS" \
AW_SDLC_EXECUTION_SUMMARY="$AW_GOLDEN_EXECUTION_SUMMARY" \
AW_SDLC_EXECUTION_EVIDENCE="$AW_GOLDEN_EXECUTION_EVIDENCE" \
AW_SDLC_OUTCOME="$AW_GOLDEN_OUTCOME" \
AW_SDLC_RECOMMENDED_NEXT="$AW_GOLDEN_RECOMMENDED_NEXT" \
AW_SDLC_PR_URL="$AW_SDLC_GOLDEN_PR_URL" \
AW_SDLC_PR_STATUS="$AW_SDLC_GOLDEN_PR_STATE" \
node "$ROOT_DIR/tests/evals/generate-aw-sdlc-live-release.js"

cat > "$RESULT_DIR/summary.txt" <<EOF
AW SDLC routing golden path
Result dir: $RESULT_DIR
Repo: $AW_SDLC_GOLDEN_REPO
PR: $AW_SDLC_GOLDEN_PR_URL
Branch: $AW_SDLC_GOLDEN_BRANCH
Version: $AW_SDLC_GOLDEN_VERSION
App: $AW_SDLC_GOLDEN_APP
Selected trigger flag: $AW_GOLDEN_SELECTED_FLAG
Queue URL: ${AW_GOLDEN_QUEUE_URL:-NOT_CAPTURED}
Build URL: ${AW_GOLDEN_BUILD_URL:-NOT_CAPTURED}
Build Status: $AW_GOLDEN_BUILD_STATUS
Release file: $RELEASE_FILE
EOF

cat "$RESULT_DIR/summary.txt"
