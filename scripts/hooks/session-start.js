#!/usr/bin/env node
/**
 * SessionStart Hook - Load previous context and inject team memory on new session
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs when a new Claude session starts. Loads the most recent session
 * summary into Claude's context via stdout, reports available
 * sessions and learned skills, and injects a memory pack from the
 * memory MCP backend.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  getSessionsDir,
  getLearnedSkillsDir,
  findFiles,
  ensureDir,
  readFile,
  stripAnsi,
  log,
  output
} = require('../lib/utils');
const { getPackageManager, getSelectionPrompt } = require('../lib/package-manager');
const { listAliases } = require('../lib/session-aliases');
const { detectProjectType } = require('../lib/project-detect');

const { resolveMcpUrl } = require('../lib/mcp-url');
const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MEMORY_IDS_DIR = path.join(os.tmpdir(), 'aw-memory-feedback');

/**
 * Resolve namespace from .sync-config.json in the AW registry directory.
 * Returns the namespace string or null if not configured.
 */
function resolveNamespace() {
  try {
    const configPath = path.join(AW_HOME, REGISTRY_DIR, '.sync-config.json');
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.namespace || null;
  } catch {
    return null;
  }
}

/**
 * Resolve GitHub token for auth — from env or `gh auth token`.
 */
function resolveGhToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const { execSync } = require('child_process');
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    if (token && (token.startsWith('ghp_') || token.startsWith('gho_') || token.startsWith('github_pat_'))) {
      return token;
    }
  } catch { /* gh not available */ }
  return null;
}

/**
 * Build MCP request headers with namespace and auth.
 */
function buildMcpHeaders(namespace) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };
  if (namespace) headers['X-Namespace'] = namespace;
  const token = resolveGhToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Call an MCP tool via JSON-RPC 2.0. Returns parsed result or null on failure.
 */
async function callMcpTool(toolName, params, headers) {
  const response = await fetch(MCP_BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: params },
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;

  const contentType = response.headers.get('content-type') || '';

  // Handle SSE responses
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.result) return extractToolResult(event.result);
        } catch { /* skip non-JSON lines */ }
      }
    }
    return null;
  }

  const json = await response.json();
  if (json.error) return null;
  return extractToolResult(json.result);
}

/**
 * Extract content from MCP tools/call result envelope.
 */
function extractToolResult(result) {
  if (!result) return null;
  const content = result.content;
  if (Array.isArray(content) && content.length > 0 && content[0].text) {
    try { return JSON.parse(content[0].text); } catch { return { text: content[0].text }; }
  }
  return result;
}

/**
 * Save served memory IDs to a temp file for the feedback loop at session end.
 */
