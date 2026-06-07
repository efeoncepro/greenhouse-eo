---
name: greenhouse-typography-accessibility
description: Audit, design, and implement Greenhouse typography across Poppins/Geist, font weights & styles, MUI Typography variants, type scale, line-height/leading, line length (measure), letter-spacing/tracking, casing, numerals (tabular/lining/oldstyle/slashed-zero), optical sizing, variable-font axes, OpenType features, font pairing, fluid type, font-loading/CLS, multilingual/RTL/CJK, text contrast (WCAG 1.4.3/1.4.4/1.4.12 + APCA) and token governance. Use when UI text feels too bold/heavy/flat, when choosing between Typography variants, when changing typography tokens, when reviewing title/label/body/KPI hierarchy, or when aligning Figma/AXIS typography with the Greenhouse runtime. Codex mirror of the Claude `typography-design` skill (global craft + Greenhouse overlay) — keep them in sync.
---

# Greenhouse Typography Accessibility

Senior **typographer + type engineer** for Greenhouse (product UI, PDFs, email). Type carries ~90% of the interface's information and most of its perceived quality. This skill makes the concrete decisions ("which weight/variant/size/leading for THIS element, enough contrast?") and audits existing type for legibility, hierarchy, accessibility and craft. It is **opinionated** — opinions come from convergent practice at serious type-led products (Apple HIG, Material 3, IBM Carbon, GitHub Primer, USWDS, Stripe, Linear) plus the readability/accessibility research, not taste.

This is **not** a general UI skill. It composes with:
- `design-system-governance` — owns the *lifecycle* of a token (add/deprecate/drift, 3-layer parity). This skill decides *what the value should be*; governance ships it.
- `greenhouse-ui-orchestrator` / `greenhouse-product-ui-architect` — when the component/layout pattern is unresolved.
- `greenhouse-ux-content-accessibility` — owns the *words* (es-CL, microcopy); this owns the *shape* (size/weight/casing). Both run on any user-facing string.
- `greenhouse-ui-enterprise-review` — final GVC/screenshot quality gate.

**Claude parity:** mirrors `typography-design` (global) + its Greenhouse overlay. When you change one, update the other (`~/.claude/skills/typography-design/**` and `.claude/skills/typography-design/SKILL.md`).

## First reads (before deciding or auditing)

Read only what the task needs — but never set type blind:
- `DESIGN.md` §Typography (+ front-matter) — read first; emit a variant by name.
- `src/components/theme/typography-tokens.ts` — the SoT values.
- `src/components/theme/mergedTheme.ts` — runtime variant derivation.
- `src/components/theme/typography-drift.test.ts` — the CI parity gate.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3 + §15.1 — extended spec.
- `src/app/layout.tsx` — the weights that actually load (`next/font`).
- `src/lib/finance/pdf/register-fonts.ts` (+ `pdf-typography.ts`) — PDF families.
- `src/components/theme/chart-typography.ts` + `src/libs/styles/AppReactApexCharts*`/`AppRecharts*` — chart text from the SoT.
- `eslint-plugins/greenhouse/rules/no-fontsize-inline-typography.mjs` + `no-hardcoded-fontfamily.mjs` — mechanical bans.
- `references/typography-research-and-runtime-map.md` — deep external research, source links, full Poppins/Geist map, and the craft references (variable fonts, OpenType, measure/rhythm, fluid type, font loading, i18n).

---

## Greenhouse type contract (FIXED — do not re-decide)

Exactly **two active families**:
- **Poppins** — controlled display ONLY: `headlineDisplay`/`headlineLg`/`headlineMd`/`pageTitle` (= `h1`–`h4`). The ONLY way to get Poppins is `<Typography variant='h1'..'h4'>`.
- **Geist** — everything else: body, tables, forms, metadata, chips, buttons, IDs, KPI values, numeric runs, chart text, PDF/email body.

**Weight ladder (FIXED): 400 / 600 / 700 / 800.**
- `400` body & supporting text
- `600` labels, titles, buttons, section/card headers
- `700` reserved strong emphasis (h2, monoAmount)
- `800` display / KPI emphasis (h1, kpiValue)
- `500` is **loaded but has no semantic role — won't-do (TASK-1039)**; at 14px 400→500 is imperceptible and a 4th tier adds ambiguity. Do NOT introduce it.

**Numbers = Geist + `tabular-nums`** via `monoId` / `monoAmount` / `kpiValue`. **Never a monospace family** (Geist Mono / Menlo / Consolas / Courier). Numeric density comes from line-height (1.54) + letter-spacing, not a mono face.

**Runtime SoT:** `typographyScale` owns family/size/weight/line-height/letter-spacing/numeric features → `TYPOGRAPHY_VARIANT_BRIDGE` maps token↔MUI variant (1:1, as code) + `SECONDARY_VARIANT_TOKENS` (`h6→labelMd`, `subtitle2→bodySm`) + `controlText` (Button/Tab/Dialog sizing). **Runtime wins on conflict; docs follow.**

