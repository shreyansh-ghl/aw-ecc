#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RESULT_DIR="${AW_SDLC_GHL_AI_RESULT_DIR:-$ROOT_DIR/tests/results/ghl-ai-standalone-smoke-$(date +%Y%m%d-%H%M%S)}"
AW_SDLC_EVAL_CLI="${AW_SDLC_EVAL_CLI:-codex}"
AW_SDLC_GHL_AI_TIMEOUT_SEC="${AW_SDLC_GHL_AI_TIMEOUT_SEC:-20}"
CODEX_CONFIG_PATH="${CODEX_CONFIG_PATH:-$HOME/.codex/config.toml}"

mkdir -p "$RESULT_DIR"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command "$AW_SDLC_EVAL_CLI"
require_command python3

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

    section_match = re.search(
        r"(?ms)^\[mcp_servers\.ghl-ai\]\s*(.*?)^\[",
        text + "\n[",
    )
    section_text = section_match.group(1) if section_match else ""
    headers_match = re.search(
        r"(?ms)^\[mcp_servers\.ghl-ai\.headers\]\s*(.*?)^\[",
        text + "\n[",
    )
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

CODEX_CONFIG_PATH="$CODEX_CONFIG_PATH" \
AW_SDLC_GHL_AI_URL="$AW_SDLC_GHL_AI_URL" \
AW_SDLC_GHL_AI_TOKEN_SOURCE="$AW_SDLC_GHL_AI_TOKEN_SOURCE" \
AW_SDLC_GHL_AI_TOKEN_PRESENT="$AW_SDLC_GHL_AI_TOKEN_PRESENT" \
AW_SDLC_EVAL_CLI="$AW_SDLC_EVAL_CLI" \
AW_SDLC_GHL_AI_TIMEOUT_SEC="$AW_SDLC_GHL_AI_TIMEOUT_SEC" \
python3 <<'PY' > "$RESULT_DIR/runtime-config.json"
import json
import os

print(
    json.dumps(
        {
            "codex_config_path": os.environ["CODEX_CONFIG_PATH"],
            "ghl_ai_url": os.environ["AW_SDLC_GHL_AI_URL"],
            "token_source": os.environ["AW_SDLC_GHL_AI_TOKEN_SOURCE"],
            "token_present": os.environ["AW_SDLC_GHL_AI_TOKEN_PRESENT"] == "1",
            "cli": os.environ["AW_SDLC_EVAL_CLI"],
            "timeout_sec": int(os.environ["AW_SDLC_GHL_AI_TIMEOUT_SEC"]),
        },
        indent=2,
    )
)
PY

if [[ "$AW_SDLC_GHL_AI_TOKEN_PRESENT" != "1" ]]; then
  cat > "$RESULT_DIR/summary.txt" <<EOF
AW SDLC ghl-ai standalone smoke
Result dir: $RESULT_DIR

FAIL Missing ghl-ai bearer token.
Checked:
- env AW_SDLC_GHL_AI_BEARER_TOKEN
- env GHL_AI_MCP_BEARER_TOKEN
- $CODEX_CONFIG_PATH
EOF
  cat "$RESULT_DIR/summary.txt"
  exit 1
fi

"$AW_SDLC_EVAL_CLI" mcp list > "$RESULT_DIR/current-codex-mcp-list.txt" 2>&1 || true

write_codex_config() {
  local home_dir="$1"
  local include_ghl_ai="$2"

  mkdir -p "$home_dir/.codex"
  cat > "$home_dir/.codex/config.toml" <<EOF
approval_policy = "never"
sandbox_mode = "workspace-write"
model = "gpt-5.4"
model_reasoning_effort = "medium"
EOF

  if [[ "$include_ghl_ai" == "1" ]]; then
    cat >> "$home_dir/.codex/config.toml" <<EOF

[mcp_servers.ghl-ai]
url = "$AW_SDLC_GHL_AI_URL"
bearer_token_env_var = "GHL_AI_MCP_BEARER_TOKEN"
EOF
  fi
}

