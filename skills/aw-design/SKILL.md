---
name: aw-design
description: Generate UI designs for GoHighLevel features using the Highrise design system. Produces HTML prototypes with state variants and iterates via Stitch MCP until the user approves. Use when a feature needs UX/UI exploration, screen mockups, or design decisions before implementation.
trigger: Phase 5 of aw-feature, or when the user asks for UI design, screen mockups, HTML prototypes, or design exploration for a GHL feature.
---

# AW Design

`aw-design` generates UI designs for GoHighLevel features. It follows the Highrise design system, produces self-contained HTML prototypes with state variants, and uses Stitch MCP when available. It iterates on feedback until the user is happy with the result.

## When to Use

- Feature involves UI changes and needs design exploration
- User wants screen mockups before implementation
- `aw-feature` Phase 5 (Design) is active

## When Not to Use

- Backend-only feature — suggest skipping
- Design already exists in `.aw_docs/features/<slug>/designs/` — review, don't regenerate
- User only needs an existing component — point to `platform-design-system`

## Workflow

### 1. Identify screens and states

Read the feature's `requirements.md` or `prd.md`. For each screen, identify:
- The default (populated) state
- Empty state (no data yet — illustration + heading + CTA)
- Loading state (skeleton shimmer, not spinners)
- Error state (validation errors, failed loads)
- Modal/drawer states if the screen has overlays

If the scope is unclear, ask the user which pages and flows to cover.

### 2. Load design system context

Read `platform-design-system` for Highrise tokens and component inventory. Read `platform-design-stitch-screen-generation` for Stitch prompt templates if using Stitch.

### 3. Generate screens

**With Stitch MCP (`ghl-ai` server):**
1. `stitch_create-project` — one project per feature
2. `stitch_generate-screen` — generate the primary screen first (use `GEMINI_3_1_PRO`, `DESKTOP`). Include Highrise tokens in the prompt: colors, Inter font, spacing, component patterns, visual restraint rules (monochrome-first, single accent color).
3. `stitch_get-project` — extract the theme from the primary screen
4. Generate remaining screens with the extracted theme for consistency
5. Generate state variants for each screen (empty, loading, error, modals)
6. Save HTML to `.aw_docs/features/<slug>/designs/<screen>/`

**Without Stitch:**
Generate self-contained HTML files directly with inline CSS using Highrise tokens.

### 4. Iterate on feedback

Show the user what was generated. When they give feedback:
- Targeted fix → `stitch_edit-screens` with specific instructions
- Alternative layout → `stitch_generate-variants`
- Major rethink → `stitch_generate-screen` with revised prompt

Keep iterating until the user approves. Each round, update the affected state variants too if the layout changed.

### 5. Document the design

Write `.aw_docs/features/<slug>/design.md`:
- Screen-by-screen UX walkthrough
- Component inventory (existing HL components to reuse vs new ones to build)
- Key design decisions and rationale

## Output Structure

```
.aw_docs/features/<slug>/designs/
├── <screen-1>/
│   ├── default.html
│   ├── empty.html
│   ├── loading.html
│   ├── error.html
│   └── modal-<name>.html    (if applicable)
├── <screen-2>/
│   └── ...
└── design.md
```

## Stitch MCP Tools (via `ghl-ai` server)

| Tool | When |
|---|---|
| `stitch_create-project` | Once per feature |
| `stitch_generate-screen` | Generate a screen. `GEMINI_3_1_PRO` for quality, `GEMINI_3_FLASH` for speed. |
| `stitch_edit-screens` | Refine a screen based on feedback |
| `stitch_generate-variants` | Explore alternative layouts |
| `stitch_get-screen` | Get screenshot URL and HTML download URL |
| `stitch_get-project` | Extract theme tokens from primary screen |

## Highrise Tokens (for Stitch prompts)

- Page bg: `#ffffff` | Card: `#ffffff` + `1px solid rgba(0,0,0,0.06)`
- Accent: `#155EEF` (primary CTAs only) | Heading: `#101828` | Body: `#344054` | Muted: `#667085`
- Subtle bg: `#f9fafb` | Dividers: `#eaecf0` | Font: Inter
- Title: 28-32px semibold | Body: 14px | Caption: 12-13px
- Section gaps: 48px | Card padding: 32px | 8-point grid
- Components: `HL`-prefixed — `HLButton`, `HLInput`, `HLModal`, `HLTable`
- Status: tiny 6px dots (green/amber/red) + gray text labels, never colored pills

## Platform Skills to Load When Needed

- `platform-design-system` — Full Highrise component catalog
- `platform-design-stitch-screen-generation` — Detailed Stitch prompt engineering
- `platform-design-md` — DESIGN.md synthesis patterns
- `platform-design-review` — HL compliance and WCAG 2.1 AA audit
