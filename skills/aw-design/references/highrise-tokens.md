# HighRise Design Tokens

**Source of truth:** Figma — `HighRise` (fileKey `BM196jNmVUfXBYDsyEVv8N`), page **1. Tokens**.
**Extraction method:** Figma MCP `get_variable_defs` on the Colors / Typography / Gradients / Label / Input / Gap frames.
**Status markers:** ✓ verified from Figma | ~ derived | ? needs verification.

Every value below was pulled directly from the production design system. Use these exact tokens — no rogue hex codes, no sibling brand scales (violet / purple / indigo exist in the kit but are **accent** colors, not brand).

## Colors — Core Palette

### Primary · Blue (brand) ✓

Brand color. Primary buttons, active indicators, links, focus rings. Never decorative. `color/primary/blue/600` is the one true brand token.

```css
--color-primary-blue-25:  #F5F8FF;   /* ✓ subtlest bg tint */
--color-primary-blue-50:  #EFF4FF;   /* ✓ selected-row bg, Secondary/Tertiary btn bg */
--color-primary-blue-100: #D1E0FF;   /* ✓ focus ring 4px glow, soft hover */
--color-primary-blue-200: #B2CCFF;   /* ✓ disabled primary bg, Secondary btn bg */
--color-primary-blue-300: #84ADFF;   /* ✓ Secondary btn border, dark-mode focus */
--color-primary-blue-400: #528BFF;   /* ✓ lighter accent on dark surface */
--color-primary-blue-500: #2970FF;   /* ✓ dark-mode accent / gradient stop */
--color-primary-blue-600: #155EEF;   /* ✓ PRIMARY BRAND — buttons, active nav, links */
--color-primary-blue-700: #004EEB;   /* ✓ hover / blue text on light bg */
--color-primary-blue-800: #0040C1;   /* ✓ focused border, hover-on-primary */
--color-primary-blue-900: #00359E;   /* ✓ active / pressed */
```

### Neutral · Gray ✓

Primary neutral. HighRise also ships seven optional gray variants (`gray-blue`, `gray-cool`, `gray-modern`, `gray-neutral`, `gray-iron`, `gray-true`, `gray-warm`) — only reach for those when explicitly asked. Default to plain `gray`.

```css
--color-neutral-white:    #FFFFFF;   /* ✓ page bg (light), text on primary */
--color-neutral-black:    #000000;   /* ✓ modal scrim only — never as surface */
--color-neutral-gray-25:  #FCFCFD;   /* ✓ subtle page bg / hover-on-white */
--color-neutral-gray-50:  #F9FAFB;   /* ✓ sidebar bg, table header, subtle bg */
--color-neutral-gray-100: #F2F4F7;   /* ✓ hover states on neutral surfaces */
--color-neutral-gray-200: #EAECF0;   /* ✓ dividers, disabled neutral bg */
--color-neutral-gray-300: #D0D5DD;   /* ✓ input borders, card borders */
--color-neutral-gray-400: #98A2B3;   /* ✓ placeholder text, icons */
--color-neutral-gray-500: #667085;   /* ✓ body text (secondary), metadata */
--color-neutral-gray-600: #475467;   /* ✓ body text (primary), Neutral btn bg */
--color-neutral-gray-700: #344054;   /* ✓ headings (secondary), Label text */
--color-neutral-gray-800: #1D2939;   /* ✓ headings, emphatic text */
--color-neutral-gray-900: #101828;   /* ✓ page titles, metric numbers, input value */
```

### Secondary · Error / Destructive ✓

```css
--color-secondary-error-25:  #FFFBFA;
--color-secondary-error-50:  #FEF3F2;   /* error bg */
--color-secondary-error-100: #FEE4E2;   /* error soft */
--color-secondary-error-200: #FECDCA;
--color-secondary-error-300: #FDA29B;   /* invalid input border */
--color-secondary-error-400: #F97066;
--color-secondary-error-500: #F04438;   /* status dot */
--color-secondary-error-600: #D92D20;   /* Destructive base — btns, alerts */
--color-secondary-error-700: #B42318;   /* hover */
--color-secondary-error-800: #912018;
--color-secondary-error-900: #7A271A;
```

