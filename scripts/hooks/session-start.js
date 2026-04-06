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
const { emitMemoryTelemetry } = require('../lib/memory-telemetry');
const MCP_BASE_URL = resolveMcpUrl();
const AW_HOME = path.join(os.homedir(), '.aw');
const REGISTRY_DIR = '.aw_registry';
const MEMORY_IDS_DIR = path.join(os.tmpdir(), 'aw-memory-feedback');

/**
 * Resolve full config from .sync-config.json in the AW registry directory.
 */
function resolveConfig() {
  try {
    const configPath = path.join(AW_HOME, REGISTRY_DIR, '.sync-config.json');
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Compute full ancestry chain for namespace paths.
 * E.g. ['commerce/payments'] → ['commerce/payments', 'commerce', 'platform']
 */
function computeAncestry(paths) {
  const result = new Set();
  for (const p of paths) {
    const segments = p.split('/');
    for (let i = segments.length; i >= 1; i--) {
      result.add(segments.slice(0, i).join('/'));
    }
  }
  result.add('platform');
  return [...result];
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
 * Build MCP request headers with namespace-scoped paths and auth.
 */
function buildMcpHeaders(cfg) {
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' };

  // Namespace-scoped: send ancestry paths from include[]
  const includes = cfg?.include || [];
  if (includes.length > 0) {
    const ancestryPaths = computeAncestry(includes);
    headers['X-Resolved-Paths'] = ancestryPaths.join(',');
  }

  // GitHub user for individual-layer portability
  if (cfg?.user) headers['X-Github-User'] = cfg.user;

  // Backwards compat: keep X-Namespace
  if (cfg?.namespace) headers['X-Namespace'] = cfg.namespace;

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
 * Phase 3 (v3): Collect rich session context for memory pack query.
 * Branch name and recent commits are the highest-signal indicators of intent.
 */
function collectSessionContext(cwd) {
  const { execSync } = require('child_process');
  const ctx = { repoSlug: getRepoSlug(), branch: '', recentWork: '', projectType: '' };

  try {
    ctx.branch = execSync('git branch --show-current', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 3000,
    }).trim();
  } catch { /* not a git repo */ }

  try {
    ctx.recentWork = execSync('git log --oneline -5 --no-merges', {
      cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 3000,
    }).trim();
  } catch { /* no commits */ }

  try {
    const { detectProjectType } = require('../lib/project-detect');
    const info = detectProjectType(cwd);
    ctx.projectType = info.primary || '';
  } catch { /* detect unavailable */ }

  return ctx;
}

/**
 * Phase 3 (v3): Build a rich memory pack query from session context.
 * Branch name is the strongest intent signal — "feat/payment-webhooks" → "payment webhooks".
 */
function buildMemoryQuery(ctx) {
  const parts = [];

  if (ctx.branch && ctx.branch !== 'main' && ctx.branch !== 'master') {
    const branchTopics = ctx.branch
      .replace(/^(feat|fix|chore|refactor|hotfix)\//i, '')
      .replace(/[-_/]/g, ' ');
    parts.push(branchTopics);
  }

  if (ctx.recentWork) {
    const commitTopics = ctx.recentWork
      .split('\n')
      .slice(0, 3)
      .map(line => line.replace(/^[a-f0-9]+ /, '').replace(/^(feat|fix|chore|refactor|docs)(\(.*?\))?:\s*/i, ''))
      .join(' ');
    parts.push(commitTopics);
  }

  if (ctx.repoSlug) parts.push(ctx.repoSlug);
  if (ctx.projectType && ctx.projectType !== 'unknown') parts.push(ctx.projectType);

  return parts.join(' ').substring(0, 500) || `Development session in ${ctx.repoSlug || 'unknown project'}`;
}

/**
 * Phase 3 (v3): Infer overlay/angle filters from branch name to narrow memory recall.
 */
function inferFilters(branch) {
  if (!branch) return {};
  const b = branch.toLowerCase();
  if (/payment|billing|stripe|subscription/.test(b)) return { overlays: ['service', 'product'] };
  if (/frontend|ui|component|design|css/.test(b)) return { overlays: ['surface', 'feature'] };
  if (/infra|deploy|k8s|terraform|helm|ci/.test(b)) return { overlays: ['service'], angles: ['operational'] };
  if (/auth|login|jwt|oauth|sso/.test(b)) return { overlays: ['service'], angles: ['technical'] };
  if (/perf|optim|cache|redis/.test(b)) return { angles: ['operational', 'technical'] };
  if (/test|e2e|playwright|cypress/.test(b)) return { angles: ['quality'] };
  return {};
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
  const cfg = resolveConfig();
  if (!cfg?.namespace && !cfg?.include?.length) {
    log('[SessionStart] No namespace config and no local cache, skipping memory injection');
    return;
  }

  const headers = buildMcpHeaders(cfg);

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

  // Phase 3 (v3): Collect rich context and build a targeted query
  const ctx = collectSessionContext(process.cwd());
  const query = buildMemoryQuery(ctx);
  const filters = inferFilters(ctx.branch);
  log(`[SessionStart] Memory query: "${query.substring(0, 120)}..." (branch: ${ctx.branch || 'none'})`);

  try {
    let packContent = '';
    let servedIds = [];
    let memoriesCount = 0;

    const packParams = { query, token_budget: 3500 };
    if (filters.overlays) packParams.overlays = filters.overlays;
    if (filters.angles) packParams.angles = filters.angles;

    const packResult = await callMcpTool('memory_pack', packParams, headers);

    const packError = packResult?.text?.includes('Unknown tool') || packResult?.error;

    if (packResult && !packError) {
      packContent = packResult.text || packResult.pack || packResult.content || '';
      servedIds = packResult.memory_ids || packResult.served_ids || packResult.ids || [];
      memoriesCount = packResult.memories_count || packResult.count || servedIds.length || 0;
    } else {
      log('[SessionStart] memory_pack not available, trying memory_search');
      const searchResult = await callMcpTool('memory_search', {
        query: query,
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

    emitMemoryTelemetry('hook.session_start.pack_served', {
      memories_served: memoriesCount,
      served_ids_count: servedIds.length,
      source: localContent ? 'local_cache' : 'mcp',
    }, {
      source: 'hook:session-start',
      namespace: cfg?.namespace,
    });
  } catch (err) {
    log(`[SessionStart] Memory pack failed: ${err.message}`);
    emitMemoryTelemetry('hook.session_start.pack_failed', {
      error: err.message,
    }, { source: 'hook:session-start' });
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

// Exported for testing — guard main() to only run when script is entry point
if (typeof module !== 'undefined' && module.exports && require.main !== module) {
  module.exports = {
    buildMemoryQuery,
    inferFilters,
    collectSessionContext,
    saveServedMemoryIds,
    getRepoSlug,
  };
} else {
  main().catch(err => {
    console.error('[SessionStart] Error:', err.message);
    process.exit(0); // Don't block on errors
  });
}
