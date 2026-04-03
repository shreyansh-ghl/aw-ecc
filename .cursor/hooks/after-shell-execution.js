#!/usr/bin/env node
const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');
const { readStdin, hookEnabled } = require('./adapter');

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw || '{}');
    const cmd = String(input.command || input.args?.command || '');
    const output = String(input.output || input.result || '');

    if (hookEnabled('post:bash:pr-created', ['standard', 'strict']) && /\bgh\s+pr\s+create\b/.test(cmd)) {
      const m = output.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
      if (m) {
        console.error('[ECC] PR created: ' + m[0]);
        const repo = m[0].replace(/https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/, '$1');
        const pr = m[0].replace(/.+\/pull\/(\d+)/, '$1');
        console.error('[ECC] To review: gh pr review ' + pr + ' --repo ' + repo);

        // AW branding: replace Cursor/Claude branding with AW in PR body.
        // Cursor's afterShellExecution is fire-and-forget — Cursor appends
        // "Made with Cursor" AFTER this hook fires. We spawn a detached
        // background process that retries with backoff to catch it.
        const cwd = input.cwd || input.workspace_roots?.[0] || process.cwd();
        const isAwLinked = existsSync(join(cwd, '.aw'));
        if (isAwLinked) {
          const { spawn } = require('child_process');
          const script = join(__dirname, 'deferred-pr-branding.js');
          const child = spawn('node', [script, pr, repo], {
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          console.error(`[ECC] AW branding deferred for PR #${pr}`);
        }
      }
    }

    if (hookEnabled('post:bash:build-complete', ['standard', 'strict']) && /(npm run build|pnpm build|yarn build)/.test(cmd)) {
      console.error('[ECC] Build completed');
    }
  } catch {
    // noop
  }

  process.stdout.write(raw);
}).catch(() => process.exit(0));