### Secondary · Warning ✓

```css
--color-secondary-warning-25:  #FFFCF5;
--color-secondary-warning-50:  #FFFAEB;
--color-secondary-warning-100: #FEF0C7;
--color-secondary-warning-200: #FEDF89;
--color-secondary-warning-300: #FEC84B;
--color-secondary-warning-400: #FDB022;
--color-secondary-warning-500: #F79009;   /* status dot */
--color-secondary-warning-600: #DC6803;   /* Warning base */
--color-secondary-warning-700: #B54708;   /* hover */
--color-secondary-warning-800: #93370D;
--color-secondary-warning-900: #7A2E0E;
```

### Secondary · Success ✓

```css
--color-secondary-success-25:  #F6FEF9;
--color-secondary-success-50:  #ECFDF3;
--color-secondary-success-100: #D1FADF;
--color-secondary-success-200: #A6F4C5;
--color-secondary-success-300: #6CE9A6;
--color-secondary-success-400: #32D583;
--color-secondary-success-500: #12B76A;   /* status dot */
--color-secondary-success-600: #039855;   /* Success base */
--color-secondary-success-700: #027A48;   /* hover */
--color-secondary-success-800: #05603A;
--color-secondary-success-900: #054F31;
```

### Accent library (opt-in) ✓

Full 25-900 scales exist for: `moss`, `green-light`, `green`, `teal`, `cyan`, `blue-light`, `blue`, `blue-dark`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `orange`, `orange-dark`, `yellow`. Use only when an accent chart / category / tag color is explicitly required. Never substitute for brand. Common 600 values:

```css
--color-accent-green-light-600: #4CA30D;
--color-accent-green-600:       #099250;
--color-accent-teal-600:        #0E9384;
--color-accent-cyan-600:        #088AB2;
--color-accent-blue-light-600:  #0086C9;
--color-accent-blue-600:        #1570EF;   /* note: distinct from primary-blue-600 */
--color-accent-indigo-600:      #444CE7;
--color-accent-violet-600:      #7839EE;
--color-accent-purple-600:      #6938EF;
--color-accent-fuchsia-600:     #BA24D5;
--color-accent-pink-600:        #DD2590;
--color-accent-rose-600:        #E31B54;
--color-accent-orange-600:      #E04F16;
--color-accent-yellow-600:      #CA8504;
```

## Semantic Aliases

```css
/* Surfaces */
--bg-page:          var(--color-neutral-white);
--bg-surface:       var(--color-neutral-white);
--bg-subtle:        var(--color-neutral-gray-50);     /* sidebar, table header */
--bg-hover:         var(--color-neutral-gray-100);    /* row hover */
--bg-selected:      var(--color-primary-blue-50);     /* selected row, active nav */

/* Borders */
--border-default:   var(--color-neutral-gray-300);
--border-subtle:    var(--color-neutral-gray-200);
--border-focus:     var(--color-primary-blue-800);

/* Text */
--text-primary:     var(--color-neutral-gray-900);
--text-secondary:   var(--color-neutral-gray-700);    /* labels */
--text-tertiary:    var(--color-neutral-gray-500);    /* helper, metadata */
--text-placeholder: var(--color-neutral-gray-400);
--text-accent:      var(--color-primary-blue-700);    /* links */
--text-on-accent:   var(--color-neutral-white);

/* Brand */
--accent-base:      var(--color-primary-blue-600);
--accent-hover:     var(--color-primary-blue-700);
--accent-pressed:   var(--color-primary-blue-900);
--accent-disabled:  var(--color-primary-blue-200);

/* Status dots (6px circle + gray label — NEVER filled pills) */
--status-success:   var(--color-secondary-success-500);
--status-warning:   var(--color-secondary-warning-500);
--status-error:     var(--color-secondary-error-500);
```

## Dark Mode ? (not yet exported from Figma)

Derived defaults that respect the blue brand and meet WCAG AA:

