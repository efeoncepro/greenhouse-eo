---
name: typography-design-greenhouse-overlay
description: Greenhouse-specific pinned typography decisions that OVERRIDE the global typography-design skill defaults. Load this first whenever typography-design is invoked inside the greenhouse-eo repo. Pins the real families (Poppins display + Geist text), the actual loaded weights/styles, the SoT (typography-tokens.ts), the variant bridge, the drift-guard, the lint rules, charts/PDF/email adapters, and the hard "NUNCA" rules.
type: overlay
overrides: typography-design
---

# Typography Design — Greenhouse Overlay

This file **overrides** the global `typography-design` skill inside the `greenhouse-eo` repo. On any conflict, **this overlay wins**.

**Load order:** read global `typography-design/SKILL.md` (the craft + references) → then this overlay (the pins) → then apply.

## Why this overlay exists

Greenhouse is not greenfield. Typography is already a governed 3-surface system with a CI drift-guard. The global skill teaches *the craft* (weights, contrast, measure, OpenType, i18n); this overlay pins *the answers already decided here* so an agent never re-litigates the scale, picks a banned weight, or hardcodes a size. Two families are fixed: **Poppins** (display, h1–h4 + `surfaceHeroTitle` only) + **Geist** (everything else). Numbers use **Geist + `tabular-nums`** — never a monospace family.

## Canonical sources of truth (READ in this order)

| Surface | File | Authority |
|---|---|---|
| **Token SoT (values)** | `src/components/theme/typography-tokens.ts` | The numbers. Primitives → `typographyScale` → `TYPOGRAPHY_VARIANT_BRIDGE` + `SECONDARY_VARIANT_TOKENS` + `controlText`. |
| **Runtime** | `src/components/theme/mergedTheme.ts` | Derives every MUI variant from the SoT. **Runtime wins on conflict**, docs follow. |
| **Drift-guard** | `src/components/theme/typography-drift.test.ts` | CI gate: runtime ≡ SoT ≡ DESIGN.md (front-matter + §Typography prose) ≡ V1 §15.1. |
| **Agent contract** | `DESIGN.md` §Typography + front-matter | What you read first to emit a variant by name. |
| **Extended spec** | `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 + §15.1 | Type scale table, decision matrix, prohibitions, naming map. |
| **Web load** | `src/app/layout.tsx` | `next/font/google` — the weights that actually exist at runtime. |
| **PDF** | `src/lib/finance/pdf/register-fonts.ts` | Static cuts registered per family-name. |
| **Charts** | `src/components/theme/chart-typography.ts` + `src/libs/styles/AppReactApexCharts*` + `AppRecharts*` | Chart text derives from the SoT. |
| **Lint** | `eslint-plugins/greenhouse/rules/no-fontsize-inline-typography.mjs` + `no-hardcoded-fontfamily.mjs` | Mechanical enforcement. |
| **Brand** | `src/config/efeonce-brand.ts` (slogan) | Poppins 800/900 + italics, `#848484`. |
| **Living museum (internal)** | `/admin/design-system/typography` + `/typography/mockup` | Visual reference, NOT the rules. |

CLAUDE.md "Typography System (TASK-1036/1038)" is the short pointer to all of the above.

## The two families (FIXED — do not re-decide)

| Role | Family | CSS var | Loaded web weights | When |
|---|---|---|---|---|
| **Display** | **Poppins** | `var(--font-poppins)` | 600, 700, 800 (web); +900 + italics exist for slogan/PDF | **h1–h4 + surfaceHeroTitle ONLY** (auto-applied by variant) |
| **Product UI / text** | **Geist Sans** | `var(--font-geist)` | 400, 500, 600, 700, 800 | everything else |
| **Numbers / IDs / amounts** | Geist + `tabular-nums` | `var(--font-geist)` | (same Geist) | numeric columns, totals, IDs, KPIs |

To get Poppins on a surface: use `variant='h1'|'h2'|'h3'|'h4'` or `variant='surfaceHeroTitle'`. **There is no other way and no other place** Poppins is allowed in product UI. h5/h6/subtitle/body/caption/button/overline/mono*/kpiValue all render Geist.

### Font files that ACTUALLY exist (`src/assets/fonts/`)
- **Geist:** Regular(400) · Medium(500) · SemiBold(600) · Bold(700) · ExtraBold(800).
- **Poppins:** Medium(500) · SemiBold(600) · Bold(700) · ExtraBold(800) · ExtraBoldItalic(800i) · Black(900) · BlackItalic(900i). *(ExtraBold/Black + italics are slogan-only.)*
- **DM Sans:** Regular/Medium/Bold — **DEPRECATED** (TASK-566 pivot). Kept registered in PDF only until TASK-862 Slice D. Never use in new code.