run_codex_case() {
  local case_id="$1"
  local include_ghl_ai="$2"
  local home_dir="$RESULT_DIR/$case_id-home"
  local work_dir="$RESULT_DIR/$case_id-work"
  local log_file="$RESULT_DIR/$case_id.log"
  local out_file="$RESULT_DIR/$case_id.out.txt"
  local meta_file="$RESULT_DIR/$case_id.meta.json"

  mkdir -p "$work_dir"
  write_codex_config "$home_dir" "$include_ghl_ai"

  if [[ "$include_ghl_ai" == "1" ]]; then
    env \
      HOME="$home_dir" \
      GHL_AI_MCP_BEARER_TOKEN="$AW_SDLC_GHL_AI_TOKEN" \
      "$AW_SDLC_EVAL_CLI" mcp list > "$RESULT_DIR/$case_id-mcp-list.txt" 2>&1 || true
  fi

  CASE_ID="$case_id" \
  HOME_DIR="$home_dir" \
  WORK_DIR="$work_dir" \
  LOG_FILE="$log_file" \
  OUT_FILE="$out_file" \
  META_FILE="$meta_file" \
  AW_SDLC_EVAL_CLI="$AW_SDLC_EVAL_CLI" \
  AW_SDLC_GHL_AI_TIMEOUT_SEC="$AW_SDLC_GHL_AI_TIMEOUT_SEC" \
  GHL_AI_MCP_BEARER_TOKEN="$AW_SDLC_GHL_AI_TOKEN" \
  python3 <<'PY'
import json
import os
import pathlib
import subprocess
import time

case_id = os.environ["CASE_ID"]
home_dir = os.environ["HOME_DIR"]
work_dir = os.environ["WORK_DIR"]
log_file = pathlib.Path(os.environ["LOG_FILE"])
out_file = pathlib.Path(os.environ["OUT_FILE"])
meta_file = pathlib.Path(os.environ["META_FILE"])
cli = os.environ["AW_SDLC_EVAL_CLI"]
timeout_sec = int(os.environ["AW_SDLC_GHL_AI_TIMEOUT_SEC"])

env = os.environ.copy()
env["HOME"] = home_dir

command = [
    cli,
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "-C",
    work_dir,
    "-o",
    str(out_file),
    "Reply with exactly READY.",
]

started_at = time.time()
meta = {
    "case_id": case_id,
    "status": "unknown",
    "exit_code": None,
    "timeout_sec": timeout_sec,
    "duration_sec": None,
    "out_exists": False,
    "out_text": None,
    "rmcp_decode_error": False,
    "openai_websocket_error": False,
    "plugin_sync_error": False,
}

with log_file.open("w") as log_handle:
    try:
        completed = subprocess.run(
            command,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            env=env,
            timeout=timeout_sec,
            check=False,
        )
        meta["status"] = "completed"
        meta["exit_code"] = completed.returncode
    except subprocess.TimeoutExpired:
        meta["status"] = "timeout"

meta["duration_sec"] = round(time.time() - started_at, 3)

if out_file.exists():
    meta["out_exists"] = True
    meta["out_text"] = out_file.read_text(encoding="utf-8", errors="replace").strip()

log_text = log_file.read_text(encoding="utf-8", errors="replace") if log_file.exists() else ""
meta["rmcp_decode_error"] = "JsonRpcMessage" in log_text
meta["openai_websocket_error"] = "wss://api.openai.com/v1/responses" in log_text
meta["plugin_sync_error"] = "plugins/featured" in log_text
meta["ready"] = (
    meta["status"] == "completed"
    and meta["exit_code"] == 0
    and meta["out_text"] == "READY"
)

meta_file.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
PY
}

run_codex_case "standalone-no-mcp" "0"
run_codex_case "standalone-ghl-ai-only" "1"

AW_SDLC_GHL_AI_URL="$AW_SDLC_GHL_AI_URL" \
AW_SDLC_GHL_AI_TOKEN="$AW_SDLC_GHL_AI_TOKEN" \
RESULT_DIR="$RESULT_DIR" \
python3 <<'PY'
import json
import os
import pathlib
import re
import urllib.error
import urllib.request

url = os.environ["AW_SDLC_GHL_AI_URL"]
token = os.environ["AW_SDLC_GHL_AI_TOKEN"]
result_dir = pathlib.Path(os.environ["RESULT_DIR"])

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "User-Agent": "curl/8.7.1",
}

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
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            response_payload["http_status"] = response.status
            response_payload["json"] = json.loads(body)
            response_payload["ok"] = 200 <= response.status < 300
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        response_payload["http_status"] = exc.code
        response_payload["error"] = body
    except Exception as exc:  # pragma: no cover - defensive harness code
        response_payload["error"] = str(exc)

    write_json(result_dir / f"{name}.json", response_payload)
    return response_payload

initialize = call_mcp(
    "direct-initialize",
    {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-03-26",
            "capabilities": {},
            "clientInfo": {"name": "aw-sdlc-standalone-smoke", "version": "1.0.0"},
        },
    },
)

