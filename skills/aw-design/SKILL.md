---
name: aw-design
description: Generate premium SaaS UI designs using the Highrise design system. Produces linked HTML prototypes with all state variants, micro-interactions, dark mode, responsive breakpoints, and an index page that maps the full feature. Stitch MCP first, static HTML fallback.
trigger: Phase 5 of aw-feature, or when the user asks for UI design, screen mockups, HTML prototypes, or design exploration for a GHL feature.
---

# AW Design

Generate production-grade SaaS screens for GoHighLevel features. Every screen should feel like it belongs in Linear, Vercel, or Stripe — clean, restrained, premium, and alive with subtle motion. Highrise provides the tokens; your job is to make something genuinely good within them.

## References (read on demand)

This skill is intentionally lean. Read the reference files as you need them:

- `references/highrise-tokens.md` — colors (light + dark), typography, spacing, components, restraint rules, responsive breakpoints. **Read before generating any screen.**
- `references/prompt-template.md` — the full screen prompt, layout hints by screen type, and state variant prompt additions. **Read before writing your first prompt.**
- `references/stitch-workflow.md` — Stitch tool reference, generation steps, timeout/model fallback, HTML fallback path, iteration patterns. **Read before the first Stitch call.**
- `references/micro-interactions.md` — all CSS transitions, keyframes, and `prefers-reduced-motion` fallback. **Read when writing HTML directly.**
- `references/quality-checklist.md` — the pass/fail contract the self-review enforces, plus the mandatory index page spec. **Read before step 5 (index).**
- `references/self-review.md` — deterministic + visual review tracks, capture matrix, evidence-required REVIEW.md template, per-iteration audit format, status-rule table (✅/⚠️/❌), and the anti-fake sanity checks. **Read at the start of step 6. Non-optional.**

## Path Precedence

**Try Stitch MCP first.** Static HTML is the fallback, not a parallel option.

1. Check if Stitch MCP tools are registered (look for `stitch_*` tools on the `user-ghl-ai` server).
2. If yes → run the Stitch path. Do not fall back unless a call actually fails.
3. A **timeout is not a failure** — the default client timeout (~70s) is shorter than Stitch's typical generation time. Poll via `stitch_list-screens` + `stitch_get-screen` before giving up. See timeout handling in `references/stitch-workflow.md`.
4. If polling confirms the call truly failed (error, auth, quota exhausted, or no screen after 3 min + Flash retry) → document the reason and fall back to hand-written HTML for that screen.
5. If Stitch tools are missing entirely → skip Stitch and write HTML directly.
6. If the user explicitly says "offline" or "static HTML only" → skip Stitch and write HTML directly.

Never silently pick the HTML path just because it's faster. The user asked for design; Stitch produces better output.

## Design Thinking

Before generating anything, commit to a clear direction:

- **Purpose** — What problem does this screen solve? Who's looking at it and what do they need?
- **Hierarchy** — What's the single most important thing on the page? Build everything around it.
- **Restraint** — Premium SaaS is defined by what you leave out. Monochrome-first. One accent color. Let content breathe.
- **Craft** — Spacing, alignment, typography weight, and motion — the details that separate "looks AI-generated" from "looks designed."

The goal is intentional, polished, and cohesive — not flashy.

## Workflow

### 1. Understand what to design

Read the feature's `requirements.md` or `prd.md`. For each screen, identify:

- What it shows (purpose, key data, user actions)
- Which states it needs (default, empty, loading, error, modal)
- How screens connect (navigation flow)

Produce `.aw_docs/features/<slug>/designs/SCREEN_PLAN.md` listing every screen and the nav structure linking them. If scope is unclear, ask the user which pages and flows to cover before generating.

### 2. Prepare the prompt

Read `references/highrise-tokens.md` and `references/prompt-template.md`. Fill in the bracketed parts of the template for the first screen (screen type, layout, nav items, current page).

### 3. Generate screens

Read `references/stitch-workflow.md`. Follow the Stitch path. **A timeout is not a failure.** Stitch's 70s MCP client timeout regularly fires before generation finishes; the screen is still being built server-side.

**Polling protocol on timeout (mandatory, non-negotiable):**

1. Capture the `requestId` / note the timestamp.
2. Call `stitch_list-screens` every **30 seconds** for **6 polls** (total 3 minutes of wall time).
3. After each poll, check whether a new screen matching the request has appeared — if yes, call `stitch_get-screen` and continue as normal.
4. If all 6 polls complete with no new screen → retry **once** with `model: "GEMINI_3_FLASH"` and re-apply the polling protocol.
5. If the Flash retry also produces nothing → document the screen as a Stitch failure in `SCREEN_PLAN.md` and fall back to hand-written HTML **for that screen only**.

Do not write HTML on the first timeout. Do not skip polls. Do not treat a single 70s wait as "Stitch failed."

If Stitch is genuinely unavailable (tools not registered, or `stitch_list-screens` errors), read `references/micro-interactions.md` and write self-contained HTML files using the same prompt template as the spec.

### 4. Generate state variants

For every screen, produce default + loading + empty + error variants (+ modal if applicable). Use the state variant prompt additions at the bottom of `references/prompt-template.md`. Keep them on `GEMINI_3_FLASH` (the default) — they're simple derivations of an existing screen.