```css
.dark {
  --bg-page:          #0A0A0A;
  --bg-surface:       #141414;
  --bg-subtle:        #1A1A1A;
  --bg-hover:         #1F1F22;
  --bg-selected:      rgba(21, 94, 239, 0.14);   /* primary-blue-600 @ 14% */

  --border-default:   #2A2A2E;
  --border-subtle:    #222226;
  --border-focus:     #84ADFF;                    /* primary-blue-300 */

  --text-primary:     #FAFAFA;
  --text-secondary:   #A1A1AA;
  --text-tertiary:    #71717A;
  --text-placeholder: #5A5A5F;
  --text-accent:      #84ADFF;                    /* primary-blue-300 */
  --text-on-accent:   #FFFFFF;

  --accent-base:      #2970FF;                    /* primary-blue-500 */
  --accent-hover:     #528BFF;                    /* primary-blue-400 */
  --accent-pressed:   #155EEF;                    /* primary-blue-600 */
  --accent-disabled:  #00359E;                    /* primary-blue-900 */
}
```

Contrast: near-zero shadow opacity on dark; borders do the work.

## Gradients ✓

HighRise ships gradients only in gray and primary blue. Use sparingly — hero banners, marketing surfaces, empty-state illustrations. **Never** on buttons or form fields.

```css
/* Primary (brand) */
--gradient-primary-600-500-90:   linear-gradient(90deg,   #155EEF 0%, #2970FF 100%);
--gradient-primary-700-600-45:   linear-gradient(45deg,   #004EEB 0%, #155EEF 100%);
--gradient-primary-800-600-45:   linear-gradient(45deg,   #0040C1 0%, #155EEF 100%);
--gradient-primary-800-600-90:   linear-gradient(90deg,   #0040C1 0%, #155EEF 100%);
--gradient-primary-800-700-26:   linear-gradient(26.5deg, #0040C1 0%, #004EEB 100%);
--gradient-primary-900-600-45:   linear-gradient(45deg,   #00359E 0%, #155EEF 100%);

/* Gray (neutral hero / illustration fill) */
--gradient-gray-600-500-90:      linear-gradient(90deg,   #475467 0%, #667085 100%);
--gradient-gray-700-600-45:      linear-gradient(45deg,   #344054 0%, #475467 100%);
--gradient-gray-800-600-45:      linear-gradient(45deg,   #1D2939 0%, #475467 100%);
--gradient-gray-800-600-90:      linear-gradient(90deg,   #1D2939 0%, #475467 100%);
--gradient-gray-800-700-26:      linear-gradient(26.5deg, #1D2939 0%, #344054 100%);
--gradient-gray-900-600-45:      linear-gradient(45deg,   #101828 0%, #475467 100%);
```

**Note:** Figma also contains 28 "Mesh gradients" for illustration / marketing surfaces. Treat those as image assets — don't try to recreate in CSS.

## Typography — Inter ✓

Font family: `Inter, -apple-system, BlinkMacSystemFont, sans-serif`.

### Text scale (body, UI) ✓

```css
--font-size-4xs: 8px;   --font-line-height-4xs: 12px;
--font-size-3xs: 9px;   --font-line-height-3xs: 14px;
--font-size-2xs: 10px;  --font-line-height-2xs: 15px;
--font-size-xs:  11px;  --font-line-height-xs:  16px;   /* Label xs, helper xs */
--font-size-sm:  12px;  --font-line-height-sm:  17px;   /* smallest body, chips */
--font-size-md:  13px;  --font-line-height-md:  18px;   /* Button label, Input value */
--font-size-lg:  14px;  --font-line-height-lg:  20px;   /* Body default, Label md */
--font-size-xl:  15px;  --font-line-height-xl:  20px;
--font-size-2xl: 16px;  --font-line-height-2xl: 24px;   /* larger body emphasis */
--font-size-3xl: 18px;  --font-line-height-3xl: 28px;   /* section headings */
--font-size-4xl: 20px;  --font-line-height-4xl: 30px;   /* card titles */
```

### Display scale (page titles, hero) ✓