function saveServedMemoryIds(memoryIds) {
  try {
    ensureDir(MEMORY_IDS_DIR);
    const sessionId = process.env.CLAUDE_SESSION_ID || 'default';
    const filePath = path.join(MEMORY_IDS_DIR, `${sessionId}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ ids: memoryIds, timestamp: Date.now() }), 'utf8');
    log(`[SessionStart] Saved ${memoryIds.length} served memory ID(s) for feedback loop`);
  } catch (err) {
    log(`[SessionStart] Failed to save memory IDs: ${err.message}`);
  }
}

/**
 * Derive a repo slug from git or cwd for the memory pack query.
 */
function getRepoSlug() {
  try {
    const { execSync } = require('child_process');
    const topLevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    }).trim();
    return path.basename(topLevel);
  } catch {
    return path.basename(process.cwd()) || 'unknown';
  }
}

/**
 * Inject team memory into session context.
 *
 * Strategy: Read from local filesystem cache (L0) first — zero latency,
 * no network dependency. Falls back to MCP memory_pack / memory_search
 * if local cache is missing or stale.
 *
 * The local cache is written by `aw memory sync` and lives at
 * ~/.aw_registry/memory/ with .md files grouped by overlay.
 */
async function injectMemoryPack() {
  // 1. Try L0: local filesystem cache (fastest, most reliable)
  const memoryDir = path.join(os.homedir(), '.aw_registry', 'memory');
  const localContent = readLocalMemoryFiles(memoryDir);

  if (localContent) {
    output(`<team-memory source="local-cache" dir="${memoryDir}">\n${localContent}\n</team-memory>`);
    log(`[SessionStart] Injected team memory from local cache`);
    return;
  }

  // 2. Try L1: MCP memory_pack / memory_search (needs network)
  const namespace = resolveNamespace();
  if (!namespace) {
    log('[SessionStart] No namespace and no local cache, skipping memory injection');
    return;
  }

  const headers = buildMcpHeaders(namespace);

  // Quick health check
  try {
    const healthResponse = await fetch(MCP_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'tools/list', params: {} }),
      signal: AbortSignal.timeout(3000),
    });
    if (!healthResponse.ok) {
      log('[SessionStart] Memory MCP not reachable and no local cache');
      return;
    }
  } catch {
    log('[SessionStart] Memory MCP not reachable and no local cache');
    return;
  }

  const repoSlug = getRepoSlug();
  log(`[SessionStart] No local cache, requesting memory pack from MCP for ${repoSlug}...`);

  try {
    let packContent = '';
    let servedIds = [];
    let memoriesCount = 0;

    // Try memory_pack first, fall back to memory_search
    const packResult = await callMcpTool('memory_pack', {
      query: `Starting session in ${repoSlug}`,
      token_budget: 3500,
    }, headers);

    const packError = packResult?.text?.includes('Unknown tool') || packResult?.error;

    if (packResult && !packError) {
      packContent = packResult.text || packResult.pack || packResult.content || '';
      servedIds = packResult.memory_ids || packResult.served_ids || packResult.ids || [];
      memoriesCount = packResult.memories_count || packResult.count || servedIds.length || 0;
    } else {
      log('[SessionStart] memory_pack not available, trying memory_search');
      const searchResult = await callMcpTool('memory_search', {
        query: `${repoSlug} development patterns decisions`,
        limit: 20,
      }, headers);

      const memories = Array.isArray(searchResult) ? searchResult
        : (searchResult?.memories || searchResult?.results || []);

      if (memories.length > 0) {
        servedIds = memories.map(m => m.id).filter(Boolean);
        memoriesCount = memories.length;
        packContent = memories.map(m => {
          const tags = [m.layer, ...(m.overlay || []), ...(m.angle || [])].filter(Boolean);
          const prefix = tags.length > 0 ? `[${tags.join(',')}] ` : '';
          return `- ${prefix}${m.content || m.text || ''}`;
        }).join('\n');
      }
    }

    if (!packContent && memoriesCount === 0) {
      log('[SessionStart] Memory pack empty — no relevant memories found');
      return;
    }

    if (servedIds.length > 0) saveServedMemoryIds(servedIds);

    output(`<team-memory source="memory-pack" memories="${memoriesCount}">\n${packContent}\n</team-memory>`);
    log(`[SessionStart] Injected memory pack: ${memoriesCount} memories`);
  } catch (err) {
    log(`[SessionStart] Memory pack failed: ${err.message}`);
  }
}

/**
 * Read all .md files from the local memory cache directory.
 * Returns combined content string or null if no files found.
 */
function readLocalMemoryFiles(memoryDir) {
  try {
    if (!fs.existsSync(memoryDir)) return null;
    const files = fs.readdirSync(memoryDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) return null;

    const parts = [];
    for (const file of files) {
      const content = fs.readFileSync(path.join(memoryDir, file), 'utf8').trim();
      if (content) parts.push(content);
    }
    return parts.length > 0 ? parts.join('\n\n') : null;
  } catch (err) {
    log(`[SessionStart] Failed to read local memory files: ${err.message}`);
    return null;
  }
}

async function main() {
  const sessionsDir = getSessionsDir();
  const learnedDir = getLearnedSkillsDir();

  // Ensure directories exist
  ensureDir(sessionsDir);
  ensureDir(learnedDir);

  // Check for recent session files (last 7 days)
  const recentSessions = findFiles(sessionsDir, '*-session.tmp', { maxAge: 7 });

  if (recentSessions.length > 0) {
    const latest = recentSessions[0];
    log(`[SessionStart] Found ${recentSessions.length} recent session(s)`);
    log(`[SessionStart] Latest: ${latest.path}`);

    // Read and inject the latest session content into Claude's context
    const content = stripAnsi(readFile(latest.path));
    if (content && !content.includes('[Session context goes here]')) {
      // Only inject if the session has actual content (not the blank template)
      output(`Previous session summary:\n${content}`);
    }
  }

  // Check for learned skills
  const learnedSkills = findFiles(learnedDir, '*.md');

  if (learnedSkills.length > 0) {
    log(`[SessionStart] ${learnedSkills.length} learned skill(s) available in ${learnedDir}`);
  }

  // Check for available session aliases
  const aliases = listAliases({ limit: 5 });

  if (aliases.length > 0) {
    const aliasNames = aliases.map(a => a.name).join(', ');
    log(`[SessionStart] ${aliases.length} session alias(es) available: ${aliasNames}`);
    log(`[SessionStart] Use /sessions load <alias> to continue a previous session`);
  }

  // Detect and report package manager
  const pm = getPackageManager();
  log(`[SessionStart] Package manager: ${pm.name} (${pm.source})`);

  // If no explicit package manager config was found, show selection prompt
  if (pm.source === 'default') {
    log('[SessionStart] No package manager preference found.');
    log(getSelectionPrompt());
  }

  // Detect project type and frameworks (#293)
  const projectInfo = detectProjectType();
  if (projectInfo.languages.length > 0 || projectInfo.frameworks.length > 0) {
    const parts = [];
    if (projectInfo.languages.length > 0) {
      parts.push(`languages: ${projectInfo.languages.join(', ')}`);
    }
    if (projectInfo.frameworks.length > 0) {
      parts.push(`frameworks: ${projectInfo.frameworks.join(', ')}`);
    }
    log(`[SessionStart] Project detected — ${parts.join('; ')}`);
    output(`Project type: ${JSON.stringify(projectInfo)}`);
  } else {
    log('[SessionStart] No specific project type detected');
  }

  // Inject memory pack from MCP backend (non-blocking — failures are logged, not thrown)
  await injectMemoryPack();

  process.exit(0);
}

main().catch(err => {
  console.error('[SessionStart] Error:', err.message);
  process.exit(0); // Don't block on errors
});
