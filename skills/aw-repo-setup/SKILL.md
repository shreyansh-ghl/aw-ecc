---
name: aw-repo-setup
description: Screenshot-based GHL repo identification and full local setup — clone, install, Module Federation wiring, and dev server startup.
trigger: User invokes /aw:feature Phase 1, shares a screenshot of a GHL page, or requests local dev environment setup.
---

# Local Setup from Screenshot

You are an autonomous setup agent for the GoHighLevel (GHL) platform. A product or design team member will share a screenshot of a GHL app page. Your job is to identify which project it belongs to, then **execute every setup step yourself** — cloning repos, installing tools, configuring Module Federation, and starting dev servers.

**You DO things. You do NOT just list commands.**

Run every command via terminal. Install missing tools automatically. Debug failures yourself. Only ask the user when you genuinely cannot proceed (e.g., browser-based Google OAuth, missing SSH keys, tokens you don't have).

---

## Step 1: Get the Screenshot

If the user has already shared a screenshot, proceed to Step 2.

Otherwise, ask:

> Share a screenshot of the GHL page you want to work on. If you can include the browser URL bar, that helps me identify the exact page faster.

If the first screenshot does not show a visible URL bar, immediately ask:

> Please share an updated **full-screen screenshot** with the browser URL bar visible, or paste the page URL here.

Wait for the screenshot before continuing.

---

## Step 2: Identify the Project and Micro-App

Analyze the screenshot using these signals in order of reliability:

If the screenshot does **not** include a visible URL bar/path, ask the user before proceeding:

> I can continue, but identification is much more reliable with the URL.
> Please share either:
> 1) an updated **full-screen screenshot** with the browser URL bar visible, or
> 2) the current page URL as text.
>
> Once I have that, I'll map it to the exact project/app and continue setup.

### Signal A — URL Bar (highest confidence)

| URL Path Pattern | Project | Micro-App Folder |
|-----------------|---------|-----------------|
| `/v2/location/{id}/contacts` | ghl-crm-frontend | `apps/contacts` or `apps/contacts-highrise` |
| `/v2/location/{id}/conversations` | ghl-crm-frontend | `apps/conversations` |
| `/v2/location/{id}/opportunities` | ghl-crm-frontend | `apps/opportunities` |
| `/v2/location/{id}/calendars` | ghl-crm-frontend | `apps/calendar` |
| `/v2/location/{id}/payments` | ghl-crm-frontend | `apps/payments` |
| `/v2/location/{id}/funnels` | ghl-crm-frontend | `apps/funnels` |
| `/v2/location/{id}/email` | ghl-crm-frontend | `apps/email-builder` |
| `/v2/location/{id}/automation` | ghl-crm-frontend | `apps/automation` |
| `/v2/location/{id}/workflows` | ghl-crm-frontend | `apps/workflows` |
| `/v2/location/{id}/reputation` | ghl-crm-frontend | `apps/reputation` |
| `/v2/location/{id}/social-planner` | ghl-crm-frontend | `apps/social-planner` |
| `/v2/location/{id}/memberships` | ghl-crm-frontend | `apps/memberships` |
| `/v2/location/{id}/invoices` | ghl-crm-frontend | `apps/invoices` |
| `/v2/location/{id}/proposals` | ghl-crm-frontend | `apps/proposals` |
| `/v2/location/{id}/certificates` | ghl-crm-frontend | `apps/certificates` |
| `/v2/location/{id}/ai-agents` | ghl-crm-frontend | `apps/ai-employee-v2` or `apps/voice-ai` |
| `/v2/location/{id}/dashboard` | spm-ts | Shell app (no micro-app) |
| `/v2/settings/...` or agency routes | spm-ts | Shell app |

**Routing note**: All `/v2/location/{id}/...` routes are served by spm-ts (the shell), which loads micro-frontends from ghl-crm-frontend via Module Federation. To change page **content**, you need ghl-crm-frontend. To change the **sidebar, top nav, or settings shell**, you need spm-ts.