| Token | Size × Line | Letter-spacing |
|---|---|---|
| `Display xs` | 24 / 32 | 0 |
| `Display sm` | 30 / 38 | 0 |
| `Display md` | 36 / 44 | -0.02em |
| `Display lg` | 48 / 60 | -0.02em |
| `Display xl` | 60 / 72 | -0.02em |
| `Display 2xl` | 72 / 90 | -0.02em |

Each display size ships in Regular / Medium / Semibold / Bold.

### Weights ✓

```css
--font-weight-regular:  400;
--font-weight-medium:   500;   /* Label default */
--font-weight-semibold: 600;   /* Button label, headings */
--font-weight-bold:     700;
```

### Letter spacing ✓

```css
--letter-spacing-normal: 0;          /* all text scale */
--letter-spacing-tight:  -0.02em;    /* display md+ */
```

### Role mappings ✓

```css
/* Label (form labels, overline) — always Medium weight, uses gray-700 */
.label-xs  { font: 500 11px/16px Inter; color: var(--text-secondary); }
.label-sm  { font: 500 12px/17px Inter; color: var(--text-secondary); }
.label-md  { font: 500 13px/18px Inter; color: var(--text-secondary); }
.label-lg  { font: 500 14px/20px Inter; color: var(--text-secondary); }

/* Input value (rendered text in field) — Regular, gray-900 */
.input-xs  { font: 400 11px/16px Inter; color: var(--text-primary); }
.input-sm  { font: 400 12px/17px Inter; color: var(--text-primary); }
.input-md  { font: 400 13px/18px Inter; color: var(--text-primary); }
.input-lg  { font: 400 14px/20px Inter; color: var(--text-primary); }

/* Button label — Semibold */
.text-button-sm { font: 600 12px/17px Inter; }
.text-button-md { font: 600 13px/18px Inter; }
.text-button-lg { font: 600 14px/20px Inter; }

/* Body copy */
.text-body-sm { font: 400 12px/17px Inter; color: var(--text-secondary); }
.text-body-md { font: 400 13px/18px Inter; color: var(--text-secondary); }
.text-body-lg { font: 400 14px/20px Inter; color: var(--text-secondary); }

/* Headings (use Display scale for page titles, Text 3xl/4xl for sections) */
.text-heading-section { font: 600 18px/28px Inter; color: var(--text-primary); }
.text-heading-card    { font: 600 20px/30px Inter; color: var(--text-primary); }
.text-heading-page    { font: 600 30px/38px Inter; letter-spacing: 0;        color: var(--text-primary); }
.text-display-hero    { font: 600 48px/60px Inter; letter-spacing: -0.02em;  color: var(--text-primary); }
```

## Spacing ~ (derived from component observations)

```css
--space-0:  0;
--space-1:  2px;
--space-2:  4px;
--space-3:  6px;    /* Label → input gap, helper text → icon gap */
--space-4:  8px;    /* button icon gap, helper → helper */
--space-5:  10px;   /* MD button vertical padding */
--space-6:  12px;
--space-7:  14px;
--space-8:  16px;   /* MD button horizontal padding, input → helper */
--space-10: 20px;
--space-12: 24px;   /* card padding, grid gap */
--space-16: 32px;   /* card padding large */
--space-20: 40px;
--space-24: 48px;   /* section gap */
--space-32: 64px;
```

Content max-width `1200px` with generous side margins.

## Border Radius ✓

```css
--radius-xs:   4px;    /* icon-only button */
--radius-sm:   6px;    /* chips, tags */
--radius-md:   8px;    /* MD button, input, select */
--radius-lg:   12px;   /* cards */
--radius-xl:   16px;   /* modals */
--radius-2xl:  20px;
--radius-full: 9999px; /* pills, avatars, toggle */
```

## Shadows ✓