### The canonical scale (TASK-1038, approved 2026-06-06)
| MUI | contract | family | px | weight | line-height | use |
|---|---|---|---:|---:|---:|---|
| h1 | headline-display | Poppins | 32 | 800 | 1.25 | marketing hero |
| h2 | headline-lg | Poppins | 24 | 700 | 1.25 | marketing section |
| h3 | headline-md | Poppins | 20 | 600 | 1.25 | page identity (rare) |
| h4 | page-title | Poppins | 20 | 600 | 1.4 | product page title |
| h5 | section-title | Geist | 16 | 600 | 1.5 | section/card/drawer title |
| subtitle1 | subheader | Geist | 14 | 400 | 1.5 | card subheader / list primary |
| h6 | (= label-md) | Geist | 14 | 600 | 1.5 | inline bold label (prefer subtitle1) |
| button | label-md | Geist | 14 | 600 | 1.5 | control label |
| body1 | body-lg | Geist | 16 | 400 | 1.5 | readable body |
| body2 | body-md | Geist | 14 | 400 | 1.5 | dense UI / table / helper |
| caption | body-sm | Geist | 13 | 400 | 1.45 | metadata / timestamps (LS 0.03em) |
| subtitle2 | (= body-sm) | Geist | 13 | 400 | 1.45 | secondary subtitle (~267 consumers) |
| overline | overline | Geist | 12 | 600 | 1.167 | uppercase label (LS 0.08em, theme uppercases) |
| monoId | numeric-id | Geist+tnum | 14 | 600 | 1.54 | IDs/SKU (LS 0.01em) |
| monoAmount | numeric-amount | Geist+tnum | 13 | 700 | 1.54 | money/amounts |
| kpiValue | kpi-value | Geist+tnum | 28 | 800 | 1.05 | KPI hero number |

Control ramp: Button sm/md 14, **lg 16** · Tab 14 · Dialog title 16. **Invariant: page-title (20) ≥ section-title (16) — no inversion** (was inverted pre-TASK-1038; do not regress). `label-lg` (16/600) + `label-sm` (13/600) have no MUI variant — realized via component sizes.

---

## The 8 typographic decisions (make in order)

1. **Families & pairing** — Greenhouse is fixed: Poppins display (h1–h4) + Geist text. Never a third family, never Poppins outside h1–h4, never >2 families on a surface. (Craft: one-family-first; pair display+neutral-text or superfamilies; match x-height.)
2. **Weight** — cheapest hierarchy lever, semantic not decorative. Stay in {400,600,700,800}; never <400 for content; bold sparingly. If everything is ≥600, nothing is emphasized.
3. **Size & scale** — use the fixed scale; body ≥16px (`body1`)/14px dense (`body2`); sizes in `rem`; inputs ≥16px (iOS zoom). Fluid `clamp()` only for marketing — and only `rem+vw` with `max ≤ 2.5×min` (pure `vw` fails WCAG 1.4.4). Product UI = fixed scale + container queries.
4. **Line-height (leading)** — body 1.5; headings 1.1–1.3 (big type, less leading); long measures 1.6–1.7; small/numeric a touch more (1.45–1.54). Unitless only. Must survive user line-height 1.5 (WCAG 1.4.12).
5. **Measure (line length)** — 45–75 char (66 optimal), cap body in `ch` (`max-width: 66ch`); never >80.
6. **Contrast** — WCAG AA 4.5:1 normal / 3:1 large (≥24px, or ≥18.66px bold). Build hierarchy with the `theme.palette` text ramp (primary/secondary still ≥4.5:1), not sub-floor gray. Prefer solid ramp over opacity. Sanity-check with APCA (Lc≥75 body) but ship AA. Never color-only.
7. **Numerals** — tables/KPIs/money/IDs → `monoId`/`monoAmount`/`kpiValue` (tabular). Inline prose → proportional (default). Slashed-zero for IDs (not yet a token — route through governance to add it). Never monospace.
8. **Casing & tracking** — sentence case for headings/buttons/labels. ALL CAPS only via `overline` (theme uppercases + 0.08em tracking) — never for sentences (slows dyslexic readers 13–18%). Don't track lowercase body (hurts fluent reading).

---

## Workflow

