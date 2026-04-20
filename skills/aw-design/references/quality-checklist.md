# Quality Checklist

This is the **pass/fail contract** that the self-review loop (step 6) enforces against every screen, every state, and the index page. Items are grouped by review track:

- **Track A** items are deterministic — checked by regex/grep during `references/self-review.md` Track A.
- **Track B** items are visual — checked by `cursor-ide-browser` during Track B.

The agent must reach ✅ on every item, or explicitly flag the remaining failures in `designs/REVIEW.md` before presenting.

## Token compliance

- [ ] Colors match `references/highrise-tokens.md` exactly — no rogue hex values
- [ ] Only ONE accent color used (#155EEF — HighRise brand blue)
- [ ] Status indicators are tiny 6px dots + gray text, not colored pills
- [ ] Cards are white with thin border, no colored backgrounds
- [ ] No heavy shadows at rest
- [ ] Section gaps are 48px+
- [ ] Metric numbers 30–36px (Display sm/md) with small gray labels
- [ ] Tables have no zebra stripes
- [ ] Data looks realistic (real names, plausible numbers, recent dates)

## Micro-interactions

- [ ] All interactive elements have `:hover`, `:focus-visible`, and `:active` states
- [ ] Transitions are 0.15s ease (or 0.2s for larger movement)
- [ ] `@media (prefers-reduced-motion: reduce)` media query present
- [ ] Modal has entrance/exit animation
- [ ] Toast slides in from top-right
- [ ] Skeleton shimmer uses `@keyframes pulse`
- [ ] Input focus ring renders correctly in both light and dark mode

## Variants completeness

- [ ] Every screen has default + loading + empty + error (+ modal if applicable)
- [ ] Dark mode toggle works on every screen

## Responsive (verify by actually resizing the viewport — don't just trust the code)

Open each HTML file and resize through 320px, 768px, 1024px, and 1440px. Confirm at each width:

- [ ] No horizontal scroll on `<body>` at any viewport width
- [ ] **Mobile (≤767px):** sidebar hidden, hamburger drawer works, cards stack vertically, modals go full-screen, touch targets ≥44×44px, body font ≥14px
- [ ] **Tablet (768–1023px):** sidebar collapsed to 64px icon rail, 2-column grid
- [ ] **Desktop (1024–1279px):** full 240px sidebar with labels, grid uses 3+ columns
- [ ] **Wide (≥1280px):** content capped at 1200px max-width, centered
- [ ] Tables either scroll horizontally OR collapse to card layout on mobile — never overflow the viewport
- [ ] Media queries use mobile-first `min-width` and are pure CSS (no JS layout switching)

## Linked prototype

- [ ] `index.html` exists and links to every screen + state variant
- [ ] Sidebar nav items have working `<a href>` relative links
- [ ] Current page highlighted in sidebar
- [ ] Theme toggle persists via localStorage and applies to all previews
- [ ] Navigation flow diagram present in index

## Index page requirements

The `.aw_docs/features/<slug>/designs/index.html` is mandatory and must include:

- Feature name and 1-line description
- Every screen as a card with:
  - Screen name
  - Thumbnail (Stitch screenshot URL, or iframe preview for HTML)
  - Links to each state variant: default, empty, loading, error, modal-*
- Navigation flow diagram (simple arrows showing screen → screen relationships)
- Links to `design.md` (at feature root), `SCREEN_PLAN.md` (same folder), and `REVIEW.md` (same folder)
- Theme toggle (light/dark) that persists to localStorage and applies to all previews

The index follows the same Highrise tokens and micro-interactions — it must look as polished as the screens it links to.