### Signal B — Navigation Sidebar (medium confidence)

| Sidebar Item | Micro-App |
|-------------|-----------|
| Dashboard | spm-ts shell |
| Conversations | conversations |
| Calendars | calendar |
| Contacts | contacts / contacts-highrise |
| Opportunities / Pipelines | opportunities |
| Payments | payments |
| Marketing / Email | email-builder |
| Automation / Workflows | automation or workflows |
| Sites / Funnels | funnels |
| Memberships | memberships |
| Reputation | reputation |
| Social Planner | social-planner |
| Certificates | certificates |
| AI Agents | ai-employee-v2 or voice-ai |

### Signal C — Visual Patterns (lower confidence)

| What You See | Micro-App |
|-------------|-----------|
| Chat thread with message bubbles | conversations |
| Contact list / CRM table | contacts |
| Kanban board with deal cards | opportunities |
| Calendar grid / booking widget | calendar |
| Email drag-and-drop builder | email-builder |
| Funnel / website page builder | funnels |
| Workflow diagram with nodes | automation or workflows |
| Star ratings / review management | reputation |
| Social media post scheduler | social-planner |
| Course / membership editor | memberships |
| Invoice / proposal document | invoices or proposals |
| Badge / certificate designer | certificates |
| Voice AI agent config / call logs | voice-ai or ai-employee-v2 |

### Signal D — Component Library

If you see Storybook, a docs site, or isolated components outside a full app, the project is **ghl-ui**.

### Present Your Finding

Tell the user what you identified:

> I identified this as the **{micro-app}** page, which lives in `ghl-crm-frontend/apps/{app-folder}/`.
> Confidence: **{High/Medium/Low}** — {reason, e.g., "I can see the URL ends with /contacts"}.
> Does this look right?

Wait for confirmation. If the user corrects you, update and continue.

If confidence is **Low**, do this before Step 3:

> I'm not fully confident from the screenshot alone. I can proceed in one of two ways:
> 1) You confirm the page/app, then I clone only the minimum required repos.
> 2) I clone a common superset (`spm-ts`, `ghl-crm-frontend`, `ai-frontend`) to reduce mis-detection risk.
>
> Which option do you want?

---

## Step 3: Determine Repos Needed

| Scenario | Repos to Clone |
|----------|---------------|
| Micro-app page (most common) | **spm-ts** + **ghl-crm-frontend** + **ai-frontend** |
| Shell only (sidebar, nav, settings) | **spm-ts** only |
| UI components (Storybook) | **ghl-ui** only |
| Backend APIs | **ai-backend** only |

Tell the user briefly what you're about to set up and why (e.g., "You need both repos — spm-ts is the shell that hosts the page, ghl-crm-frontend has the actual page code.").

Then proceed to Step 4 immediately — no need to wait.

---

## Step 4: Install Prerequisites

**Check each tool and install if missing. Don't ask — just do it.**

Run these checks in sequence:

> OS note: Commands below are macOS-first. For Windows/Linux, use equivalent package managers and commands (e.g., `winget`/Chocolatey on Windows, `apt`/`dnf` on Linux), but keep the same step order and outcomes.

### 4a. Homebrew
```bash
which brew
```
If missing, install it:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 4b. Volta (Node version manager)
```bash
volta --version
```
If missing:
```bash
curl https://get.volta.sh | bash
```
Then reload the shell: `source ~/.zshrc` or `source ~/.bashrc`

### 4c. Node.js
```bash
node --version
```
Volta auto-manages Node versions per project. If no Node at all: `volta install node@20`

### 4d. Yarn
```bash
yarn --version
```
If missing: `volta install yarn`

### 4e. Google Cloud CLI
```bash
gcloud --version
```
If missing:
```bash
brew install --cask google-cloud-sdk
```

### 4f. Google Cloud Authentication
```bash
gcloud auth list
```
If no active account, **ask the user**:

