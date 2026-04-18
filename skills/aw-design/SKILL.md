---
name: aw-design
description: Generate UI designs for GoHighLevel features using the Highrise design system. Produces linked HTML prototypes with state variants via Stitch MCP. Delegates prompt engineering and tokens to platform-design skills.
trigger: Phase 5 of aw-feature, or when the user asks for UI design, screen mockups, HTML prototypes, or design exploration for a GHL feature.
---

# AW Design

Generates UI designs for GoHighLevel features. Delegates design system knowledge to platform skills, uses Stitch MCP for screen generation, and iterates on feedback.

## When to Use

- Feature involves UI changes and needs design exploration
- User wants screen mockups before implementation
- `aw-feature` Phase 5 (Design) is active

## When Not to Use

- Backend-only feature — suggest skipping
- Design already exists in `.aw_docs/features/<slug>/designs/` — review, don't regenerate
- User only needs an existing component — point them to `platform-design-system`

## Workflow

### 1. Understand what to design

Read the feature's `requirements.md` or `prd.md`. For each screen, identify:
- What it shows (purpose, key data, user actions)
- Which states it needs: default, empty (illustration + heading + CTA), loading (skeleton shimmer), error (validation + toast), modal/drawer overlays
- How screens connect to each other (navigation flow)

If the scope is unclear, ask the user which pages and flows to cover before generating anything.

### 2. Load design system context

Read these skills to get the actual tokens and prompt templates — do not rely on the summary in this file:

1. **Read the `platform-design-stitch-screen-generation` skill** — find it in the available skills catalog and read its SKILL.md. It contains the Premium SaaS Prompt Template with exact Highrise colors, typography, spacing, components, layout patterns, and screen type templates (dashboard, list view, detail view, form, settings, modal). This is your primary source for crafting Stitch prompts.

2. **Read the `platform-design-system` skill** — contains the full Highrise component catalog, HL-prefixed component rules, and design token CSS properties.

Use the prompt template from `platform-design-stitch-screen-generation` verbatim — it produces significantly better results than ad-hoc prompts.

### 3. Create a Highrise design system in Stitch

Before generating any screens, create a reusable design system so all screens share consistent tokens:

```
Call: stitch_create-design-system
Server: user-ghl-ai
Arguments:
  designSystem:
    displayName: "Highrise - <feature name>"
    theme:
      colorMode: "LIGHT"
      headlineFont: "INTER"
      bodyFont: "INTER"
      labelFont: "INTER"
      roundness: "ROUND_EIGHT"
      customColor: "#155EEF"
      colorVariant: "TONAL_SPOT"
```

Save the returned asset ID — you'll apply it to screens after generation.

### 4. Generate screens with Stitch

1. **Create project:**
   Call `stitch_create-project` with a descriptive title. Save the returned project ID (numeric).

2. **Generate the primary screen first:**
   Call `stitch_generate-screen` with:
   - `projectId`: the numeric ID from step 1
   - `prompt`: use the Premium SaaS Prompt Template from `platform-design-stitch-screen-generation`, filled in with this feature's specifics. Include navigation links to all sibling screens.
   - `deviceType`: `"DESKTOP"`
   - `modelId`: `"GEMINI_3_1_PRO"`

3. **Apply design system:**
   Call `stitch_get-project` to get screen instances, then call `stitch_apply-design-system` with the asset ID from step 3 and the screen instances.

4. **Generate remaining screens** with the same prompt template structure. Include navigation that links back to other screens.

5. **Generate state variants** for each screen:
   - `empty.html` — illustration + heading + CTA, no data
   - `loading.html` — skeleton shimmer matching the default layout
   - `error.html` — validation errors, failed-load messaging
   - `modal-<name>.html` — for any overlays the screen needs

6. **Download HTML** for each screen via `stitch_get-screen` and save to the output folder.

### 5. Show results and iterate

Show the user what was generated (screenshot URLs from `stitch_get-screen`). When they give feedback:

| Feedback type | Action |
|---|---|
| Targeted fix ("make sidebar narrower") | `stitch_edit-screens` with specific instructions |
| Want to see alternatives | `stitch_generate-variants` from the source screen |
| Major rethink | `stitch_generate-screen` with a revised prompt |

After each edit, re-apply the design system if the layout changed significantly. Update affected state variants too.

### 6. Document the design

Write `.aw_docs/features/<slug>/design.md`:
- Screen-by-screen walkthrough (what each screen does, how users navigate between them)
- Component inventory (which existing HL components to reuse vs. what's new)
- Key design decisions and rationale

## Without Stitch MCP

If Stitch tools aren't available, generate self-contained HTML files directly. Use the Highrise tokens from `platform-design-system` for inline CSS. Same state variants, same output structure — just hand-written HTML instead of Stitch-generated.

## Output Structure

```
.aw_docs/features/<slug>/designs/
├── <screen-1>/
│   ├── default.html
│   ├── empty.html
│   ├── loading.html
│   ├── error.html
│   └── modal-<name>.html
├── <screen-2>/
│   └── ...
└── design.md
```

## Stitch MCP Tools (via `user-ghl-ai` server)

| Tool | Purpose | Key params |
|---|---|---|
| `stitch_create-project` | One project per feature | `title` |
| `stitch_create-design-system` | Create Highrise token set | `designSystem` (fonts, colors, roundness) |
| `stitch_apply-design-system` | Apply tokens to generated screens | `projectId`, `assetId`, `selectedScreenInstances` |
| `stitch_generate-screen` | Generate a screen from prompt | `projectId`, `prompt`, `deviceType`, `modelId` |
| `stitch_edit-screens` | Refine screens with instructions | `screens[]`, `editInstructions` |
| `stitch_generate-variants` | Explore alternative layouts | `parent`, `sourceScreen`, `count` |
| `stitch_get-screen` | Get screenshot + HTML download URLs | `name` (screen resource name) |
| `stitch_get-project` | Get project details + screen instances | `name` (project resource name) |
| `stitch_list-design-systems` | List available design systems | `pageSize` |
