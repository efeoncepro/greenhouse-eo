# Typography Research And Runtime Map

Backs the `greenhouse-typography-accessibility` skill. Load when you need deeper justification, source links, the full Poppins/Geist runtime map, or the craft depth (weights, contrast/APCA, variable fonts & OpenType, scale/rhythm/measure, fluid type, font loading, i18n). This is the Codex mirror of the Claude `typography-design` skill's 5 reference files — keep in sync.

## External research summary (sources)

- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/ ; SC 1.4.3 Contrast (Minimum) https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html ; SC 1.4.12 Text Spacing https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html ; SC 1.4.4 Resize text.
- APCA (WCAG 3 forward-look) — https://www.accessibilitychecker.org/blog/apca-advanced-perceptual-contrast-algorithm/
- MDN — OpenType features https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_fonts/OpenType_fonts_guide ; text-wrap https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap ; font-optical-sizing https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-optical-sizing
- web.dev — variable fonts https://web.dev/articles/variable-fonts ; fluid type https://web.dev/articles/baseline-in-action-fluid-type
- Google Fonts Knowledge — opsz https://fonts.google.com/knowledge/glossary/optical_size_axis ; OpenType on the web https://fonts.google.com/knowledge/using_type/implementing_open_type_features_on_the_web
- Design systems — USWDS Typography https://designsystem.digital.gov/components/typography/ ; Material 3 type roles ; IBM Carbon Typography https://carbondesignsystem.com/elements/typography/overview/ ; Apple HIG Typography (JS-gated, secondary).
- Readability — UXPin optimal line length (50–75ch, 66) https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/
- i18n — Smashing "Integrating Localization Into Design Systems" https://www.smashingmagazine.com/2025/05/integrating-localization-into-design-systems/ ; Typotheque CJK https://www.typotheque.com/articles/typesetting-cjk-text
- Dyslexia/casing — Rello & Baeza-Yates, "The Effect of Font Type on Screen Readability" (ACM TACCESS) https://dl.acm.org/doi/10.1145/2897736 ; BOIA all-caps headings.
- iOS input zoom — CSS-Tricks "16px or larger prevents iOS form zoom" https://css-tricks.com/16px-or-larger-text-prevents-ios-form-zoom/

Key conclusions:
1. Typography is a **token system**, not isolated CSS (Material/Carbon/USWDS define roles = family + size + line-height + weight). Greenhouse mirrors this in `typographyScale`.
2. Product systems separate **expressive/display** from **productive/task** type. Maps to Greenhouse: Poppins = expressive (display); Geist = productive (task UI).
3. **Body ≥16px** effective; smaller only for captions/footnotes/tables/specialized UI.
4. **WCAG contrast is the floor**: 4.5:1 normal / 3:1 large. Large type changes the threshold, not the need.
5. **Weight ≠ contrast**: thin/low-contrast text renders poorly (smoothing reduces apparent stroke); use contrast-safe color first, then weight.
6. **Text-spacing resilience (1.4.12)**: no loss when users force line-height 1.5, paragraph 2×, letter 0.12em, word 0.16em.
7. Real systems use a **reduced set of roles** (Material defines 15, ships fewer) — supports Greenhouse's narrow semantic scale.
8. **Don't make every repeated label heavy** — display/title/body/label roles exist to create local hierarchy; all-700/800 collapses scan.

---

## Craft reference (the global `typography-design` depth, consolidated)