> I need you to authenticate with Google Cloud. Please run this in your terminal and complete the browser login:
> ```
> gcloud auth login
> gcloud config set project highlevel-staging
> ```
> Let me know when you're done.

This is a browser-based OAuth flow you cannot do for them. Wait for confirmation.

### 4g. macOS Native Image Libraries (spm-ts only)
```bash
brew install libpng pkg-config libimagequant autoconf automake libtool gifsicle optipng jpeg-turbo
```
Already-installed packages are skipped automatically.

### 4h. GitHub CLI (primary auth for cloning)

```bash
gh --version
```
If missing, install: `brew install gh`

**Check auth:**
```bash
gh auth status
```

If not logged in, **ask the user**:

> I need you to authenticate with GitHub. Please run this in your terminal and complete the browser login:
> ```
> gh auth login
> ```
> (Choose: GitHub.com → HTTPS → Yes to authenticate Git → Login with a web browser.)
> Let me know when you're done.

This is a browser-based OAuth flow you cannot do for them. Once authenticated, use `gh repo clone` for all clones — no SSH keys or Personal Access Tokens needed.

**Fallback** (only if `gh` can't be used): Check SSH with `ssh -T git@github.com`, or use HTTPS with `git clone` (user needs PAT for private repos).

Report a summary when done:

> Prerequisites ready. Volta, Node 20, Yarn, gcloud CLI, and macOS libs are all installed. Moving on to cloning repos.

---

## Step 5: Clone, Configure, and Install

### 5a. Choose a workspace directory

Ask the user where they want the repos:

> Where should I clone the repos? Default is `~/Desktop/Workspace`. Press enter to accept or tell me a different path.

Use their answer or the default.

### 5b. Clone repos

For each needed repo, **skip if it already exists** in `{workspace_dir}` (e.g. `ls {workspace_dir}/spm-ts`). If the directory exists and is a git repo, move on — don't re-clone.

**Clone flow (run per repo in the list from Step 3):**

1. Build a repo list first (examples):
   - Micro-app: `spm-ts`, `ghl-crm-frontend`, `ai-frontend`
   - Shell-only: `spm-ts`
   - UI components: `ghl-ui`
   - Backend APIs: `ai-backend`
2. For each `{repo}`:
   - **Skip if exists**:
     ```bash
     [ -d "{workspace_dir}/{repo}/.git" ] && echo "skip {repo}" && continue
     ```
   - **Prefer gh**:
     ```bash
     cd {workspace_dir}
     gh repo clone GoHighLevel/{repo}
     ```
   - **If gh fails**:
     - Fallback A (SSH): `git clone git@github.com:GoHighLevel/{repo}.git`
     - Fallback B (HTTPS): `git clone https://github.com/GoHighLevel/{repo}.git` (user needs PAT for private repos)
3. If clone still fails: user likely lacks GoHighLevel org/repo access. Ask them to verify access at github.com/orgs/GoHighLevel.

**Post-clone sanity check (run once):**

```bash
gh auth status
```

For each cloned repo:

```bash
cd {workspace_dir}/{repo}
git remote -v
[ -d .git ] && echo "{repo} clone OK"
```

### 5c. Authenticate with GCP Artifact Registry

```bash
cd {workspace_dir}/spm-ts
yarn ar-login
```

If `yarn ar-login` is not recognized, run:
```bash
npx google-artifactregistry-auth
```

### 5d. Install dependencies

**spm-ts:**
```bash
cd {workspace_dir}/spm-ts
yarn install
```

**ghl-crm-frontend:**
```bash
cd {workspace_dir}/ghl-crm-frontend
yarn install
```

If `yarn install` fails:
- **401 Unauthorized** → re-run `yarn ar-login` then retry
- **node-gyp / native module error** → verify Step 4g brew packages installed, retry
- **ENOMEM or timeout** → `yarn cache clean` then retry

### 5e. ai-backend (only if needed)

```bash
cd {workspace_dir}/ai-backend
cp .npmrc.template .npmrc
```

The `.npmrc` needs a BullMQ Pro token. Check if it's already present. If there is a placeholder like `PLATFORM_RATELIMIT_BULLMQ_PRO_NPM_PACKAGE_TOKEN`, ask the user to provide the token securely (never hardcode or guess token values).

```bash
yarn ar-login
yarn install
```

### 5f. ghl-ui (only if needed)

```bash
cd {workspace_dir}/ghl-ui
yarn sync
yarn build
```

---

## Step 6: Wire Module Federation (Micro-App Scenario Only)

**This is the critical step most people miss.** By default, spm-ts loads micro-apps from the staging CDN — not localhost. You must connect the shell to your local micro-app dev server.

### 6a. Find the micro-app's dev port

Read app config files to find the dev port (webpack, rsbuild, or vite):

```bash
rg -n "devServer|port|getPublicPath|server\\s*:\\s*\\{|moduleFederation|remoteEntry" "{workspace_dir}/ghl-crm-frontend/apps/{app-name}" --glob "webpack.config.js" --glob "webpack.config.ts" --glob "rsbuild.config.ts" --glob "vite.config.ts"
```

Look for one of:
- `devServer.port` (webpack)
- `server.port` (vite/rsbuild)
- `getPublicPath()` / `remoteEntry` URL port

Common ports:
- contacts-highrise: 3010
- labs / voiceAiApp: 3002
- Other apps: check whichever config file exists (`webpack.config.*`, `rsbuild.config.ts`, `vite.config.ts`)

### 6b. Find and uncomment the localhost override in spm-ts

The overrides live in one of two files:

**Check `async-remoteApps.ts` first:**
```bash
rg -n "{app-config-key}" "{workspace_dir}/spm-ts/src/config/async-remoteApps.ts"
```

**Then check `runtimeRemoteApps.ts`:**
```bash
rg -n "{app-config-key}" "{workspace_dir}/spm-ts/src/config/runtimeRemoteApps.ts"
```

Look for a commented-out line like:
```typescript
// config.contactsApp = 'http://localhost:3010/remoteEntry.js'
```

### 6c. Uncomment the localhost line

Edit the file to uncomment the matching localhost override. Make sure the port matches what you found in 6a.

For example, change:
```typescript
// config.contactsApp = 'http://localhost:3010/remoteEntry.js'
```
to:
```typescript
config.contactsApp = 'http://localhost:3010/remoteEntry.js'
```

If no commented override exists for this app, add one inside the `if (process.env.NODE_ENV === 'development')` block:
```typescript
config.{appConfigKey} = 'http://localhost:{port}/remoteEntry.js'
```

To find the correct `appConfigKey`, check how other apps are named in the same file.

Tell the user:

> I've connected spm-ts to load {app-name} from your local dev server at localhost:{port} instead of the staging CDN. Your local changes will now show up in the shell.

### 6d. Complex MFA Overrides (Performance AI / Voice AI only)
If the identified page is **Performance AI**, **Voice AI**, or **Evals**, you must find and uncomment **two** localhost overrides in `spm-ts` config files:
1. The legacy MFA: port `3002` (usually `config.voiceAiApp`)
2. The new MFA: port `3014` (usually `config.performanceAiApp` or similar)

Both must point to localhost for the full page to render correctly.

---

## Step 7: Start Dev Servers

### Complex MFA Scenario (Performance AI / Voice AI)
If the identified page is Performance AI, Voice AI, or Evals, you must start a multi-frontend stack.

**First, ask the user about the backend:**
> "I am setting up the multi-frontend stack for Performance AI. Do you also need the local `ai-backend` running on port 5120, or should I let the UI connect to the staging backend?"

**Then, kill stale ports safely:**
`for p in 8080 3002 3014 5120; do lsof -ti tcp:$p | xargs kill -9 2>/dev/null; done`

**Finally, start these terminals simultaneously:**

**Terminal 1 — spm-ts (Shell):**
```bash
cd {workspace_dir}/spm-ts
yarn dev
```

**Terminal 2 — ai-frontend (New MFA):**
```bash
cd {workspace_dir}/ai-frontend/apps/performance-ai
npm run dev
```

**Terminal 3 — ghl-crm-frontend (Legacy MFA):**
```bash
cd {workspace_dir}/ghl-crm-frontend/apps/voice-ai
npm run dev
```

**Terminal 4 — ai-backend *(ONLY if user requested local backend)*:**
```bash
cd {workspace_dir}/ai-backend
npm run start:dev -- performance-ai
```

*(Note: If the user explicitly asks to test the "MFA" or "AI One" branch, append `git checkout ai-one-ms-mfa && ` before the start commands).*

### Micro-app scenario (most common)

You need **two terminals running simultaneously**.

**Terminal 1 — Start the micro-app first:**
```bash
cd {workspace_dir}/ghl-crm-frontend/apps/{app-name}
yarn dev
```
Wait for it to compile. You should see "Compiled successfully" or "webpack compiled" and it will show the local URL (e.g., `http://localhost:3010`).

**Terminal 2 — Start the shell:**
```bash
cd {workspace_dir}/spm-ts
yarn dev
```
Wait for "ready in" or "Compiled successfully". The shell runs on `http://localhost:8080`.

### Shell-only scenario
```bash
cd {workspace_dir}/spm-ts
yarn dev
```
Open `http://localhost:8080`.

### ghl-ui scenario
```bash
cd {workspace_dir}/ghl-ui/packages/highrise
yarn storybook
```
Open `http://localhost:6006`.

### ai-backend scenario
```bash
cd {workspace_dir}/ai-backend
yarn start:dev {service-name}
```

---

## Step 8: Verify

Once both servers are running:

1. Open `http://localhost:8080` in the browser
2. Navigate to the same page from the screenshot (use the URL path identified in Step 2)
3. Confirm the page loads and matches the screenshot layout
4. Make a small test change in the micro-app code (e.g., change a heading text) and verify it hot-reloads in the browser

Tell the user:

> Your local setup is complete. Here's what's running:
>
> - **Shell**: http://localhost:8080 (spm-ts)
> - **{App name}**: http://localhost:{port} (ghl-crm-frontend/apps/{app-name})
> - **Your page**: http://localhost:8080/v2/location/{id}/{route}
>
> Make changes in `ghl-crm-frontend/apps/{app-name}/src/` and they'll hot-reload in the browser.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `yarn install` → 401 Unauthorized | `gcloud auth login` → `yarn ar-login` → retry |
| `yarn install` → node-gyp build error | `brew install libpng pkg-config libimagequant autoconf automake libtool gifsicle optipng jpeg-turbo` → retry |
| Port 8080 already in use | `lsof -i :8080` → kill the process, or `yarn dev --port 8081` |
| Blank page at localhost:8080 | Check both terminals are running. Check browser console for errors. Hard refresh with Cmd+Shift+R. |
| Micro-app changes not showing | Verify Step 6 — the localhost override must be uncommented in spm-ts config. Restart spm-ts after editing config. |
| `gh repo clone` or `git clone` fails | Prefer `gh auth login` then retry `gh repo clone`. Fallback: SSH (`git clone git@...`) or HTTPS with PAT. Verify org access at github.com/orgs/GoHighLevel. |
| Repo already exists / "already exists and is not an empty directory" | Skip clone. Use existing `{workspace_dir}/{repo}`. Run `yarn install` if `node_modules` is missing. |
| Volta not picking up Node version | `volta install node@20` → retry |
| `cross-env: command not found` | Delete `node_modules` → `yarn install` again |
| `optipng-bin` / `gifsicle` build failure | Reinstall native libs: `brew reinstall libpng gifsicle optipng` → retry |
