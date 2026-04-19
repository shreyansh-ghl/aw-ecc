# Stitch MCP Workflow

Stitch MCP is the primary generation path. Tools live on the `user-ghl-ai` server.

## Tool reference

| Tool | Purpose |
|---|---|
| `stitch_create-project` | One project per feature |
| `stitch_create-design-system` | Create Highrise token set |
| `stitch_apply-design-system` | Apply tokens to screens (multi-select pass) |
| `stitch_generate-screen` | Generate screen from prompt |
| `stitch_edit-screens` | Refine with instructions |
| `stitch_generate-variants` | Explore alternative layouts |
| `stitch_get-screen` | Get screenshot + HTML URLs |
| `stitch_get-project` | Get project details + theme |
| `stitch_list-screens` | List all screens in a project |
| `stitch_list-projects` | List all projects |

## Generation steps

1. **Create project:** `stitch_create-project` with a descriptive title. Save the numeric project ID.

2. **Create design system:**
   ```
   stitch_create-design-system:
     displayName: "Highrise - <feature>"
     theme:
       colorMode: "LIGHT"
       headlineFont: "INTER"
       bodyFont: "INTER"
       labelFont: "INTER"
       roundness: "ROUND_EIGHT"
       customColor: "#155EEF"
       colorVariant: "TONAL_SPOT"
   ```

3. **Batch screens in groups of 3–4.** Don't send all screens in one prompt — Stitch drops quality beyond 3 per batch. Use `designs/SCREEN_PLAN.md` to group by flow (e.g., onboarding batch, list+detail batch, settings batch).

4. **Generate primary screen first** using the full prompt template (`references/prompt-template.md`). Use `deviceType: "DESKTOP"` and `modelId: "GEMINI_3_FLASH"` — it's the default because Pro regularly exceeds the ~70s MCP timeout. Flash returns in ~20–40s with quality that is more than good enough for the Highrise token set. Only switch to `GEMINI_3_1_PRO` for a specific screen if Flash output is visibly weak after one edit pass.

5. **Extract theme** via `stitch_get-project`. Document exact hex values returned — feed them into all remaining prompts.

6. **Generate remaining screens** in batches, using the extracted theme.

7. **Multi-select theme pass.** Once all screens exist, select all and apply `stitch_apply-design-system` with the asset ID from step 2. This is the single most important step for visual consistency — a single prompt fixes what would otherwise take dozens of edits.

8. **Generate state variants** using the prompt additions in `references/prompt-template.md`.

9. **Download HTML + screenshots** for each screen via `stitch_get-screen`.

## Responsive generation strategy

Stitch's `deviceType` parameter is the canvas the AI designs for (MOBILE / TABLET / DESKTOP / AGNOSTIC), but the generated HTML can and must include CSS media queries for all four breakpoints.

**Default: generate at `DESKTOP`.** The prompt template already demands mobile-first media queries inside the HTML, so a single DESKTOP generation typically produces all breakpoints when the prompt is followed.

**Generate a separate MOBILE screen** when the mobile UX is genuinely different — not just reflowed. Common triggers:

- Data tables that should collapse to card-per-row rather than scroll horizontally
- Multi-step flows where desktop uses a sidebar but mobile uses a full-screen wizard
- Dashboards where mobile needs a totally different information hierarchy

When generating the MOBILE variant, prompt Stitch explicitly: "This is the mobile companion to [desktop screen]. Use the same tokens and design system. [describe the mobile-specific layout]."

**Verify responsive in QA**, not just accept it:

1. Open the generated HTML in a browser
2. Resize the viewport through all four breakpoints (320, 768, 1024, 1440)
3. Confirm:
   - Sidebar collapses/hides at the right widths
   - Tables don't overflow the viewport
   - Modals go full-screen on mobile
   - Touch targets are ≥44×44px at mobile size
   - No horizontal scroll on the body at any width

If any breakpoint is broken, use `stitch_edit-screens` with an explicit fix instruction like "Add mobile breakpoint: at max-width 767px, hide sidebar and replace with hamburger drawer. Stack metric cards vertically." Do NOT regenerate — that wastes quota.

## Model selection

Two models are available:

| Model | Typical time | When to use |
|---|---|---|
| `GEMINI_3_FLASH` (default) | 20–40s | All screens and state variants — fits comfortably inside the ~70s MCP timeout |
| `GEMINI_3_1_PRO` | 30–90s+ | Only when a specific Flash screen comes out visibly weak and an edit pass didn't fix it. Expect timeouts — follow the polling procedure below. |

Pro regularly exceeds the client timeout and rarely delivers a visible quality gain for Highrise-constrained output. Default to Flash; escalate per-screen only when needed.

## Timeouts

Even on Flash, occasional screens take longer than the client timeout. Treat a timeout as "still running, not failed" — don't fall back to HTML until you've actually confirmed failure.

### When a `stitch_generate-screen` call times out

1. **Wait and poll** — the screen is likely still generating server-side. Do NOT retry the generate call (that wastes a request from the 350/month quota). Instead:
   - Call `stitch_list-screens` with the `projectId` to see if the screen appeared
   - If present, call `stitch_get-screen` to fetch the result
   - Poll every 20–30s for up to 2 minutes on Flash, or 3 minutes on Pro, before treating it as a real failure

2. **If still not present after the poll window** — retry once with the same model. If that also times out, retry with a simpler prompt (drop non-essential sections) on Flash.

3. **If the simplified retry also errors** — document the failure (include the prompt and error), then fall back to the HTML path for that specific screen. Other screens in the batch can still use Stitch.

### Rate limit reminder

350 generate requests/month across the workspace. Timeouts still consume quota on the server side even if your client times out. Prefer `stitch_edit-screens` over regenerating for small changes.

## HTML fallback path

Only when Stitch is truly unavailable (tools missing, confirmed failure, or user opts out):

- Write self-contained HTML files with embedded `<style>` block
- Use CSS custom properties in `:root` for all tokens (enables `.dark` class swap)
- Include the full micro-interactions CSS from `references/micro-interactions.md`
- Include responsive media queries at 768px, 1024px, 1280px
- Same prompt template shapes the structure — you're implementing it directly instead of sending it to Stitch

## Iterating on feedback

| Feedback type | Stitch action | HTML action |
|---|---|---|
| Targeted fix ("make sidebar narrower") | `stitch_edit-screens` with specific instructions | Edit the HTML/CSS directly |
| Want alternatives | `stitch_generate-variants` from the source screen | Generate a second version |
| Major rethink | `stitch_generate-screen` with revised prompt | Rewrite from scratch |

After edits, re-enter step 6 of the skill (`references/self-review.md`) — do not just spot-check. Any change can regress a Track A deterministic gate. Update affected state variants if layout changed.