You can only style a weight that is loaded. **Geist 500 is loaded but the product scale doesn't use it** (see weight ladder).

## The weight ladder (FIXED)

Product scale uses **400 / 600 / 700 / 800**. **Weight 500 is reserved, not used** — evaluated and **won't-do** (TASK-1039): at 14px, 400→500 is imperceptible and a 4th tier adds ambiguity. Do NOT introduce a 500-weight role.

| Weight | Use |
|---|---|
| 400 regular | body1/body2/caption/subtitle1 (subheader) |
| 600 semibold | h3/h4 (page-title), h5 (section-title), h6, button/label-md, overline, monoId |
| 700 bold | h2, monoAmount |
| 800 extrabold | h1 (headline-display), kpiValue |

## The canonical scale (FIXED — TASK-1038 redesign, approved 2026-06-06)

| MUI variant | Contract name | Family | rem | px | weight | line-height | Canonical use |
|---|---|---|---|---|---|---|---|
| h1 | headline-display | Poppins | 2 | 32 | 800 | 1.25 | marketing hero |
| h2 | headline-lg | Poppins | 1.5 | 24 | 700 | 1.25 | marketing section |
| h3 | headline-md | Poppins | 1.25 | 20 | 600 | 1.25 | page identity (rare) |
| h4 | page-title | Poppins | 1.25 | 20 | 600 | 1.4 | **product page title** |
| surfaceHeroTitle | surface-hero-title | Poppins | 2.125 / 1.75 mobile | 34 / 28 mobile | 600 | 1.15 | primary full-page/workbench title only |
| h5 | section-title | Geist | 1 | 16 | 600 | 1.5 | **section header in card** |
| subtitle1 | subheader | Geist | 0.875 | 14 | 400 | 1.5 | card subheader / list primary |
| h6 | (= label-md) | Geist | 0.875 | 14 | 600 | 1.5 | inline bold label (prefer subtitle1) |
| button | label-md | Geist | 0.875 | 14 | 600 | 1.5 | control label |
| body1 | body-lg | Geist | 1 | 16 | 400 | 1.5 | primary readable copy |
| body2 | body-md | Geist | 0.875 | 14 | 400 | 1.5 | dense UI / tables / helpers |
| caption | body-sm | Geist | 0.8125 | 13 | 400 | 1.45 | metadata / timestamps (LS 0.03em) |
| subtitle2 | (= body-sm) | Geist | 0.8125 | 13 | 400 | 1.45 | secondary subtitle (~267 consumers) |
| overline | overline | Geist | 0.75 | 12 | 600 | 1.167 | uppercase labels (SUBTOTAL/TOTAL/STATUS, LS 0.08em, uppercased by theme) |
| monoId | numeric-id | Geist+tnum | 0.875 | 14 | 600 | 1.54 | IDs/SKU (LS 0.01em) |
| monoAmount | numeric-amount | Geist+tnum | 0.8125 | 13 | 700 | 1.54 | amounts |
| kpiValue | kpi-value | Geist+tnum | 1.75 | 28 | 800 | 1.05 | KPI principal metric |

Control ramp (component overrides, `controlText`): Button sm/md = 14, **lg = 16** · Tab = 14 · Dialog title = section-title (16). No-inversion invariant: **page-title (20) ≥ section-title (16)** — was inverted pre-TASK-1038, do not regress.

Labels with no MUI variant: `label-lg` (16/600 = controlText.lg) and `label-sm` (13/600) — realized via component sizes, not a `<Typography variant>`.

## Hard rules (NUNCA) — these override the global skill's generic advice

