# Screen Prompt Template

Use this template verbatim for every screen, filling in the bracketed parts. Whether you send it to Stitch or implement it directly as HTML, the template is the same.

## Base template

```
Design a [SCREEN TYPE] for a SaaS [PRODUCT TYPE] application.

AESTHETIC: Clean, minimal, premium. Think Linear.app or Vercel dashboard.
Generous whitespace. Let content breathe. Almost flat design.
NO colored backgrounds on cards. NO heavy shadows. NO gradient fills.
Monochrome-first — only use the accent color for primary CTAs and active states.

COLORS (Highrise tokens):
- Page background: #ffffff
- Content cards: #ffffff with 1px border rgba(0,0,0,0.06)
- Primary accent: #155EEF (HighRise brand blue — ONLY for primary buttons and active indicators)
- Primary hover: #004EEB, pressed: #00359E, disabled bg: #B2CCFF, soft: #EFF4FF (selected rows, active nav bg)
- Heading text: #101828
- Body text: #344054
- Secondary/muted text: #667085
- Subtle backgrounds: #f9fafb (hover states, sidebar, table headers)
- Dividers: #eaecf0 (use sparingly — prefer spacing over lines)
- Status indicators: tiny 6px dots only (green #12B76A, amber #F79009, red #F04438)
  paired with gray text labels. NEVER use colored pills or colored backgrounds.

TYPOGRAPHY: Inter font family. Use HighRise's verified scale — every line-height is fixed.
- Page title (Display sm): 30px / line-height 38px, semibold, letter-spacing 0
- Hero / large display (Display md): 36px / 44px, semibold, letter-spacing -0.02em
- Section headings: 18px / 28px or 20px / 30px, semibold
- Body default (Text lg): 14px / 20px, regular, color #475467
- Button label (Text md): 13px / 18px, semibold 600
- Captions / metadata (Text sm): 12px / 17px, medium 500, color #667085
- Helper / micro (Text xs): 11px / 16px, medium 500, color #667085
- Metric numbers (Display sm / md): 30px / 38px or 36px / 44px, semibold, color #101828

SPACING:
- Section gaps: 48px
- Card padding: 24-32px
- Card grid gap: 24px
- Content max-width: 1200px with generous side margins

COMPONENTS:
- Cards: 12px radius, 1px border (no shadow at rest), 24-32px padding
- Buttons: 8px radius, 36-40px height, only primary gets color fill, scale(0.97) on active
- Secondary buttons: ghost/outline style with gray border
- Tables: clean rows, no zebra stripes, #f9fafb hover, 1px bottom border only
- Metric cards: large number prominently, small gray label below, NO icon circles
- Inputs: 8px radius, 1px #D0D5DD border, 40px height, 4px #D1E0FF focus ring + border #0040C1 on focus

MICRO-INTERACTIONS (include CSS for all):
- All interactive elements: transition 0.15s ease on bg, border, color, transform
- Button hover: shade darker, focus-visible 4px primary ring, active scale(0.97)
- Card/row hover: background #f9fafb 0.2s ease
- Input focus: #0040C1 border + 4px #D1E0FF ring
- Sidebar active: 2px left border slide-in
- @media (prefers-reduced-motion: reduce) fallback to disable animations

DARK MODE (mandatory): Toggle via .dark class on <html>. Use CSS custom properties.
- Page bg: #0A0A0A, cards #141414, subtle bg #1A1A1A, borders #2A2A2E
- Heading #FAFAFA, body #A1A1AA, secondary #71717A
- Accent #2970FF (blue-500 lighter for dark contrast), hover #528BFF, pressed #155EEF
- Focused border: #84ADFF, focus ring 4px rgba(132,173,255,0.2), near-zero shadow opacity

RESPONSIVE (mandatory): The HTML must include working CSS media queries for all four breakpoints. Test by resizing — content must reflow, not just scale.

- Mobile (max-width: 767px):
  * Sidebar: hidden, replaced by a hamburger icon in the header that opens a full-height drawer
  * Header: 56px tall, compact spacing
  * Main grid: single column, cards stacked vertically with 16px gap
  * Tables: wrap in overflow-x: auto so they scroll horizontally; OR collapse to card-per-row layout for primary tables
  * Metric cards: 2-per-row (or 1-per-row if there are <=3)
  * Modals: full-screen (100vw, 100vh, no rounded corners, no backdrop)
  * Touch targets: minimum 44x44px
  * Body text: minimum 14px
  * Side padding: 16px

- Tablet (min-width: 768px and max-width: 1023px):
  * Sidebar: collapsed to 64px icon rail (tooltips on hover show labels)
  * Main grid: 2 columns
  * Metric cards: 2-per-row
  * Modals: centered but max-width 90vw
  * Side padding: 24px

- Desktop (min-width: 1024px and max-width: 1279px):
  * Sidebar: full 240px, expanded with labels
  * Main grid: 3 columns (or whatever the design calls for)
  * Metric cards: 3-4 per row
  * Modals: max-width 560px, centered
  * Side padding: 32px

- Wide (min-width: 1280px):
  * Content wrapper capped at max-width 1200px, centered with auto margins
  * Side padding: 48px

Use a mobile-first approach with min-width media queries. Do NOT use JavaScript for layout changes — pure CSS only.

LAYOUT: [describe specific layout — sidebar width, header height, content areas, grid]

DATA: Use realistic placeholder data (real names, plausible numbers, recent dates).

NAVIGATION: This screen is part of a linked prototype. Include a left sidebar with navigation links.
Each nav item must be an <a> tag with href pointing to sibling pages using relative paths.
Sidebar nav items:
[list nav items with relative href paths like ../dashboard/default.html]
[current page] should have active state: #EFF4FF background, #155EEF text, 2px left border.
Theme toggle button in top-right that flips .dark class and persists to localStorage.
```

