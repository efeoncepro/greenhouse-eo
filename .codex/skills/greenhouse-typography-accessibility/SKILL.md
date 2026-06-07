---
name: greenhouse-typography-accessibility
description: Audit, design, and implement Greenhouse typography decisions across Poppins/Geist, font weights, MUI Typography variants, type contrast, accessible spacing, readable hierarchy, and token governance. Use when UI text feels too bold/heavy/flat, when choosing between Typography variants, when changing typography tokens, when reviewing title/label/body/KPI hierarchy, or when aligning Figma/AXIS typography with the Greenhouse runtime.
---

# Greenhouse Typography Accessibility

Use this skill when the work is specifically about type: visual hierarchy,
font weights, Poppins vs Geist, MUI variants, contrast, line-height, text
spacing, truncation, dense tables, KPI numbers, chips/buttons/labels, PDF/email
type adapters, or an interface that "feels too bold" or typographically noisy.

This is not a general UI skill. It composes with:
- `design-system-governance` when adding/changing tokens or theme contracts.
- `greenhouse-ui-orchestrator` when the component/layout pattern is unresolved.
- `greenhouse-ux-content-accessibility` when wording or information hierarchy is weak.
- `greenhouse-ui-enterprise-review` for final screenshot-based UI quality gates.

## First Reads

Read only what the task needs:

- `DESIGN.md` section `Typography`
- `src/components/theme/typography-tokens.ts`
- `src/components/theme/typography-drift.test.ts`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `src/components/theme/mergedTheme.ts` when runtime variants are involved
- `src/lib/finance/pdf/pdf-typography.ts` and `src/lib/finance/pdf/register-fonts.ts` when PDF typography is involved
- `references/typography-research-and-runtime-map.md` when you need the deeper external research, source links, or full Poppins/Geist map

## Greenhouse Type Contract

Greenhouse uses exactly two active families:

- `Poppins`: controlled display only (`headlineDisplay`, `headlineLg`, `headlineMd`, `pageTitle`)
- `Geist`: everything else, including body copy, tables, forms, metadata, chips, buttons, IDs, KPI values, and numeric runs

Canonical weight roles:

- `400`: body and supporting text
- `600`: labels, titles, buttons, section headers
- `700`: reserved strong emphasis
- `800`: display/KPI emphasis
- `500`: loaded, but no semantic role; do not introduce it as a new tier without governance

Runtime source of truth:

- `typographyScale` owns family, size, weight, line-height, letter-spacing, and numeric features.
- `TYPOGRAPHY_VARIANT_BRIDGE` maps canonical tokens to MUI variants.
- `SECONDARY_VARIANT_TOKENS` owns shared values like `h6 -> labelMd` and `subtitle2 -> bodySm`.
- `controlText` owns Button/Chip/Tab control label sizing.

## Workflow

1. Identify the text job.
   - Display headline, page title, section title, body, label/control, metadata, numeric, KPI, chip, table, form, PDF, email, chart, or marketing hero.

2. Select the semantic token before touching CSS.
   - Prefer `<Typography variant='...' />` or a primitive's built-in type.
   - Do not choose a weight by "looks"; choose by job and density.
   - If the surface is an internal Design System/Figma lab, separate
     **specimen typography** used to mirror the canvas from product typography
     that other surfaces will consume.

3. Audit hierarchy.
   - At most one dominant display signal per local surface.
   - Repeated labels and table headers should usually be medium/semi-bold, not heavy.
   - Dense operational UI should rely on spacing, grouping, and color contrast before adding weight.
   - If everything is `600+`, nothing is emphasized.

4. Audit accessibility.
   - Normal text contrast must meet WCAG AA `4.5:1`; large text threshold is `3:1`.
   - Do not depend on weight alone to make low-contrast text readable.
   - Body/running text should preserve user scaling (`rem`) and survive text-spacing overrides.
   - Avoid fixed-height containers that clip when line-height, word spacing, or letter spacing is increased.

5. Audit family usage.
   - Poppins is for display/page title moments only.
   - Geist is the default for product UI, charts, controls, chips, numbers, tables, forms, PDFs body text, and email body text.
   - Never introduce monospace for IDs, money, or tables; use Geist + tabular numerals.

6. Change the smallest owner.
   - Consumer-level mismatch: swap variant/token.
   - Primitive-level repeated issue: fix the primitive.
   - Token-level issue: invoke `design-system-governance` and update SoT + runtime + docs + drift tests together.
   - Figma lab mismatch: document the exception locally, keep it route-local,
     and avoid exporting those specimen values as tokens.

7. Validate.
   - Focal lint/test for touched files.
   - `pnpm design:lint` if `DESIGN.md`, tokens, theme, or type docs changed.
   - `pnpm vitest run src/components/theme/typography-drift.test.ts` for token/theme/contract work.
   - GVC screenshot review for visible UI. Inspect desktop and mobile.

## Weight Triage

Use this quick map when a screen looks heavy:

- Hero/page title only: `Poppins 600-800`, depending on level.
- Section title/card title: usually `Geist 600`, not `700/800`.
- Column labels/table headers: `Geist 600` or existing table variant; avoid `800`.
- Row labels/repeated labels: `Geist 400-500 visual effect via token`, usually `400` or `600` only when it anchors a row.
- Buttons/chips/tabs: primitive/control text; do not inline weight.
- Metadata/helper text: `Geist 400`, color/opacity can separate it.
- KPI values: `Geist 800` + tabular numerals.
- Warning/error/success labels: state must include text/icon/semantics; do not rely on color or bold alone.

## Hard Rules

- Never inline `fontSize` on `<Typography>`; use a variant/token.
- Never use Poppins for body, forms, tables, chips, buttons, helper text, metadata, or dense UI.
- Never use `fontWeight: 800` for repeated labels, column headers, or whole sections.
- Never create a new typography role for a one-off visual tweak.
- Never add/change typography tokens without SoT + runtime + docs + drift-test parity.
- Never use color-only or weight-only state communication.
- Never assume Figma weights are directly correct for runtime density; reconcile with Greenhouse tokens and screenshot evidence.

## Design System Lab Exception

Internal `/admin/design-system/**` labs may use route-local specimen typography
to reproduce an AXIS/Figma canvas, especially when documenting a component sheet
rather than shipping product UI. This is allowed only when all are true:

- the route is internal and documented as a lab/reference surface
- the values do not escape into primitives, theme tokens, product views, or shared helpers
- the lab still applies hierarchy/accessibility review and GVC screenshot evidence
- any production primitive shown in the lab uses Greenhouse tokens internally

In audits, report these as "lab specimen values" rather than blockers unless
they leak into shared runtime or make the page unreadable.

## Output Contract

For audits:
- findings first, ordered by user impact
- file/line references when possible
- recommended token/variant/weight
- accessibility risk and validation needed

For implementation:
- explain which owner changed: consumer, primitive, token, or docs
- note any Poppins/Geist boundary decision
- include validation commands and screenshot/GVC evidence when UI changed