- **NUNCA `fontSize` inline** on text — use a variant/token. Lint `greenhouse/no-fontsize-inline-typography` (warn, scoped to `<Typography>`/`<CustomTypography>`) catches it. If a size is missing, add it to `typographyScale`, don't inline.
- **NUNCA hardcode `fontFamily`** — Poppins auto-applies via h1–h4 + `surfaceHeroTitle`; Geist is the default (redundant override). Lint `greenhouse/no-hardcoded-fontfamily` (error) bans Inter, DM Sans, Geist Mono, `monospace`, and raw Poppins/Geist literals.
- **NUNCA use `surfaceHeroTitle` as a general big heading** — it is only for primary full-page/workbench surface titles or primary identity headers; maximum one per surface; never cards, tables, lists, drawers, modals, dashboards, repeated rows, or marketing heroes. Dense/product-detail page titles remain `h4` / `page-title`.
- **NUNCA monospace / Geist Mono / Menlo / Consolas / Courier** for numbers — use `variant='monoId'|'monoAmount'|'kpiValue'` (Geist + `tabular-nums`). Numeric density comes from line-height (1.54) + letter-spacing, not a mono face.
- **NUNCA edit `src/@core/theme/*`** (Vuexy core, read-only). Override only in `mergedTheme.ts`.
- **NUNCA add a token without a consumer** (orphan = drift). And **NUNCA add/change a value in one surface only** — move SoT + mergedTheme + DESIGN.md (front-matter + prose) + V1 (§3.2/§15.1) + drift-guard **together in the same PR**, or `typography-drift.test.ts` fails CI.
- **NUNCA introduce a weight-500 role** (won't-do TASK-1039). **NUNCA DM Sans / Inter / a third family / a display tier without a real consumer.**
- **NUNCA ALL CAPS** except the `overline` variant (theme uppercases it + adds 0.08em tracking).
- **NUNCA put chart text `fontSize`/`fontFamily` inline** — the Apex/Recharts wrappers govern it from the SoT (`theme.typography.caption` + `fontFamily`, `!important`). For **ECharts (canvas)** CSS doesn't reach: consume `getChartTypographyFromTheme(theme)` in `option.textStyle`/`axisLabel`.

## Charts, PDF, email adapters (one SoT, three media)

- **Charts (43: Apex 33 + Recharts 10):** governed centrally by `AppReactApexCharts` + `AppRecharts` (CSS `!important` reading `theme.typography.{fontFamily,caption}`) → change the SoT, all 43 propagate. ECharts (canvas) must use `getChartTypographyFromTheme`. Coordinate with **dataviz-design** overlay for axis/legend sizing.
- **PDF:** `register-fonts.ts` registers each weight as its own family name (`Geist`, `Geist SemiBold`(600), `Geist Bold`, `Geist ExtraBold`(800), `Poppins`(600)…). react-pdf needs named families, not `fontWeight`. SemiBold/ExtraBold added TASK-1040 to cover section-titles + KPI in PDFs. Helvetica fallback if a TTF is missing.
- **Email:** web fonts unreliable (Outlook) — system fallback stack, inline. Coordinate with **greenhouse-email**.

## Numerals — Greenhouse mapping

- IDs (EO-XXX-XXXX, SKU, account numbers) → `variant='monoId'`.
- Money / amounts in tables/cells → `variant='monoAmount'`.
- KPI hero number → `variant='kpiValue'`.
- All three = Geist + `font-variant-numeric: tabular-nums` (pinned in the SoT, verified by drift-guard). Slashed-zero is not currently a token — if an ID surface needs 0-vs-O disambiguation, raise it through **design-system-governance** (add to the SoT + V1 + drift-guard), don't inline a feature.

## i18n posture (FIXED)

Latin-first (es-CL / en-US / pt) + **RTL-ready via CSS logical properties**; CJK **deferred** (no megafont). One semantic SoT; per-medium adapters (web variant / PDF named family / email inline+fallback) — espeja el precedente del color SoT (axisSemanticHex). Tipo **fijo en producto**; `clamp()` solo para marketing.

## Synergy — who to invoke with this overlay

- **design-system-governance** — owns the *lifecycle*: any token add/deprecate/value-change goes through it (3-surface parity + `pnpm design:lint` + drift-guard). This overlay tells you *what the value should be*; governance ships it.
- **modern-ui (Greenhouse overlay)** — the typographic layer of a component sits inside its broader Vuexy/MUI pattern decisions.
- **a11y-architect (Greenhouse overlay)** — text contrast vs `theme.palette` ramp, resize/text-spacing readiness.
- **dataviz-design (Greenhouse overlay)** — chart label/axis/legend sizing from the SoT.
- **forms-ux (Greenhouse overlay)** — input/label/helper variants; 16px-min inputs.
- **greenhouse-ux-writing** — owns the *words* (es-CL tuteo, `src/lib/copy/*`); this overlay owns the *shape*. Both run on any user-facing string.
- **greenhouse-ux / greenhouse-product-ui-architect** — verify the result in the GVC loop (`pnpm fe:capture`) per the CLAUDE.md UI hook.

## Audit pass (Greenhouse lens)
1. Every text element a `<Typography variant>` / token — zero inline `fontSize`/`fontFamily`? (lint green)
2. Poppins only via h1–h4 + surfaceHeroTitle; everything else Geist?
3. Numbers via monoId/monoAmount/kpiValue (tabular-nums), no monospace?
4. No weight-500 role; weights in {400,600,700,800}?
5. Page-title (20) ≥ section-title (16) — no inversion?
6. Contrast vs `theme.palette` ramp ≥ 4.5:1 (3:1 large); not color-only?
7. If a value changed: SoT + mergedTheme + DESIGN.md + V1 + drift-guard moved together?
8. Charts read SoT (no inline chart fonts; ECharts uses the helper)?
9. Verified in GVC capture (UI hook)?