### 5. Build the index page (mandatory)

Write `.aw_docs/features/<slug>/designs/index.html` — the map of the entire feature. This is the stakeholder entry point. See the "Index page requirements" section in `references/quality-checklist.md` for what it must contain.

### 6. Self-review & iterate (until production-ready)

The skill is not done generating — it is done **proving the output is production-ready**. Read `references/self-review.md` and run both tracks.

**This step is mandatory and non-interactive.** Do not ask the user "should I run the review?" Do not ask "do you want me to iterate?" Do not stop after iteration 1 to check in. The contract is: run the loop until zero findings, or until 3 iterations have elapsed with fixes-on-disk in at least 2 of them. That happens silently — the user sees the result, not the permission prompt. Asking for permission to run this step is a protocol violation.

- **Track A (deterministic):** regex-level sweep for rogue hex, missing states, missing media queries, missing focus rings, off-scale typography (including `font:` shorthand), sidebar restraint, index completeness, and placeholder data. Always runs, every iteration.
- **Track B (visual):** navigate each screen via a browser MCP, `browser_resize` through 320 / 768 / 1024 / 1440, toggle dark mode, run cross-screen consistency spot-checks, read `browser_console_messages`. Use **Playwright MCP** (portable across Codex, Claude, and Cursor) or Cursor's `cursor-ide-browser` when running inside Cursor. Both expose the same `browser_*` tool surface. If `file://` URLs are rejected by the MCP, spin up `python3 -m http.server 8765 --directory <designs/>` in the background and use `http://127.0.0.1:8765/...` — never accept the rejection as a reason to skip Track B. Always runs every iteration. Only skipped if neither MCP is registered at all, in which case mark Track B SKIPPED in `REVIEW.md` and downgrade the status.
- **Never skip Track B just because Track A had findings.** Both tracks run every iteration.

Categorize every finding using the fix-method table in `references/self-review.md`. **Prefer 0-cost direct edits over Stitch regeneration** — never burn quota to fix a rogue hex.

Loop up to **3 iterations**. Stop conditions and resulting REVIEW.md status are defined in `references/self-review.md`. Summary:

- Zero findings → ✅ Production-ready
- 3 iterations run, findings decreasing, fixes applied in ≥2 iterations → ⚠️ Shipped with known issues
- Findings stopped decreasing, or a BLOCKER surfaced, or only 1 iteration ran with findings remaining → ❌ Blocked

Each iteration must produce its own evidence section in `designs/REVIEW.md` (exact command strings + output counts for Track A, capture-matrix ratio for Track B, fixes-applied list). A status of ⚠️ without two `## Fixes applied` sections on disk is invalid — downgrade to ❌ instead of lying.

Do not proceed to step 7 until `REVIEW.md` shows ✅, or until you've exhausted 3 iterations and explicitly documented the remaining blockers and their severity.

### 7. Present to user

Share `designs/index.html` as the entry point and `designs/REVIEW.md` as the audit trail. If `REVIEW.md` status is ⚠️ or ❌, **call it out explicitly** — don't bury the known issues. Take user feedback here; any change request re-enters step 6 before re-presenting.

For user-driven revisions: use `stitch_edit-screens` for targeted fixes, `stitch_generate-variants` for alternatives, and only regenerate for major rethinks. See the iteration table in `references/stitch-workflow.md`.

### 8. Document the design

Write `.aw_docs/features/<slug>/design.md` **at the feature root, not inside `designs/`**:

- Screen-by-screen walkthrough (what each screen does, how users navigate between them)
- Component inventory (which existing HL components to reuse vs. what's new)
- Key design decisions and rationale
- Link to `designs/index.html` as the entry point
- Link to `designs/SCREEN_PLAN.md` for the flow map
- Link to `designs/REVIEW.md` for the self-review audit trail

## Output Structure

```
.aw_docs/features/<slug>/
├── requirements.md          (from earlier phase)
├── prd.md                   (from earlier phase)
├── design.md                ← design decisions, component inventory
└── designs/
    ├── index.html           ← entry point: links to every screen + state
    ├── SCREEN_PLAN.md       ← flow map + nav structure
    ├── REVIEW.md            ← self-review audit trail (step 6 output)
    ├── <screen-1>/
    │   ├── default.html
    │   ├── empty.html
    │   ├── loading.html
    │   ├── error.html
    │   └── modal-<name>.html
    ├── <screen-2>/
    │   └── ...
    └── screenshots/
        ├── <screen>-desktop-light.png   (from stitch_get-screen if used)
        └── <screen>-<state>-<width>.png (from step 6 visual sweep)
```

## Platform Skills to Reference

These exist in the platform registry and contain deeper guidance — reference specific sections when relevant, don't re-read them whole:

- **`platform-design:md`** — anti-pattern catalog (cheap vs premium patterns), DESIGN.md output format, dark mode token mapping, responsive breakpoint table
- **`platform-design:stitch-screen-generation`** — multi-select theme consistency, competitive benchmarking, Ralph Loop iteration
- **`platform-design:pixel-fidelity-review`** — 6-layer audit, scoring rubric, Highrise-specific CSS override gotchas (use when implementation review is needed)
- **`platform-design:system`** — HL component catalog, design token CSS properties, WCAG 2.1 AA rules
