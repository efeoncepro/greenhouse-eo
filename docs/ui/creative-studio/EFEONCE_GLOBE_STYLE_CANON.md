# Globe Studio — Style Canon

Attach this file to any new session that builds a **Globe** surface, so every screen shares one visual language. Globe is the **governed, agentic creative-production studio** inside Efeonce — a **sub-brand of AXIS**: where AXIS/Greenhouse is bright and operational, **Globe is dark, cinematic, and creative**, but uses the same primitives (Tabler icons, sentence-case LatAm Spanish `tú`, tonal semantics, restrained motion).

> One-line brief: *deep midnight-blue cinematic canvas, azure energy, warm-orange spark, white Poppins display, the generated visual is always the hero, governance is quietly ever-present.*

---

## 0. Two systems, one family — they coexist

Efeonce/AXIS and Globe are **not** the same surface and must **not** be blended into one. They are two skins over one shared DNA — pick by product context, never mix within a screen.

| | **Efeonce / AXIS / Greenhouse** | **Globe Studio** |
|---|---|---|
| Character | Bright, operational, executive | Dark, cinematic, creative |
| Canvas | `#F8F7FA` neutral / white cards | midnight-blue gradient (`#061443`→`#030c26`) |
| Primary accent | Core Blue `#0375DB` | Azure `#4db8ff` (+ orange spark `#ff6500`) |
| Ink | dark on light | light on dark (`#eaf0ff`) |
| Feel | flat cards, hairlines, data-first | glass chrome, glow, the visual is the hero |
| Where | dashboards, finance, payroll, admin, PDFs, institutional | the creative production studio (brief → generate → deliver) |

**Shared DNA (identical in both):** Tabler icons only · Poppins (display) + Geist/sans (everything) + tabular numerals for data · **tonal** semantic feedback (never saturated solids) · sentence-case LatAm Spanish, `tú`, verb+object buttons · restrained, emphasized-easing motion, reduced-motion honored · 4px spacing rhythm · one accent at a time.

**How they relate technically:** Globe is a **dark theme layered on AXIS**, not a fork. Load the AXIS token CSS + Tabler as the base in every DC, then apply the Globe `--g-*` tokens (§1) on top for Globe surfaces only. An Efeonce/AXIS surface simply *doesn't* add the `--g-*` layer and keeps the bright defaults. Same components, same copy voice — different palette + chrome. When in doubt: **AXIS is the north**; Globe is its night mode for the creative studio.

---

## 1. Color tokens (paste as CSS `:root`)

```css
:root{
  /* structural navy — the cinematic base */
  --g-midnight:#061443;  --g-abyss:#03102e;  --g-navy:#091951;
  /* energy */
  --g-blue:#0375db;      --g-azure:#4db8ff;   --g-accent:#4db8ff; /* primary accent, ONE at a time */
  /* ink on dark */
  --g-paper:#f7f9ff;     --g-ink:#eaf0ff;     --g-muted:#aeb9d7;   --g-faint:#7f8cb5;
  /* hairlines & surfaces (translucent, sit on the navy) */
  --g-line:rgba(192,211,255,.12);  --g-line2:rgba(192,211,255,.22);
  --g-surface:rgba(11,26,78,.5);   --g-surface2:rgba(14,31,92,.66);  --g-raised:rgba(18,37,104,.85);
  /* signals — semantic only, tonal by default */
  --g-orange:#ff6500;  --g-focus:#ffb067;  --g-green:#4ee3a3;  --g-amber:#ffb703;  --g-red:#ff6b6b;
  /* motion & glass */
  --ease:cubic-bezier(.2,.8,.2,1);  --dur-s:160ms;  --dur-m:320ms;
  --g-blur:12px;
}
```

**App background** (every full-screen Globe surface):
```css
background:
  radial-gradient(120% 90% at 82% -10%, rgba(3,117,219,.2), transparent 46%),
  linear-gradient(160deg, #071647, #030c26 72%);
```

**Rules of use**
- **One accent at a time** = azure. Orange (`--g-orange`/`--g-focus`) is the *spark* — reserve for the brand mark, a single highlight, the burner flame; never a second UI accent.
- Feedback is **tonal**: soft translucent surface + AA ink (`success` green, `warning` amber, `error` red, `info` azure). Never saturated solid fills for status.
- Text: `--g-ink` for primary on dark, `--g-muted` secondary, `--g-faint` tertiary/labels. `--g-paper` only for the highest-contrast primary button.

---

## 2. Type

- **Display / headings:** Poppins (`--font-display`), weight 700, letter-spacing −.02/−.03em. Used for page/section titles, hero numbers, brand.
- **Everything else:** the sans/body stack (`--font-sans`) — body, labels, chips, buttons.
- **Numbers, IDs, KPIs, credits, seeds, %:** the numeric/tabular font (`--font-numeric`), `font-feature-settings:'tnum' 1`. Never mix numerals into Poppins for data.
- Sizes: labels 10–11px uppercase `letter-spacing:.1–.14em`; body 13–15px; section titles 19–26px; hero display `clamp(20px,2–4vw,42px)`.
- **Copy:** sentence case, LatAm-neutral Spanish, `tú`. Buttons = verb + object ("Solicitar estimate", "Aprobar candidate"). Data always carries context, never a naked number.

---

## 3. Shape, elevation, spacing

