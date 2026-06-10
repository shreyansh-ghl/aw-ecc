# AW Memory Real-Session Verification

## Mode

`/aw:test`

## Scope

Runtime proof for AW Memory hooks across the real MCP endpoint and available local harness CLIs.

## Checks Run

- `node tests/hooks/aw-memory-client.test.js` — passed, 8/8.
- `node tests/hooks/aw-memory-sync.test.js` — passed, 5/5.
- `node tests/hooks/aw-memory-recall.test.js` — passed, 4/4.
- `node tests/hooks/aw-memory-live-e2e.test.js` — passed, 2/2.
- `node tests/hooks/aw-memory-config.test.js` — passed, 4/4.
- `node tests/hooks/aw-memory-redaction.test.js` — passed, 5/5.
- `node tests/hooks/aw-memory-cursor.test.js` — passed, 3/3.
- `node tests/hooks/harness-hook-output-contracts.test.js` — passed, 12/12.
- `node tests/hooks/shared-hook-entrypoints.test.js` — passed, 6/6.
- Live MCP `tools/list` probe against configured `ghl-ai` endpoint — HTTP 200.
- Live MCP `memory_search` tool call against configured `ghl-ai` endpoint — failed with `unknown_tool`.
- Real Claude CLI print session with branch hook settings — UserPromptSubmit hook executed, model request failed with Claude auth 401 before Stop.
- Real Codex CLI `exec --json` session with generated Codex hook home — model answered, but no hook output/effects appeared.
- Cursor CLI launch check — unavailable, `cursor` command not installed.

## Evidence

Local subprocess E2E proves the branch hooks call MCP over HTTP when the tools exist:

- `session-start-rules-context.sh` sent `tools/call` with `params.name=memory_search`.
- `session-end.js` sent `tools/call` with `params.name=memory_store`.
- Requests included bearer auth, namespace, and `Accept: application/json, text/event-stream`.
- Prompt and stored content were redacted before leaving the hook.
- Session-end wrote sync receipts only after a successful store response.

The configured live endpoint is reachable but does not yet expose AW Memory tools:

- Endpoint host: `services.leadconnectorhq.com`
- Endpoint path: `/agentic-workspace/mcp`
- `tools/list` status: `200`
- Tool count: `124`
- `memory_search`: absent
- `memory_store`: absent
- Actual `memory_search` call result: `unknown_tool` with message `Error: Unknown or disabled tool: memory_search`

Real Claude lifecycle evidence:

- `claude -p --verbose --output-format=stream-json --include-hook-events ...` emitted `hook_started` and `hook_response` for `UserPromptSubmit`.
- Hook output contained the AW router reminder from the branch hook.
- Hook output did not contain `AW Memory Recall` because the live MCP endpoint returned no memory tool.
- Claude model call failed with API 401, so `Stop`/sync did not execute in that real Claude session.

Real Codex lifecycle evidence:

- Codex doctor reports `hooks` effective state is enabled through the `codex_hooks -> hooks` alias.
- `codex features list` reports `hooks stable true`.
- `codex exec --json` returned `codex-real-session-ok` with status 0.
- No AW router reminder, AW Memory Recall block, sync receipt, or hook side effect appeared in the non-interactive `exec` run, even with generated `hooks.json`, generated hook wrappers, and hook-trust bypass.

## Failures

- The original hook client was not compatible with the live MCP endpoint because it sent only `Accept: application/json`; the endpoint requires clients to accept both `application/json` and `text/event-stream`.
- The original session-end payload sent `{ key, text, metadata }`, but the GHL MCP `memory_store` handler reads `content`, plus optional `type`, `source`, `tags`, `scope_level`, `repo_slug`, and related fields.
- The currently deployed MCP catalog does not expose `memory_search` or `memory_store`, so real recall/store cannot succeed against production/staging until the server PR is deployed.
- Claude auth on this machine is invalid for the real CLI print session, blocking full Claude Stop/sync proof.
- Codex non-interactive `exec` did not show hook execution despite hooks being enabled; interactive Codex hook proof remains unavailable in this non-interactive test path.
- Cursor native session proof is unavailable because the `cursor` CLI is not installed.

## Unavailable

- End-to-end real `memory_store` persistence into GHL Memory, because the deployed MCP endpoint does not expose `memory_store`.
- End-to-end real recall from a stored live memory, because the deployed MCP endpoint does not expose either memory tool.
- Full Claude response-end sync proof, because the real Claude model call fails with authentication 401.
- Cursor real-session proof on this machine, because the Cursor CLI is absent.

## Next

Deploy the MCP server change that exposes `memory_search` and `memory_store`, then rerun the live MCP probe and a real Claude/Codex/Cursor harness run. After deployment, the expected live proof is:

- `tools/list` includes `memory_search` and `memory_store`.
- A real prompt hook calls `memory_search` and receives results.
- A real session-end hook calls `memory_store` with `content`, `type`, `source`, `tags`, and repo scope.
- A second real prompt hook recalls the stored learning.