tools_list = call_mcp(
    "direct-tools-list",
    {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
)

mcp_health = call_mcp(
    "direct-mcp-health",
    {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {"name": "mcp_health", "arguments": {}},
    },
)

jenkins_list_jobs = call_mcp(
    "direct-jenkins-list-jobs",
    {
        "jsonrpc": "2.0",
        "id": 4,
        "method": "tools/call",
        "params": {"name": "jenkins_list-jobs", "arguments": {}},
    },
)

tool_names = []
deploy_related_tool_names = []
tools_list_json = tools_list.get("json") or {}
jenkins_list_jobs_json = jenkins_list_jobs.get("json") or {}

if tools_list_json.get("result", {}).get("tools"):
    tool_names = [tool["name"] for tool in tools_list_json["result"]["tools"]]
    pattern = re.compile(r"deploy|jenkins|staging|build|pipeline|version", re.IGNORECASE)
    deploy_related_tool_names = [name for name in tool_names if pattern.search(name)]

(result_dir / "direct-deploy-tool-names.txt").write_text(
    "\n".join(deploy_related_tool_names) + ("\n" if deploy_related_tool_names else ""),
    encoding="utf-8",
)

jenkins_error = None
if jenkins_list_jobs_json:
    content = jenkins_list_jobs_json.get("result", {}).get("content", [])
    if content:
        jenkins_error = content[0].get("text")
else:
    jenkins_error = jenkins_list_jobs.get("error")

summary = {
    "initialize_ok": initialize["ok"],
    "tools_list_ok": tools_list["ok"],
    "tool_count": len(tool_names),
    "deploy_related_tool_names": deploy_related_tool_names,
    "mcp_health_ok": mcp_health["ok"],
    "jenkins_list_jobs_ok": jenkins_list_jobs["ok"]
    and not jenkins_list_jobs_json.get("result", {}).get("isError", False),
    "jenkins_list_jobs_error": jenkins_error,
}

write_json(result_dir / "direct-summary.json", summary)
PY

RESULT_DIR="$RESULT_DIR" python3 <<'PY'
import json
import os
import pathlib
import re
import sys

result_dir = pathlib.Path(os.environ["RESULT_DIR"])
runtime = json.loads((result_dir / "runtime-config.json").read_text())
no_mcp = json.loads((result_dir / "standalone-no-mcp.meta.json").read_text())
ghl_ai_only = json.loads((result_dir / "standalone-ghl-ai-only.meta.json").read_text())
direct = json.loads((result_dir / "direct-summary.json").read_text())
current_mcp_list = (result_dir / "current-codex-mcp-list.txt").read_text(
    encoding="utf-8", errors="replace"
)

checks = [
    (
        "Current codex mcp list exposes ghl-ai",
        bool(re.search(r"^ghl-ai\s", current_mcp_list, re.MULTILINE)),
    ),
    ("Standalone Codex control run returns READY", no_mcp["ready"]),
    ("Standalone Codex ghl-ai-only run returns READY", ghl_ai_only["ready"]),
    ("Direct ghl-ai initialize succeeds", direct["initialize_ok"]),
    ("Direct ghl-ai tools/list succeeds", direct["tools_list_ok"]),
    ("Direct ghl-ai mcp_health succeeds", direct["mcp_health_ok"]),
    ("Direct ghl-ai jenkins_list-jobs succeeds", direct["jenkins_list_jobs_ok"]),
]

summary_lines = [
    "AW SDLC ghl-ai standalone smoke",
    f"Result dir: {result_dir}",
    f"CLI: {runtime['cli']}",
    f"ghl-ai URL: {runtime['ghl_ai_url']}",
    f"Token source: {runtime['token_source']}",
    "",
    "Checks:",
]

for label, passed in checks:
    summary_lines.append(f"- {'PASS' if passed else 'FAIL'} {label}")

summary_lines.extend(
    [
        "",
        "Standalone control:",
        f"- status: {no_mcp['status']}",
        f"- exit_code: {no_mcp['exit_code']}",
        f"- ready: {no_mcp['ready']}",
        f"- openai_websocket_error: {no_mcp['openai_websocket_error']}",
        "",
        "Standalone ghl-ai-only:",
        f"- status: {ghl_ai_only['status']}",
        f"- exit_code: {ghl_ai_only['exit_code']}",
        f"- ready: {ghl_ai_only['ready']}",
        f"- rmcp_decode_error: {ghl_ai_only['rmcp_decode_error']}",
        f"- openai_websocket_error: {ghl_ai_only['openai_websocket_error']}",
        "",
        "Direct MCP:",
        f"- tool_count: {direct['tool_count']}",
        f"- deploy_related_tools: {', '.join(direct['deploy_related_tool_names']) or 'none'}",
        f"- jenkins_list_jobs_error: {direct['jenkins_list_jobs_error']}",
    ]
)

overall_ok = all(passed for _, passed in checks)
summary_lines.extend(["", f"Overall: {'PASS' if overall_ok else 'FAIL'}"])

(result_dir / "summary.txt").write_text(
    "\n".join(summary_lines) + "\n", encoding="utf-8"
)
print("\n".join(summary_lines))

sys.exit(0 if overall_ok else 1)
PY