## Layout hints by screen type

**Dashboard:** Left sidebar 240px (#f9fafb), 64px header (white), metric cards row, then charts/tables.

**List view:** Search bar + filter chips, action bar with bulk actions/sort/view toggle, data table, pagination.

**Detail view:** Breadcrumb, header with name + status dot + actions, tab bar or side panels, activity timeline.

**Form / Settings:** Section headers with descriptions, form groups with labels + inputs + help text, sticky save/cancel.

**Modal:** Semi-transparent backdrop rgba(0,0,0,0.4), centered white card 16px radius 32px padding max-width 560px, header + body + footer with cancel/confirm.

## State variant prompt additions

Append one of these to the base template to generate a state variant:

### Loading

```
Show LOADING state: replace text with skeleton shimmer rectangles (#f2f4f7, animated pulse).
@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }. 1.5s infinite.
Replace images with gray rectangles. Keep sidebar and header fully rendered.
```

### Empty

```
Show EMPTY state (zero data): centered illustration placeholder (gray circle with icon),
heading "No [items] yet" 18px semibold #101828, description 14px #667085,
primary CTA "Create your first [item]" #155EEF with hover (#004EEB) and active (#00359E) states.
Keep sidebar and header rendered.
```

### Error

```
Show ERROR state: form inputs with red border #f04438 and error text 12px below (fade-in 0.2s),
toast notification top-right (white card, red left border, slide-in from right 0.25s, dismiss X).
Keep sidebar and header rendered.
```

### Modal

```
Show MODAL OVERLAY: backdrop rgba(0,0,0,0.4) fade-in 0.2s,
centered white modal 16px radius 32px padding max-width 560px,
dialog entrance: translateY(8px) scale(0.98) opacity 0 → translateY(0) scale(1) opacity 1, 0.2s ease-out,
title + close X, [form/content], cancel ghost + confirm primary button.
Background page visible but dimmed.
```
