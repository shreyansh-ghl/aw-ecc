# Self-Review & Iterate

Step 6 of the workflow. You don't "present" a design — you **prove it's production-ready** first. This file defines how.

Run two tracks in order: **deterministic** (fast, regex) then **visual** (browser MCP). Fix findings, re-validate. Loop up to **3 iterations**. Stop early when all pass. If you can't reach a pass state in 3 iterations, write unresolved items to `REVIEW.md` and surface them to the user — don't hide them.

---

## Track A — Deterministic sweep

Run these as shell checks from the feature root (`.aw_docs/features/<slug>/`). Every check produces zero or more findings. Zero findings across all checks = Track A passes.

### A1. No rogue hex values

Every hex color in every HTML must exist in `references/highrise-tokens.md`. Anything else is a rogue value.

```bash
# Harvest the allowed hex set once
grep -hoE '#[0-9A-Fa-f]{6}' aw-ecc/skills/aw-design/references/highrise-tokens.md | sort -u > /tmp/allowed_hex.txt

# Find all hex in generated designs, compare
grep -rhoE '#[0-9A-Fa-f]{6}' designs/ | sort -u > /tmp/used_hex.txt
comm -23 /tmp/used_hex.txt /tmp/allowed_hex.txt
```

Any output line is a finding: "rogue hex `<value>`". Locate each with `rg -n '<value>' designs/` and fix.

**Allowed exceptions** (do not flag):
- `#000000` in `rgba(0,0,0,…)` for shadows and scrim — present as `0 4px 6px -2px rgba(16, 24, 40, 0.03)` style already
- Values inside HTML comments `<!-- … -->`

### A2. Exactly one brand accent

Only the blue family is a brand color. Any use of violet/purple/indigo/pink/etc. as a primary action color is a finding.

```bash
# If any of these 600-values appear, it's an accent misuse
grep -rhnE '#(6938EF|7839EE|9E77ED|BA24D5|D444F1|E31B54|EF6820|F63D68|DD2590|2E90FA|0BA5EC|0086C9|06AED4|0E9384|15B79E|3CCB7F|66C61C|16B364|669F2A|EAAA08|EF6820)\b' designs/
```

Any match = finding. The only permitted non-blue accents are status colors (success `#12B76A`, warning `#F79009`, error `#F04438`) and only as status indicators — never as button fills or nav highlights.

### A3. All state variants present

For every screen folder, the set `{default, empty, loading, error}` must all exist. Modal is optional.

```bash
for dir in designs/*/; do
  [ "$dir" = "designs/screenshots/" ] && continue
  for state in default empty loading error; do
    [ -f "$dir$state.html" ] || echo "MISSING: $dir$state.html"
  done
done
```

### A4. Responsive media queries

Every screen HTML must contain all three breakpoints.

```bash
for f in designs/**/*.html; do
  grep -q '@media (min-width: 768px)'  "$f" || echo "$f — missing tablet breakpoint"
  grep -q '@media (min-width: 1024px)' "$f" || echo "$f — missing desktop breakpoint"
  grep -q '@media (min-width: 1280px)' "$f" || echo "$f — missing wide breakpoint"
done
```

### A5. Focus rings + reduced motion

Every screen HTML must include `:focus-visible`, at least one `@keyframes`, and the `prefers-reduced-motion` fallback.

```bash
for f in designs/**/*.html; do
  grep -q ':focus-visible'            "$f" || echo "$f — no :focus-visible"
  grep -q '@keyframes'                "$f" || echo "$f — no @keyframes"
  grep -q 'prefers-reduced-motion'    "$f" || echo "$f — no prefers-reduced-motion"
done
```

### A6. Typography is on the scale

Every font size — whether written as `font-size:` or inside `font:` shorthand — must be one of: `8 9 10 11 12 13 14 15 16 18 20 24 30 36 48 60 72` px (or `rem`/`em` equivalents, or a `var(--font-size-*)` reference).

**A6a — `font-size:` declarations:**

```bash
grep -rhoE 'font-size:\s*[0-9.]+(px|rem|em)' designs/ \
  | grep -vE 'font-size:\s*(8|9|10|11|12|13|14|15|16|18|20|24|30|36|48|60|72)(px|rem|em)' \
  | sort -u
```

**A6b — `font:` shorthand (e.g. `font: 600 30px/38px Inter`):**

```bash
# Pull size tokens out of any "font:" shorthand, then filter to off-scale
grep -rhoE 'font:\s*[^;}"]+' designs/ \
  | grep -oE '[0-9.]+(px|rem|em)\b' \
  | grep -vE '^(8|9|10|11|12|13|14|15|16|18|20|24|30|36|48|60|72)(px|rem|em)$' \
  | sort -u
```