- **Radius:** chips/pills `999px`; controls & small cards `8–12px`; large panels/overlays `14–18px`; thumbnails `8–9px`.
- **Borders:** 1px `--g-line` hairline (dividers, cards); `--g-line2` for raised/interactive edges; accent border for selected.
- **Surfaces:** cards = `--g-surface2` + 1px `--g-line`. Floating/raised = `--g-raised`. Glass chrome (header, rail, dock) = `rgba(5,13,40,.55)` + `backdrop-filter:blur(var(--g-blur))`.
- **Elevation:** soft, dark, single-layer — e.g. `0 8px 20px -9px rgba(0,0,0,.55)` (hover), `0 30px 80px -20px rgba(0,0,0,.7)` (overlay). Selected/active adds an azure glow `0 10px 30px -10px rgba(77,184,255,.5)`.
- **Spacing:** 4px base; card padding 14–20px; gaps 8/12/16px.

---

## 4. Motion & micro-interactions

- **Everything clickable** gets uniform feedback (global rule, since styles are inline):
```css
.wb button, .wb [role="button"]{ transition:background-color 160ms var(--ease),border-color 160ms var(--ease),color 140ms,box-shadow 220ms var(--ease),transform 140ms var(--ease),filter 160ms; }
.wb button:not(:disabled):not([aria-disabled="true"]):hover{ filter:brightness(1.1) saturate(1.05); transform:translateY(-1px); box-shadow:0 8px 20px -9px rgba(0,0,0,.55); }
.wb button:not(:disabled):not([aria-disabled="true"]):active{ transform:translateY(0) scale(.972); filter:brightness(.96); box-shadow:none; transition-duration:80ms; }
```
- Durations: `--dur-s 160ms` state changes, `--dur-m 320ms` panels/crossfades. Easing `--ease` — never `ease-in-out`.
- Always honor `prefers-reduced-motion` (kill transitions + decorative loops).
- **Signature loader:** the Globe balloon (isotype) rising + "breathing" (translateY + scale, no rotation) with a titilating orange **burner** flame and an azure pulse halo. Use for any "generating/working" moment.

---

## 5. Brand assets

- Logo: `assets/globe-logo.svg` (white wordmark + orange spark). Isotype (balloon/orb): `assets/globe-isotipo.svg`.
- ⚠️ Fills live inline (`fill="#fff"` / `#ff6500`) — the SVGs render **white-on-dark**; don't rely on a `<style>` block (stripped when loaded as `<img>`).
- Icons: **Tabler webfont** only (`ti ti-*`), 2px outline. No emoji, no mixed icon sets.

---

## 6. Generative visual placeholders

The "AI output" look = layered radial-gradient blooms in `screen` blend over a diagonal base, + a faint SVG fractal-noise grain overlay + inset vignette. Keep a small palette set (azure/aurora-green/copper/prism-violet/graphite/solar) and reuse by index so a candidate and its refinements share a hue family. Real imagery drops into the same frames later.

---

## 7. Component patterns (the Globe kit)

- **Status chip:** pill, tonal bg + dot, `role="status"`. Tone map: neutral / info(azure) / warn(amber) / error(red) / success(green) / solid(green fill).
- **Model "house" chip:** monogram tile (house color) + model name (Poppins) + `v#` pill + readiness + capability chips. One per provider/model; cross-model swaps flagged.
- **Credits gauge:** conic-gradient donut + coin glyph + tabular amount + phase label; **phase-aware color** across the flow (estimado→reservado→consumiendo→consumido→liquidado; warn/error branches).
- **Stepper:** pill nav, numbered → check when done, azure ring on current. Steps adapt per context (e.g. skip a gate).
- **Context rail:** right-side accordion of governance sections (brief, direction, rights, route/version, credits, manifest); becomes a bottom drawer on mobile.
- **Overlays/dialogs:** glassy card — `linear-gradient(165deg,rgba(20,40,110,.92),rgba(9,20,60,.95))` + `blur(18px)` + top color glow + icon-tile header; scrim blurs the canvas.
- **Cards as buttons:** selectable tiles (candidates, territories, modes, houses) lift on hover, accent border + check when selected.
- **Toast:** bottom-center raised pill, `role="status"`, auto-dismiss.

---

## 8. Layout & product conventions

- **Shell:** glass **header** (brand + campaign switcher + operating-mode + status cluster + credits + actor) → **stepper** → **stage** (`minmax(0,1fr)` canvas + 376px rail) → **dock** (footer). Mobile: single column, canvas-first, rail→drawer, sticky critical band.
- **The generated visual is the hero** — canvas is the largest, calmest area; chrome recedes.
- **Governance is ambient, not loud:** rights/route/credits/manifest live in the rail and honest state chips — surfaced when they matter (before cost, on delivery), never blocking the creative view.
- **Honest states** the studio should model: empty → composer(brief) → direction(gate) → estimate → approval → running → candidates → delivery, plus recovery branches (estimate expired, blocked rights/budget, provider failed, revoked).
- **Operating models** reshape the flow (who governs the gate): Managed (Efeonce full-service, approval auto/omitted) · Co-creación (client+agency, real approval) · DIY (self-serve, self-approval).

---

## 9. Authoring notes (for the DC build)

- Single Design Component, **inline styles only**; the one legal global `<style>` = tokens `:root`, `@font-face`/`@keyframes`, body resets, and the clickable-hover rules in §4.
- Load AXIS tokens (`_ds/…/tokens/*.css`) + Tabler webfont in `<helmet>`; layer the Globe `--g-*` tokens on top.
- Never regex-strip inline `transition:` across the file — it eats past JS object braces. Edit styles per-declaration.
- Keep candidate/lineage/recipe state in the logic class; expose flat values + handlers via `renderVals()`.