```css
/* Verified from Figma "Shadow/xs" & "Shadow/lg" */
--shadow-xs:  0 1px 2px 0 rgba(16, 24, 40, 0.05);
--shadow-lg:  0 4px 6px -2px rgba(16, 24, 40, 0.03), 0 12px 16px -4px rgba(16, 24, 40, 0.08);

/* Derived interpolations */
--shadow-sm:  0 1px 3px 0 rgba(16, 24, 40, 0.10), 0 1px 2px 0 rgba(16, 24, 40, 0.06);
--shadow-md:  0 4px 8px -2px rgba(16, 24, 40, 0.10), 0 2px 4px -2px rgba(16, 24, 40, 0.06);

/* Focus ring — 4px outer glow of primary-blue-100 + xs */
--focus-ring: 0 0 0 4px var(--color-primary-blue-100), 0 1px 2px 0 rgba(16, 24, 40, 0.05);
```

## Component Anatomy ✓

### Button
- **Variants:** Primary / Secondary / Tertiary / Ghost / Link
- **Themes:** Primary (blue) / Neutral (gray) / Destructive / Warning / Success
- **States:** Default / Hover / Focused / Active / Disabled
- **Sizes (height × radius):** 2XL 60px, XL 48px, LG 44px, MD 40px · `--radius-md`, SM 36px, XS 32px · `--radius-xs` (icon-only), 2XS 28px, 3XS 24px
- **MD padding:** `10px 16px`, `8px` icon gap
- **Label:** `.text-button-md` (600 13/18) for Primary/Secondary/Tertiary/Ghost, `.text-button-lg` (600 14/20) for Links

### Input Field
- **Height scale:** 24, 28, 32, 36, 40 (default), 44
- **Radius:** `--radius-md` (8px), border 1px `--border-default`, `--shadow-xs` at rest
- **Value:** `.input-md` (400 13/18, gray-900) default · also available xs/sm/lg (`.input-*`)
- **Placeholder:** `--text-placeholder` (gray-400)
- **Focus:** border `--border-focus` (primary-blue-800) + `--focus-ring`
- **Label → Input gap:** `--space-3` (6px)
- **Input → Helper gap:** `--space-3` (6px)
- **Helper lines gap:** `--space-2` (4px), icon-to-text `--space-3` (6px)

## Visual Restraint Rules (non-negotiable)

- **One** brand accent (`--color-primary-blue-600` = `#155EEF`) — no rainbow
- **Status indicators** = 6px colored dot + gray label, **NEVER** filled pills
- **Cards** = white surface + 1px `--border-default` + no shadow at rest (hover can add `--shadow-sm`)
- Near-zero shadow opacity — borders do the work
- Section gaps ≥ 48px — content breathes
- **No zebra-striped tables** — hover `--bg-subtle` + single bottom border
- Sidebar = `--bg-subtle` or white, never dark or colored in light mode
- Max 3 text sizes per section (title, body, caption)
- Realistic data — real names, plausible numbers, recent dates; never Lorem Ipsum
- Gradients reserved for hero / marketing / illustration surfaces — not buttons, not form fields

## Responsive Breakpoints (mandatory)

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile  | 320–767px   | Single column, sidebar behind hamburger, stacked cards, tables scroll horizontally, touch targets ≥ 44×44 |
| Tablet  | 768–1023px  | 2-column grid, collapsed sidebar (64px icons only) |
| Desktop | 1024–1279px | Full layout, expanded sidebar |
| Wide    | 1280px+     | Content max-width 1200px, centered |

Body font ≥ 14px on mobile. Modal full-screen below 640px.

## Provenance

All values extracted from Figma file `BM196jNmVUfXBYDsyEVv8N` (HighRise), page **1. Tokens**, via Figma MCP `get_variable_defs` / `get_design_context`:

- `1525:271581` (Colors) — full primary, neutral, secondary, and accent palettes
- `1525:272676` (Gradients) — gray + primary gradient stops & angles
- `1023:36826`  (Typography) — full 11-step Text scale + 6-step Display scale + weights + letter-spacing
- `26951:17805` (Label) — Label Medium-weight variants (xs/sm/md/lg/2xl)
- `27376:6411`  (Input text) — Input Regular-weight variants + placeholder / value colors
- `28038:45100` (Gap) — label/input/helper spacing reference (6/8/4px pattern)

To extend, open the file in Figma and run `get_variable_defs` on the target node. Dark-mode tokens are **not yet published** in this file; update when they land.