Any output from **either** check = off-scale size finding. Run both — `font:` shorthand is the sneaky one Stitch loves to emit.

### A7. Sidebar restraint

Sidebars are light, not colored.

```bash
# Expect sidebar bg to be #F9FAFB (gray-50) or white — never a brand color
rg -n --multiline-dotall 'class="[^"]*sidebar[^"]*"[^>]*>.*?background[^;]*?(#155EEF|#EFF4FF|#D1E0FF)' designs/
```

Any match = finding. Brand blue belongs on the active nav item only (bg `#EFF4FF`, text `#155EEF`, 2px left border `#155EEF`).

### A8. Index page completeness

`designs/index.html` must exist and must link to every screen + state variant.

```bash
[ -f designs/index.html ] || echo "MISSING: designs/index.html"

# Every state HTML must be referenced somewhere in index.html
for f in designs/*/*.html; do
  rel="${f#designs/}"
  grep -q "$rel" designs/index.html || echo "index.html does not link $rel"
done
```

### A9. Realistic data

Spot-check for placeholder strings that leak past Stitch.

```bash
rg -n --ignore-case 'lorem ipsum|placeholder|foo bar|test data|john doe|jane doe|example\.com|dummy' designs/
```

Any match = finding. Replace with plausible domain-appropriate data.

---

## Track B — Visual sweep (browser MCP)

Run once Track A is clean.

### B0. Browser MCP selection (agent-portable)