1. **Identify the text job** — display headline · page title · section title · body · label/control · metadata · numeric · KPI · chip · table · form · PDF · email · chart · marketing hero.
2. **Select the semantic token before touching CSS** — `<Typography variant='...'>` or a primitive's built-in type. Choose by job + density, not "looks". In an internal Design-System/Figma lab, separate **specimen** typography from product typography.
3. **Audit hierarchy** — ≤1 dominant display signal per local surface; repeated labels/table headers usually 600, not heavy; dense UI leans on spacing/grouping/color before weight.
4. **Audit accessibility** — contrast 4.5:1 / 3:1; never weight-alone for low contrast; `rem` scaling; survive text-spacing overrides (1.4.12); no fixed-height clipping; inputs ≥16px.
5. **Audit family usage** — Poppins display only; Geist default; numbers tabular not mono.
6. **Change the smallest owner** — consumer (swap variant) → primitive (fix once) → token (invoke `design-system-governance`: SoT + runtime + DESIGN.md + V1 + drift tests together) → Figma lab (document local exception, don't export).
7. **Validate** — focal lint/test; `pnpm design:lint` if DESIGN.md/tokens/theme/type-docs changed; `pnpm vitest run src/components/theme/typography-drift.test.ts` for token/theme/contract work; GVC screenshot review (desktop + mobile) for visible UI.

## Weight triage (when a screen looks heavy)

- Hero/page title: `Poppins 600–800` by level.
- Section/card title: `Geist 600`, not 700/800.
- Column labels/table headers: `Geist 600` or the table variant; avoid 800.
- Repeated row labels: `Geist 400`, 600 only when it anchors a row.
- Buttons/chips/tabs: control text via primitive; don't inline weight.
- Metadata/helper: `Geist 400` + `text.secondary`.
- KPI values: `Geist 800` + tabular numerals.
- State labels (warn/error/success): text + icon + semantics, not color/weight alone.

## Charts, PDF, email (one SoT, three adapters)

- **Charts (43: Apex 33 + Recharts 10):** governed centrally by `AppReactApexCharts` + `AppRecharts` (CSS `!important` reading `theme.typography.{fontFamily,caption}`) → change the SoT, all propagate. **ECharts (canvas)** must consume `getChartTypographyFromTheme(theme)` in `option.textStyle`/`axisLabel`. Never inline chart fonts.
- **PDF:** `register-fonts.ts` registers each weight as its own family name (`Geist`, `Geist SemiBold`(600), `Geist Bold`, `Geist ExtraBold`(800), `Poppins`(600)…); react-pdf needs named families, not `fontWeight`. `pdf-typography.ts` maps roles → family names with `pt` sizes. Helvetica fallback if a TTF is missing.
- **Email:** web fonts unreliable (Outlook) — system-fallback stack, inline styles, design for the fallback; never depend on OpenType features. Coordinate with `greenhouse-email`.

## i18n posture (FIXED)

Latin-first (es-CL / en-US / pt) + **RTL-ready via CSS logical properties**; CJK **deferred** (no megafont). One semantic SoT; per-medium adapters (web variant / PDF named family / email inline+fallback) — mirrors the color SoT precedent (axisSemanticHex). When RTL ships: logical properties throughout, set `dir`, isolate LTR islands (IDs/URLs) with `<bdi>`, never letter-space Arabic. (Craft depth in the reference.)

## Hard rules (NUNCA)

- Never inline `fontSize`/`fontFamily` on text — use a variant/token (lints: `no-fontsize-inline-typography` warn on `<Typography>`, `no-hardcoded-fontfamily` error bans Inter/DM Sans/Geist Mono/`monospace`/raw Poppins-Geist literals).
- Never Poppins for body/forms/tables/chips/buttons/helper/metadata/dense UI (display h1–h4 only).
- Never monospace for IDs/money/tables — Geist + tabular numerals.
- Never `fontWeight: 800` for repeated labels, column headers, or whole sections.
- Never introduce a weight-500 role (won't-do); never DM Sans/Inter/a third family/a display tier without a real consumer.
- Never ALL CAPS except the `overline` variant.
- Never edit `src/@core/theme/*` (Vuexy core, read-only) — override only in `mergedTheme.ts`.
- Never add/change a token without SoT + runtime + DESIGN.md + V1 + drift-test parity in the same PR (or `typography-drift.test.ts` fails CI).
- Never break the page-title (20) ≥ section-title (16) invariant.
- Never color-only or weight-only state communication.
- Never assume Figma weights are runtime-correct; reconcile with tokens + screenshot evidence.
- Never pure `vw` font sizes (zoom); fluid `max` >2.5×`min`; `px` line-heights; body measure >80ch; faux bold/italic.

## Design System Lab exception

Internal `/admin/design-system/**` labs may use route-local **specimen** typography to reproduce an AXIS/Figma canvas, ONLY when: the route is internal/documented as a lab; the values never escape into primitives/theme tokens/product views/shared helpers; the lab still gets hierarchy/accessibility review + GVC evidence; any production primitive shown uses Greenhouse tokens internally. In audits, report these as "lab specimen values", not blockers, unless they leak into shared runtime or make the page unreadable.

## Output contract

**Audits:** findings first, ordered by user impact; file/line refs; recommended token/variant/weight; accessibility risk + validation needed.
**Implementation:** which owner changed (consumer/primitive/token/docs); any Poppins/Geist boundary decision; validation commands + screenshot/GVC evidence when UI changed.