### Weights, styles & pairing
- CSS numeric ↔ name: 100 Thin · 200 ExtraLight · 300 Light · **400 Regular** · 500 Medium · **600 SemiBold** · **700 Bold** · **800 ExtraBold** · 900 Black. Ship **3–4 weights, not 9**; pick steps that *read* distinct (e.g. 400/600/800). Test two candidates side-by-side at real size — can't tell them apart ⇒ one too many.
- **Never <400 for content/small text** (less ink, worse perception/small-size/low-DPI; WCAG large-bold threshold needs ≥700). Heavier strokes tolerate lower contrast; light + low contrast = double failure.
- **True italic** (drawn) vs **oblique** (`slnt`); **faux** italic/bold (browser-synthesized) is banned — load the real cut/axis or `font-synthesis: none`. Italic rare in product UI.
- **Pairing:** one-family-first; add a 2nd only for a *role* (display + neutral text). Safe = superfamily (shared metrics) or display+text with matched **x-height** (the #1 "feels off"). Two near-identical sans = looks like a bug. Ceiling: 2 families/surface.
- Hierarchy = contrast between levels (size > weight > color ramp), not absolute heaviness. A 5th weight / 3rd family / color-only emphasis are *false* hierarchy.

### Contrast & accessibility
- **1.4.3 AA:** 4.5:1 normal · 3:1 large (≥18pt/24px, or ≥14pt/18.66px **bold**); AAA 7:1 / 4.5:1. Placeholder text counts. Hierarchy via a **3-step text ramp** (primary ~12–16:1, secondary still ≥4.5:1, disabled = only sub-floor allowed). Prefer **solid ramp over `opacity`/alpha**.
- **1.4.4 Resize:** usable at 200%; size in `rem`/`em`; never `user-scalable=no`; fluid `max ≤ 2.5×min`; `clamp` uses `rem+vw` (pure `vw` fails).
- **1.4.12 Text spacing:** survive line-height 1.5 / paragraph 2× / letter 0.12em / word 0.16em — no clipping; use `min-height`+padding, avoid `overflow:hidden` on text.
- **APCA (WCAG 3 preview):** perception-based, accounts for size+weight; output **Lc** ~0–106. Targets: body ~16/400 **Lc≥75** (≥90 ideal); larger/heavier **≥60**; big headings **≥45**. Ship AA in 2026; treat a bad APCA score as a real smell (esp. thin weights + dark mode).
- **Dark mode:** off-white (~#E6–#F0) not pure #FFF (halation); elevated surfaces not pure black; type reads heavier on dark (slightly reduce weight / add tracking); re-verify the whole ramp; set `-webkit-font-smoothing` per scheme and re-check contrast (it lightens type).
- **Casing & cognition:** sentence case default; **ALL CAPS slows dyslexic readers ~13–18%** (removes word-shape) — caps only for short tracked overlines (`letter-spacing 0.04–0.08em`); use `text-transform`, keep source sentence-case. **Don't track lowercase body** (wider tracking helps single-word recognition but *reduces* fluent reading speed). "Dyslexia fonts" have weak evidence — what helps: clean sans, roman not italic, good spacing, ≥16px, no all-caps, no full justification, and not fighting the user's own settings.

### Font technology
- **Variable axes:** `wght`→`font-weight`; `wdth`→`font-width`/`font-stretch`; `opsz`→`font-optical-sizing: auto`; `ital`→`font-style: italic`; `slnt`→`font-style: oblique Ndeg`; `GRAD`/custom→`font-variation-settings`. Prefer the **standard property** for registered axes; `font-variation-settings` is all-or-nothing (resets unlisted axes, poor inherit/animate) — reserve for custom axes.
- **Optical sizing:** default `font-optical-sizing: auto` (browser maps `opsz` to rendered size: thicker/open at small, delicate/high-contrast at large). One variable family then serves 12px captions and 48px heroes well.
- **Static vs variable:** variable when ≥3 weights/any axis (one file, `opsz` free); static cuts when 2–3 fixed weights or the engine (some PDF renderers) lacks variable. Either way the *semantic* weight set stays small.
- **OpenType — prefer high-level `font-variant-*`** (composes; doesn't clobber) over `font-feature-settings` (single replacing property). Numerals: `tabular-nums` (align/tables/KPIs/money), `proportional-nums` (prose), `lining-nums` (UI/tables), `oldstyle-nums` (editorial body), `slashed-zero` (IDs), `diagonal-fractions`, `ordinal`. Text: `font-kerning`, `font-variant-ligatures: common-ligatures|contextual` (don't disable in body), `font-variant-caps: small-caps` (real, not shrunk caps), `font-variant-position: super|sub`, stylistic sets `ss01…` (pin the brand one), `locl` (auto via `lang`). A feature only exists if the font ships it — verify.
- **Rendering:** `-webkit-font-smoothing: antialiased` (macOS/iOS only, lightens type — re-check contrast); `text-rendering: optimizeLegibility` **headings only** (slow on long text); `font-synthesis: none` to forbid faux.
- **Loading / CLS:** `font-display: swap` (FOUT not FOIT; `fallback`/`optional` on poor nets/decorative); preload only the 1–2 above-fold fonts (`<link rel=preload as=font type=font/woff2 crossorigin>`); **subset** + `unicode-range`; kill swap-jump with fallback metrics (`size-adjust`/`ascent-override`/`descent-override`/`line-gap-override`) — **`next/font` does this automatically** (≈0 CLS); self-host; `woff2` only; one variable file often beats 3–4 static.

### Scale, rhythm, measure, wrapping
- **Scale = base × ratio^n.** Product UI 1.125–1.2 (Major Second/Minor Third); marketing 1.25–1.333; expressive ≥1.414. Pick ONE ratio; ~6–8 live sizes (not 15); trim orphans; round to whole px.
- **Fluid `clamp(min, rem+vw, max)`** — never pure `vw`; `max ≤ 2.5×min`; min/max in `rem`. Marketing/headings only; product UI = fixed scale + container queries (`cqi`).
- **Line-height matrix:** body 1.5 · long measure (>75ch) 1.6–1.7 · small/captions 1.45 · section heading 1.3–1.4 · page-title/h2 1.2–1.25 · hero 1.05–1.2 · KPI 1.0–1.1 · numeric rows 1.45–1.55. Inverse with size, direct with measure, **unitless** always.
- **Measure:** 45–75ch (66 optimal), cap in `ch`; never >80.
- **Vertical rhythm:** space-after (not before); paragraph ≈0.75–1× leading (survive forced 2×); headings more space above than below; group label+value tight, separate groups generously.
- **Wrapping:** `text-wrap: balance` on headings/short blocks (≤~6 lines); `text-wrap: pretty` on body paragraphs (kills orphans; not Firefox yet — progressive); `hyphens: auto` (with `lang`) for narrow/justified; avoid full justification in UI (rivers hurt readability/dyslexia) — left-align ragged-right (LTR); `hanging-punctuation` (Safari) progressive nicety; `overflow-wrap`/`word-break` only for unbreakable strings (URLs/IDs).

### Multilingual / RTL / CJK
- **Fallback chains on purpose**: brand Latin → pan-script (Noto) → per-OS CJK system fonts (Hiragino/Yu Gothic/YaHei/PingFang/Malgun) → `system-ui`. Use `unicode-range` so Latin users don't fetch CJK. **Weight-match across scripts** (#1 multilingual "feels off").
- **CJK:** no word spaces; **larger line-height (~1.7–2.0)**; set `lang` (zh/ja/ko glyph variants, breaking, quotes); no faux-bold; tune mixed Latin x-height.
- **RTL:** CSS **logical properties everywhere** (`margin-inline-start`, `padding-inline`, `inset-inline`, `text-align: start/end`); set `dir="rtl"`; isolate LTR islands (URLs/codes/IDs/numerals) with `<bdi>`/`unicode-bidi: isolate`; Arabic needs more line-height + proper shaping and **must NOT be letter-spaced**; mirror directional icons, not logos/media-controls.
- **Latin-first + RTL-ready (Greenhouse default):** author with logical properties day one; CJK deferred; locale switches font stack + line-height token, not the scale.
- **Localization realities:** +30–40% text expansion (flex labels, never fixed-to-English); full strings (no concatenation); vertical headroom for tall diacritics (Vietnamese/Arabic/Devanagari).

---

## Greenhouse runtime map

Source of truth: `src/components/theme/typography-tokens.ts`.

**Families:** `fontFamilies.display` = Poppins stack; `fontFamilies.text` = Geist stack.

**Weights:** regular 400 · medium 500 (loaded, **no semantic role**) · semibold 600 · bold 700 · extrabold 800.

**Font files that exist (`src/assets/fonts/`):**
- Geist: Regular(400) · Medium(500) · SemiBold(600) · Bold(700) · ExtraBold(800).
- Poppins: Medium(500) · SemiBold(600) · Bold(700) · ExtraBold(800) · ExtraBoldItalic(800i) · Black(900) · BlackItalic(900i). *(ExtraBold/Black + italics are slogan-only.)*
- DM Sans: Regular/Medium/Bold — **DEPRECATED** (TASK-566); kept registered in PDF only until TASK-862 Slice D; never in new code.

**Web load (`src/app/layout.tsx`, next/font):** Geist 400/500/600/700/800 + Poppins 600/700/800, `display: swap`, CSS vars `--font-geist` / `--font-poppins`, auto `size-adjust` (CLS≈0).

**Font sizes (primitives):** 5xl 32 · 4xl 28 · 3xl 24 · 2xl 20 · xl 18 *(orphan primitive)* · lg 16 · md 15 *(orphan primitive)* · sm 14 · xs 13 · 2xs 12. The **live** sizes are 12/13/14/16/20/24/28/32 (no 15/18) — the `typographyScale` owns them, drift-guard validates.

**Live scale tokens:**

| Token | MUI/runtime | Family | Size | Weight | Use |
|---|---|---|---:|---:|---|
| `headlineDisplay` | `h1` | Poppins | 32 | 800 | top display / hero |
| `headlineLg` | `h2` | Poppins | 24 | 700 | large display heading |
| `headlineMd` | `h3` | Poppins | 20 | 600 | medium display heading (rare) |
| `pageTitle` | `h4` | Poppins | 20 | 600 | product page title |
| `sectionTitle` | `h5` | Geist | 16 | 600 | section/card/drawer title |
| `subheader` | `subtitle1` | Geist | 14 | 400 | list/card subheader |
| `labelLg` | control token | Geist | 16 | 600 | large control label |
| `labelMd` | `button` | Geist | 14 | 600 | button/tab/control label |
| `labelSm` | control token | Geist | 13 | 600 | small label |
| `bodyLg` | `body1` | Geist | 16 | 400 | readable body |
| `bodyMd` | `body2` | Geist | 14 | 400 | dense product body/table/helper |
| `bodySm` | `caption`/`subtitle2` | Geist | 13 | 400 | metadata/timestamps (LS 0.03em) |
| `overline` | `overline` | Geist | 12 | 600 | uppercase compact label (LS 0.08em) |
| `numericId` | `monoId` | Geist+tnum | 14 | 600 | IDs (LS 0.01em) |
| `numericAmount` | `monoAmount` | Geist+tnum | 13 | 700 | money/amounts |
| `kpiValue` | `kpiValue` | Geist+tnum | 28 | 800 | KPI hero numbers |

**Secondary variants:** `h6` reuses `labelMd`; `subtitle2` reuses `bodySm` (~267 consumers). **Control text:** sm 14 · md 14 · lg 16. **Invariant:** page-title (20) ≥ section-title (16).

**Line-heights (calibrated, drift-pinned):** display 1.05 · heading 1.25 · pageTitle 1.4 · metadata 1.45 · body 1.5 · numericDense 1.54.

**PDF (`register-fonts.ts`):** Geist `Geist`/`Geist Medium`/`Geist SemiBold`/`Geist Bold`/`Geist ExtraBold` ; Poppins `Poppins Medium`/`Poppins`(SemiBold)/`Poppins Bold`/`Poppins ExtraBold`/`Poppins ExtraBold Italic`/`Poppins Black`/`Poppins Black Italic` ; DM Sans deprecated-compat. `pdf-typography.ts` maps roles → registered family names, deriving family/weight from the web SoT but with `pt` sizes. Helvetica fallback if a TTF is missing.

**Charts (TASK-1041):** 43 charts (Apex 33 + Recharts 10) governed by `AppReactApexCharts` + `AppRecharts` (CSS `!important` reading `theme.typography.{fontFamily,caption}`). ECharts (canvas, future high-impact dashboards) must consume `getChartTypographyFromTheme(theme)` in `option.textStyle`/`axisLabel`.

**Lint:** `greenhouse/no-fontsize-inline-typography` (warn, scoped to `<Typography>`/`<CustomTypography>`) + `greenhouse/no-hardcoded-fontfamily` (error: bans Inter, DM Sans, Geist Mono, `monospace`, raw Poppins/Geist literals).

**Slogan (`src/config/efeonce-brand.ts`):** "Empower your Growth" — Poppins ExtraBoldItalic(800i) "Empower" + ExtraBold(800) "your" + BlackItalic(900i) "Growth", color `#848484`; web `EfeonceSlogan.tsx`, PDF `efeonce-slogan-pdf.tsx`. Brand-zone only, never footer/product UI.

---

## Practical Greenhouse decisions

When a UI feels too bold: lower repeated labels before the primary title; section headers `Geist 600` (not 800); secondary metadata `bodySm/bodyMd` + `text.secondary`; spacing/grouping/borders/alignment before weight; keep `Geist 600` for controls (don't fight Button/Chip primitives).

When implementing Figma typography: treat Figma as **intent**, not runtime CSS; map text styles to Greenhouse roles; normalize bold-heavy Figma matrices to the Greenhouse density model + verify by screenshot; recreate text-in-images as semantic text; `/admin/design-system/**` labs may mirror AXIS specimen values route-locally (don't promote to tokens).

When checking contrast: verify pairs in light AND dark; normal 4.5:1, large 3:1; non-text states need non-color cues; APCA as a check, AA as the ship gate.

When changing tokens: invoke `design-system-governance`; update `typographyScale` + runtime theme + `DESIGN.md` (front-matter + §Typography) + V1 (§3.2/§15.1) + drift tests together; run `pnpm design:lint` + `pnpm vitest run src/components/theme/typography-drift.test.ts`.