Track B requires a browser MCP that exposes the standard `browser_*` tool surface. The tool names below (`browser_navigate`, `browser_resize`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`, optional `browser_evaluate`) are identical across both supported servers — only the server you route to changes.

| Environment | Recommended MCP | Notes |
|---|---|---|
| Codex | `playwright` (preconfigured in `~/.codex/config.toml` as `@playwright/mcp@latest`) | Portable default. Runs headless Chromium locally. |
| Claude Desktop / Claude Code | `playwright` (install `@playwright/mcp`) | Same as Codex. |
| Cursor | `cursor-ide-browser` **or** `playwright` | `cursor-ide-browser` opens a real Cursor tab (nice for the human to watch); Playwright is faster and headless. Either works. |

Detect capability before starting Track B:

```
1. Check whether any of browser_navigate / browser_snapshot are registered.
2. If yes → proceed.
3. If no → mark Track B as SKIPPED in REVIEW.md with reason
   "no browser MCP available in this environment" and downgrade the final
   status to ⚠️ Shipped with partial verification. Track A is still enforceable.
```

**`file://` fallback (mandatory probe before the main sweep).** Some Playwright MCP configs and hardened Cursor setups refuse `file://` URLs for security. Probe once with the index page:

```
browser_navigate → file:///<abs>/designs/index.html
```

If the call errors with a security/permission/unsupported-scheme message, start a local HTTP server and use it for the rest of Track B:

```bash
# Run in a background shell (block_until_ms: 0). Note the PID.
python3 -m http.server 8765 --directory <abs path to designs>
```

Then substitute `http://127.0.0.1:8765/...` for every `file://` URL in B1–B5. Kill the server in B6 teardown with the PID. Record in REVIEW.md which scheme was used (`file://` or `http://127.0.0.1:8765`).

**Cursor-only step:** if you selected `cursor-ide-browser`, call `browser_lock { action: "lock" }` after the first navigation and `browser_lock { action: "unlock" }` at the end of Track B. Playwright MCP has no equivalent — skip it.

### B1. Per-screen breakpoint pass

Open `designs/index.html` once as a warm-up, then for each screen + state (loop across `designs/*/*.html`):

```
browser_navigate → <scheme>://…/<screen>/<state>.html
for width in [320, 768, 1024, 1440]:
    browser_resize { width, height: 900 }
    browser_snapshot
    browser_take_screenshot → designs/screenshots/<screen>-<state>-<width>.png
```

**What to look for in each snapshot + screenshot:**

| Width | Must be true |
|---|---|
| 320 | No sidebar visible, no horizontal scroll, touch targets ≥44×44, body font ≥14px, modals full-screen if present, hero/brand panels must not push primary content below the fold |
| 768 | Sidebar collapsed to 64px icon rail, 2-column grid where applicable |
| 1024 | Full 240px sidebar with labels, ≥3-column grid on dashboards |
| 1440 | Content capped at ~1200px max-width and centered — not edge-to-edge |

For each violation, write a finding: `<screen>/<state> @ <width>px: <what is wrong>`.

**Capture matrix (enforced head count).** Before marking B1 as ✅, compute:

```bash
# Count generated HTML files (exclude index.html and screenshots/)
files=$(find designs/ -name '*.html' ! -name 'index.html' | wc -l | tr -d ' ')

# Per-file expected captures at B1 (4 widths) + B2 (1 dark capture)
expected=$(( files * 4 + files ))   # = files × 5

# Actual captures on disk
actual=$(find designs/screenshots/ -name '*.png' 2>/dev/null | wc -l | tr -d ' ')

echo "Captures: $actual / $expected"
```

B1 + B2 combined PASS requires `actual >= expected`. If `actual < 0.9 × expected`, Track B is ❌ not partial — you skipped work. Record the ratio in REVIEW.md verbatim (e.g. `Captures: 18/20 (90%) PASS` or `Captures: 3/20 (15%) FAIL — most breakpoints never rendered`).

### B2. Dark mode pass

At 1440px width, toggle dark class and re-screenshot one screen per folder:

```
browser_navigate → file:///…/<screen>/default.html
browser_resize   → 1440 × 900
# Inject .dark on <html>
browser_snapshot   (confirm dark class present)
browser_take_screenshot → designs/screenshots/<screen>-default-1440-dark.png
```

Inspect: background near-black (not pure `#000`), text gray-100/200 (not pure white), borders visible at low contrast, accent blue still legible on dark surface.

### B3. Cross-screen consistency

Pick two screens in the feature (e.g., list view + detail view). At 1440 light mode:

- Primary button: same height, padding, bg, hover shade
- Input: same height, border, focus ring
- Card: same border, radius, shadow (or lack thereof)
- Sidebar: same width, item spacing, active-state styling

Any visible inconsistency = finding.

### B4. Console check

After every navigation:

```
browser_console_messages
```

Any JS error or CSS parse error = finding.

### B5. Computed-style spot-check (optional, Playwright only)

If `browser_evaluate` is available (Playwright MCP exposes it; cursor-ide-browser does not), run computed-style assertions that regex can't catch. Pick one primary button and one focused input per screen and verify rendered values:

```js
// Inside browser_evaluate
const btn = document.querySelector('.btn-primary, [data-role="primary"]');
const s = getComputedStyle(btn);
return {
  bg: s.backgroundColor,           // must resolve to rgb(21, 94, 239) == #155EEF
  radius: s.borderRadius,          // must be 8px
  fontWeight: s.fontWeight,        // must be 500 or 600
  minHeight: s.height              // must be ≥ 36px
};
```

This catches cascade bugs (e.g. a `:root` override that silently broke the token) that Track A's hex grep can't see. Skip this section on cursor-ide-browser — not a finding, just `N/A` in REVIEW.md.

### B6. Teardown

```
(if cursor-ide-browser) browser_lock { action: "unlock" }
(if http fallback)     kill <pid of python3 http.server>
```

Playwright MCP auto-cleans on session end — no explicit unlock needed.

---

## Categorizing findings → fix method

Every finding must be tagged with a fix method before applying. This keeps us off the Stitch quota.

| Finding class | Fix method | Stitch cost |
|---|---|---|
| Rogue hex (A1, A2) | `sed -i` on the HTML — swap to the correct token hex | 0 |
| Missing `@media` block (A4) | Direct edit — append the block to `<style>` | 0 |
| Missing `:focus-visible` / `@keyframes` / `prefers-reduced-motion` (A5) | Direct edit — copy from `references/micro-interactions.md` | 0 |
| Off-scale font-size (A6) | Direct edit — snap to nearest scale value | 0 |
| Wrong sidebar bg (A7) | Direct edit — change background token | 0 |
| Index page missing links (A8) | Direct edit — append `<a>` entries | 0 |
| Placeholder data (A9) | Direct edit — substitute realistic values | 0 |
| Missing state variant file (A3) | `stitch_generate-screen` (Flash) with state-variant prompt | 1 |
| Cross-screen inconsistency (B3) | `stitch_apply-design-system` multi-select on affected screens | 1 total |
| Layout broken at a breakpoint (B1) | `stitch_edit-screens` with specific instruction | 1 per screen |
| Dark mode unreadable (B2) | Direct edit — adjust `.dark` overrides in CSS | 0 |
| Architectural wrongness (wrong hierarchy, wrong primary CTA) | **Do not auto-fix.** Surface to user as a BLOCKER in REVIEW.md | 0 |

**Hard rule:** never regenerate a whole screen to fix a rogue hex. If a finding has a 0-cost fix path, that is the only acceptable fix method.

---

## The iteration loop — what "done" actually means

This is the skill's teeth. The loop is **not optional** and **not a single pass**. Treat each of these as a hard contract:

1. **Every iteration runs both tracks, in full.** No skipping Track B because Track A still has findings — Track B catches things Track A can't see, and you need both signals every round.
2. **Every iteration must apply fixes to the findings it produced.** An iteration where you ran the checks but didn't edit anything is not a real iteration.
3. **Every iteration must produce evidence in REVIEW.md.** See "Per-iteration evidence" below.
4. **The loop stops for exactly three reasons** — and only the first is a success:

   | Stop condition | REVIEW.md status |
   |---|---|
   | Zero findings across both tracks | ✅ Production-ready |
   | 3 iterations completed, some findings remain but count is decreasing | ⚠️ Shipped with known issues (only valid with **≥2 iterations of fixes on disk**) |
   | Findings count stopped decreasing (fix regressed something) or a BLOCKER finding surfaced | ❌ Blocked — surface to user |

   A status of ⚠️ is **invalid** if fewer than 2 iterations applied fixes. If you ran 1 iteration and have findings, the status is ❌ BLOCKED, not ⚠️. No shortcuts.

### Pseudocode

```
iter = 1
prev_count = infinity

while iter <= 3:
    findings_A = run_track_A()
    findings_B = run_track_B()      # always runs, no skipping
    findings   = findings_A + findings_B

    write_iteration_evidence(iter, findings)   # to REVIEW.md § Iteration <iter>

    if len(findings) == 0:
        final_status = "✅"
        break

    if iter > 1 and len(findings) >= prev_count:
        final_status = "❌"   # not converging
        break

    prev_count = len(findings)
    apply_fixes(findings)              # <-- mandatory; iteration without this is void
    record_fixes_applied(iter)         # to REVIEW.md § Iteration <iter> § Fixes
    iter += 1

if final_status is unset:
    # Ran all 3, still have findings, but count decreased each time
    final_status = "⚠️"
    assert iterations_with_fixes_on_disk >= 2, "⚠️ requires ≥2 fix iterations"

finalize_REVIEW_md(final_status, remaining=findings)
```

**Convergence check:** iteration N+1 must have strictly fewer findings than iteration N. If not, a fix regressed something — stop and write ❌ BLOCKED with the regression listed.

**No ask-first shortcuts.** Do not stop after iteration 1 to ask the user "should I continue?" The contract says 3 iterations (or zero findings). Asking is a protocol violation.

---

## REVIEW.md — the evidence-required output contract

`designs/REVIEW.md` is not a summary document. It is an **audit trail** that proves each iteration actually ran. An agent reading their own REVIEW.md should not be able to fake compliance — the file format demands pasted commands, numeric outputs, capture counts, and fix diffs. Anything less is non-compliant.

### Per-check evidence requirement (Track A)

Every A-check row in every iteration's section must include:

1. The **exact command** that was run (copy-pasted, not paraphrased).
2. The **raw output** or a match-count (e.g. `→ 3 matches` or `→ empty output, 0 findings`).
3. A ✅/❌ verdict.

A row without command + output is treated as **not run** and forces the status to ❌ BLOCKED, regardless of what the verdict column says.

### Per-iteration capture count (Track B)

B1 must record the capture matrix ratio before its ✅. If `actual < 0.9 × expected` the row is ❌ and forces a ❌ BLOCKED overall status.

### Template

```markdown
# Design Review — <feature>

**Status:** ✅ Production-ready  |  ⚠️ Shipped with known issues (requires ≥2 fix iterations)  |  ❌ Blocked
**Iterations run:** N / 3
**Iterations with fixes applied:** M   (M ≥ 2 required for ⚠️)
**Browser MCP:** playwright | cursor-ide-browser | none (Track B skipped)
**URL scheme used:** file:// | http://127.0.0.1:8765 (local server fallback)
**Last reviewed:** <YYYY-MM-DD HH:MM TZ>

## Summary

<1–3 sentence plain-English state of the designs. If ⚠️ or ❌, lead with what is broken.>

---

## Iteration 1

### Track A — deterministic

| # | Check | Command run | Output | Verdict |
|---|---|---|---|---|
| A1 | rogue hex | `comm -23 /tmp/used_hex.txt /tmp/allowed_hex.txt` | `(empty)` | ✅ |
| A2 | one brand accent | `grep -rhnE '#(6938EF\|7839EE\|...)' designs/` | `0 matches` | ✅ |
| A3 | state variants | <loop script output> | `no MISSING lines` | ✅ |
| A4 | responsive breakpoints | <loop output> | `0 warnings` | ✅ |
| A5 | focus + motion | <loop output> | `0 warnings` | ✅ |
| A6a | font-size: scale | `grep -rhoE 'font-size:...' \| grep -vE ...` | `(empty)` | ✅ |
| A6b | font: shorthand | `grep -rhoE 'font:...' \| grep -oE ... \| grep -vE ...` | `14px` | ❌ 1 off-scale (in error.html) |
| A7 | sidebar restraint | `rg -n --multiline-dotall 'class="[^"]*sidebar[^"]*"...' designs/` | `0 matches` | ✅ |
| A8 | index completeness | `grep -q` loop over `designs/*/*.html` | `no unlinked lines` | ✅ |
| A9 | realistic data | `rg -n --ignore-case 'lorem ipsum\|...' designs/` | `0 matches` | ✅ |

### Track B — visual

| # | Check | Evidence | Verdict |
|---|---|---|---|
| B1 | breakpoint + capture matrix | Captures: **20 / 20 (100%)**. files=4, widths=4, dark=4 | ✅ |
| B2 | dark mode | 4 dark screenshots at 1440 captured | ✅ |
| B3 | cross-screen consistency | Button heights 40/40/40 px; input borders identical; card radius 8/8/8 | ✅ |
| B4 | console clean | No errors across 16 navigations | ✅ |
| B5 | computed-style spot-check | `.btn-primary` bg `rgb(21, 94, 239)`, radius `8px`, weight `500`, height `40px` | ✅ |

### Findings in this iteration

1. **A6b / error.html** — `font: 600 14px/20px Inter` (14px not in scale; closest is 15px)
2. **B1 / login/loading.html @ 320px** — brand hero panel occupies full viewport height, pushes form skeleton below fold

### Fixes applied

1. A6b → changed `font: 600 14px/20px Inter` to `font: 600 15px/22px Inter` in `error.html` line 147
2. B1 → added `@media (max-width: 767px) { .brand-panel { display: none; } }` in `loading.html` line 62

---

## Iteration 2

<same format — must show fewer findings than Iteration 1>

---

## Iteration 3

<only present if Iteration 2 still had findings>

---

## Final status

- **Status:** ✅ / ⚠️ / ❌
- **Remaining findings:** <0 or list>

## Known issues (only if status is ⚠️ or ❌)

For each remaining finding after iteration 3:

- **Severity:** blocker / minor
- **Where:** `<screen>/<state>.html` (+ breakpoint if visual)
- **What:** <description>
- **Why it wasn't auto-fixed:** <reason — needs judgment, needs Stitch regen the user didn't authorize, architectural>
- **Suggested next step:** <concrete action for the user>

## Artifacts

- Screenshots: `designs/screenshots/<screen>-<state>-<width>[-dark].png` (N files)
- Source files reviewed: <count>
```

### Anti-fake rules (self-review enforcement)

Before finalizing REVIEW.md, run these sanity checks on the file you just wrote:

| Rule | How to verify |
|---|---|
| Every A-check row has a non-empty `Command run` column | `grep -cE '^\| A[0-9]' REVIEW.md` equals 10 (A1–A6b–A9) per iteration |
| B1 row includes a `Captures: X / Y` fragment | `grep -c 'Captures: [0-9]' REVIEW.md` ≥ iteration count |
| If status is ⚠️, at least 2 iterations contain a `## Fixes applied` subsection with non-empty body | count `## Fixes applied` sections ≥ 2 |
| If status is ✅, the final iteration's findings list is literally empty | last `### Findings in this iteration` has no numbered items |

If any rule fails, **the status is ❌ BLOCKED** — rewrite the missing evidence or downgrade honestly. Do not present ⚠️ without the fixes-on-disk proof.

If status is ⚠️ or ❌, **explicitly flag this when presenting to the user** — don't bury it. The whole point of this review is that the agent is honest about what it couldn't verify or fix.

---

## Related skills (reference, not duplicate)

These exist in the broader registry and cover adjacent but distinct concerns. Don't re-read them whole — point to specific sections when the need arises.

- **`platform-design:pixel-fidelity-review`** — computed-style audit comparing a *Vue implementation* against an HTML design prototype. Opposite direction from us: they treat the HTML as ground truth; we audit the HTML itself. Borrow their `browser_evaluate` computed-style patterns for B5 if you need depth beyond the spot-check.
- **`platform-design:auditor`** (subagent) — end-to-end design fidelity auditor with pass/fail verdicts. If you need a full parallel review run (not just self-check), delegate via Task tool.
- **`platform-webapp-testing`** — Playwright helper scripts (`with_server.py`) for live dev servers. Not needed here (we use `file://` URLs) but relevant if a future step spins up a dev server to audit a built implementation.
