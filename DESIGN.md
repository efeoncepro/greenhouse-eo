---
version: alpha
name: Greenhouse EO Portal
designSystem: AXIS
description: Greenhouse design contract for coding agents. Derived from the live MUI theme and the canonical typography/token docs. El Design System de Efeonce se llama AXIS (multi-marca Efeonce/Kortex/Verk); fuente de verdad en Figma "Design System | Vuexy → AXIS" (fileKey yyMksCoijfMaIoYplXKZaR, read-only). Cuando este contrato y AXIS difieran, AXIS es el norte y el runtime converge hacia él.
colors:
  primary: "#0375DB"
  primary-light: "#3691E3"
  primary-dark: "#024C8F"
  primary-tonal: "#D7E9F9"
  secondary: "#138760"
  secondary-light: "#6EC207"
  secondary-dark: "#0C7250"
  info: "#1F6FD4"
  neutral: "#F8F7FA"
  surface: "#FFFFFF"
  surface-alt: "#FAFAFA"
  surface-dark: "#2F3349"
  background-dark: "#25293C"
  text-primary: "#2F2B3D"
  text-secondary: "#6B6876"
  text-disabled: "#A7A5AE"
  text-primary-dark: "#E1DEF5"
  text-secondary-dark: "#ACABC1"
  on-primary: "#FFFFFF"
  on-surface: "#2F2B3D"
  on-surface-dark: "#E1DEF5"
  success: "#157F47"
  warning: "#FFB703"
  error: "#DC2E39"
  border-subtle: "#DBDBDB"
typography:
  headline-display:
    fontFamily: Poppins
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.25
  headline-lg:
    fontFamily: Poppins
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
  headline-md:
    fontFamily: Poppins
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.25
  page-title:
    fontFamily: Poppins
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
  surface-hero-title:
    fontFamily: Poppins
    fontSize: 2.125rem
    mobileFontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.15
  section-title:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.5
  label-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
  body-lg:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.03em
  overline:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.167
    letterSpacing: 0.08em
  numeric-id:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.54
    letterSpacing: 0.01em
    fontFeature: '"tnum" 1'
  numeric-amount:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 700
    lineHeight: 1.54
    fontFeature: '"tnum" 1'
  kpi-value:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: 800
    lineHeight: 1.05
    fontFeature: '"tnum" 1'
rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 10px
  xxl: 12px
  display: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
components:
  app-shell:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text-primary}"
  app-shell-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.text-primary-dark}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
  button-primary-tonal:
    backgroundColor: "{colors.primary-tonal}"
    textColor: "{colors.primary-dark}"
  nav-active-indicator:
    backgroundColor: "{colors.primary-light}"
    height: 2px
  button-primary-disabled:
    textColor: "{colors.text-disabled}"
    typography: "{typography.label-md}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary-hover:
    backgroundColor: "{colors.secondary-dark}"
    textColor: "{colors.on-primary}"
  button-secondary-active:
    backgroundColor: "{colors.secondary-dark}"
    textColor: "{colors.on-primary}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 24px
  card-default-border:
    backgroundColor: "{colors.border-subtle}"
    height: 1px
  card-default-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-surface-dark}"
    rounded: "{rounded.md}"
    padding: 24px
  card-default-dark-secondary:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-secondary-dark}"
  card-floating:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 40px
    padding: 12px
  status-chip:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  status-chip-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
  chip-accent-secondary:
    backgroundColor: "{colors.secondary-light}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 8px
---

# Greenhouse Design Contract

## Overview

Greenhouse is a modern enterprise portal built on top of Vuexy and MUI, but it should never feel like an untouched admin template. The visual tone is operational, confident, and clean: executive enough for finance and payroll, but still fast and practical for dense internal workflows.

This file is the repository-level design contract for coding agents. Use it together with `AGENTS.md`, `project_context.md`, `src/app/layout.tsx`, `src/components/theme/mergedTheme.ts`, and `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`. When there is tension between older code and this file, prefer the live theme and the canonical token doc, then update this file.

Default accent is Core Blue. The runtime supports other approved Efeonce brand primaries through settings, but agents should not invent new accent colors or gradients. If a surface already uses one of the approved palette variants, preserve it; otherwise default to Core Blue.

## Colors

The product is built on bright neutral surfaces, deep blue structural tones, and one strong accent at a time.

- `primary` is the canonical CTA and active-state color. Use it for the single most important action in a local context.
- `secondary` and its darker family are structural blues for shells, navigation depth, or emphasis blocks, not for stacking many competing CTAs.
- `neutral`, `surface`, and `surface-alt` keep the product bright, legible, and operational.
- `success`, `warning`, and `error` are semantic only. Do not repurpose them for decorative emphasis.
- In dark mode, prefer the dedicated dark surfaces and text tokens instead of inverting colors ad hoc.

The overall impression should be crisp and trustworthy rather than flashy. Blue is the product's default energy source; orange, lime, and crimson are controlled signals, not a rainbow palette.

### AXIS palette — full reference

The colors above are the **semantic + key tokens** an agent needs day to day. The complete AXIS palette (Efeonce's Design System) is the source of truth and lives in code, not in this front-matter — the design-contract lint gate forbids unreferenced tokens here, so the full ramps stay where they're consumed:

- **Source of truth (code):** `src/@core/theme/axis-tokens.ts` (1:1 mirror of AXIS Figma).
- **Source of truth (design, live via Figma MCP):** the AXIS Figma file is the upstream SoT. An agent with the Figma MCP can pull the live ramps/semantics for context before a design decision:
  - **fileKey:** `yyMksCoijfMaIoYplXKZaR` · **Theme Color node:** `11205:5341` (light + dark swatches, all ramps 100→900 + opacity + elevation).
  - **Tools:** `get_variable_defs(nodeId, fileKey)` → every token's resolved hex (e.g. `Color Efeonce/Secundary/secundary-700 = #138760`); `get_screenshot(nodeId, fileKey)` → the swatch sheet. URL: `figma.com/design/yyMksCoijfMaIoYplXKZaR/...?node-id=11205-5341`.
  - When AXIS Figma and this contract disagree, AXIS is the north — pull it, then reconcile the runtime + this file (parity 3-capas).
- **Runtime access:** `theme.axis.*`.
  - **Living inventory for agents:** `/admin/design-system/colors` lists every runtime token name with its current resolved color. Check it when choosing a color token; do not invent names or paste HEX from screenshots/Figma.
  - `theme.axis.main.<family>` — quick alias for the current main color of `primary`, `secondary`, `info`, `success`, `warning`, and `error`.
  - `theme.axis.ramp.<family>[<step>]` — full `100→900` ramps for `primary`, `secondary`, `info`, `success`, `warning`, `error`, and the neutral `gray` family. Reach for a specific step only for the rare case the semantic layer can't cover (a chart series, a contrast-safe text tint).
  - `theme.axis.opacity.<family>[8|16|24|32|38]` — canonical soft-fill / hover / selected alphas (alert & chip tints, hover overlays).
  - `theme.axis.neutral.{light,dark}.{bodyBg|paper|bgWhite|textPrimary|textSecondary|textDisabled|divider|actionHover|snackbar}` — per-mode surface/text/divider neutrals (the values mapped into `background`/`paper`/`text` below).
- **Default rule:** components consume the **semantic** layer (`theme.palette.*`, `theme.customColors.*`) — the AXIS primitives mint those semantics; only drop to `theme.axis.ramp.*` when no semantic token fits.
- **Which step to use (agents: do NOT pick a ramp step by eye):** the semantic `main`/`light`/`dark` already encode the right step per role — use them, not raw ramp steps. The mapping + a11y rule:
  - `main` = the **functional fill/text step** chosen for AA. For feedback semantics (TASK-1053 Restraint v1) `main` = the nominal `500`, now AA with white text by design: `error.main` = error-`500` `#DC2E39` (white 4.6:1), `success.main` = success-`500` `#157F47` (white 5.05:1), `info.main` = info-`500` `#1F6FD4` (white 4.9:1); `warning.main` = warning-`500` `#FFB703` uses **dark ink** (white-on-amber fails AA). The legacy error-800 deviation was removed. `secondary.main` = secondary-**700** (`#138760`, the lime `500` `#6EC207` is illegible as text ~1.8:1). When you need a solid fill or text in a brand/semantic color, use `main`.
  - `light` = the **bright/tint accent end** (e.g. `secondary.light` = lime `500` `#6EC207`) — use ONLY as a tint behind dark/ink text or as a soft fill, never with white text (it fails AA). `theme.axis.opacity.<family>[8|16]` is the canonical soft-fill alpha.
  - `dark` = **hover/active** (darken), e.g. `secondary.dark` = secondary-`800`.
  - Raw `theme.axis.ramp.<family>[<step>]` is for the rare case the semantic layer can't cover (a chart series needing N distinct steps, a specific contrast-safe tint) — and you must verify contrast yourself.
- **Neutrals are AXIS** (light bg `#F8F7FA` / paper `#FFFFFF` / ink `#2F2B3D`; dark bg `#25293C` / paper `#2F3349` / ink `#E1DEF5`), default-on at runtime; the env kill-switch `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED=false` reverts to legacy navy only in emergency.
- **`secondary` = AXIS green (ADOPTED, TASK-1034).** AXIS defines `secondary` as the green/lime ramp; the legacy Efeonce azure `#023C70` was NOT an AXIS color and is retired. `secondary.main` = secondary-**700** `#138760` (deep green — the functional, AA-legible step: white text 4.9:1, and legible as tonal/outlined text where `main` drives the color). `secondary.light` = secondary-**500** `#6EC207` (the bright lime — tint/accent only, dark/ink text). `secondary.dark` = secondary-**800** `#0C7250` (hover/active). Default-on at runtime; kill-switch `NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED=false` reverts to legacy azure only in emergency. **Why deep green, not the nominal lime `500`:** `color="secondary"` is ~241 tonal/outlined usages (0 contained) where `main` is the text/border — bright lime as text is illegible (~1.8:1) and reads candy; the deep green is sophisticated + AA. Same principle as picking the AA-legible step over the bright nominal `500` (TASK-1053 corrected the feedback semantics to AA-capable `500`s, so only `secondary` keeps a non-500 main).
- **`primary-light` / `primary-dark`** remain runtime-computed (`lighten`/`darken` of the tenant primary), not AXIS ramp steps, because `primary` is tenant-driven.

## Typography

Greenhouse uses exactly two active font families:

- `Poppins` for controlled display moments only
- `Geist` for everything else

The split is intentional:

- `headline-display`, `headline-lg`, `headline-md`, `page-title`, and `surface-hero-title` are the only places where Poppins should appear
- all body copy, tables, forms, metadata, chips, buttons, IDs, and KPI values use Geist

Numeric alignment uses Geist with tabular numerals semantics. Do not introduce monospace for IDs, amounts, or tables. The semantic equivalents are `numeric-id`, `numeric-amount`, and `kpi-value`.

> **Units (this contract is agent-facing — you emit code; humans use Figma/AXIS).**
> Emit the **token / MUI variant by name** (`<Typography variant="…">`), **never a
> raw font-size**. The concrete value lives in the front-matter above and is in
> **`rem`** — the runtime unit (font-size in `rem` scales with the user's font-size
> preference + zoom; WCAG 1.4.4 — `px` font-size would break that). When a size is
> shown in this prose it is `rem` for that reason. Other properties: `line-height`
> unit-less, `letter-spacing` `em`, borders/hairlines/focus-ring `px` (must NOT scale
> with the font).

Use the scale semantically:

- `page-title` for product page titles
- `surface-hero-title` for the primary title of a full-page surface or workbench
  that needs a stronger first-read anchor (for example `Organizaciones`) and for
  primary identity headers (for example a Person 360 name). It is intentionally
  large: `2.125rem` from tablet/desktop and `1.75rem` on mobile. Use it **once
  per surface only**, never in cards, tables, lists, dashboards, inspectors,
  modals, marketing heroes, repeated rows, or as a generic "make it bigger"
  heading. Dense/product-detail page titles remain `page-title`.
- `section-title` for section headers inside cards and drawers
- `label-lg` / `label-md` / `label-sm` for control / bold-label text (`1rem` / `0.875rem` / `0.8125rem`). `label-md` is the canonical control label (the `button` variant); `label-lg` and `label-sm` are the larger / smaller steps of the same label scale
- `body-lg` for primary readable copy
- `body-md` for dense product UI copy, table cells, and helpers
- `body-sm` for metadata and timestamps
- `overline` for compact uppercase labels above values

### Source of truth + contract↔runtime bridge (TASK-1036)

Typography has one Source of Truth in code: `typographyScale` in
`src/components/theme/typography-tokens.ts` (primitives → composed tokens, the
mirror of the AXIS color SoT). The runtime theme (`mergedTheme.ts`) and this
contract both derive from it; `src/components/theme/typography-drift.test.ts`
fails CI if runtime, contract, or the SoT diverge.

This contract uses semantic names; the runtime keeps standard MUI variant names.
The mapping is **code, not a manual table** — `TYPOGRAPHY_VARIANT_BRIDGE`
(verified in CI):

| Contract token | MUI variant |
|---|---|
| `headline-display/lg/md`, `page-title` | `h1` / `h2` / `h3` / `h4` |
| `surface-hero-title` | `surfaceHeroTitle` |
| `section-title` | `h5` |
| `label-md` | `button` |
| `body-lg/md/sm` | `body1` / `body2` / `caption` |
| `overline` | `overline` |
| `numeric-id` / `numeric-amount` / `kpi-value` | `monoId` / `monoAmount` / `kpiValue` |

Notes:

- `label-lg` (`1rem`) and `label-sm` (`0.8125rem`) are SoT tokens of the label scale with
  no dedicated MUI variant — apply them through the matching control (`<Button>`,
  `<Chip>`), never with `fontSize` inline.
- Control text is owned by the SoT too (`controlText` ramp): Button `sm`/`md` =
  `body-md`/`label-md`, Button `lg` = `label-lg`, Tab = `label-md`
  (`controlText.md`), Dialog title = `section-title`. `subtitle1` is the
  live `subheader` token; `h6` reuses the `label-md` value (inline bold label);
  `subtitle2` is governed via `body-sm` (`SECONDARY_VARIANT_TOKENS`).
- The icon glyph sizes inside controls (Button/Chip icons, input legend) are not
  typography — they live in the read-only Vuexy `@core` overrides.

### Token names (SoT) + weight roles

The SoT (`typographyScale`) token names are camelCase mirrors of the contract:
`headlineDisplay` · `headlineLg` · `headlineMd` · `pageTitle` · `sectionTitle` ·
`surfaceHeroTitle` · `subheader` · `labelLg` · `labelMd` · `labelSm` · `bodyLg` · `bodyMd` · `bodySm` ·
`overline` · `numericId` · `numericAmount` · `kpiValue`. Add a role here (never an
inline size); the bridge wires it to a MUI variant if it needs one.

**Weight roles (Greenhouse uses 4):** `400` body · `600` labels/titles/buttons ·
`700` reserved strong emphasis · `800` display/KPI. **`500` is loaded but has no
semantic role** — evaluated and **declined** (TASK-1039): at body size 400→500 is
imperceptible and `500` already renders via Vuexy/MUI defaults (Tab/stepper/
inputs); naming it would add a 4th ambiguous tier. Do not introduce a `500` role.

### Charts derive from the SoT (TASK-1041)

All charts consume typography from **one place** — the SoT (`theme.typography`) —
via their canonical wrappers. **Never** set `fontSize`/`fontFamily` on chart text
inline:

- **Apex (33) + Recharts (10)** (SVG, all current charts): the wrappers
  `AppReactApexCharts` + `AppRecharts` (`src/libs/styles/`) govern font family +
  size with CSS `!important` reading `theme.typography.{fontFamily,caption}`. 100%
  coverage, 0 bypass. Change the SoT → all 43 charts update; no per-chart edits.
- **ECharts** (canvas, the policy for new high-impact dashboards): CSS can't reach
  the canvas — those charts MUST consume `getChartTypographyFromTheme(theme)`
  (`src/components/theme/chart-typography.ts`) in `option.textStyle`/`axisLabel`.

### PDF + email = one semantic SSOT + adapter per medium

The semantic roles (display / page-title / section-title / body / caption / …) are
the single source; **each medium has an adapter** (mirrors the `axisSemanticHex`
color precedent). Web → MUI variants (done). Charts → wrappers/helper (done).
PDF/email have **no CSS cascade** (react-pdf `StyleSheet`, email inline styles), so
governance is an **opt-in adapter**, not enforced CSS, and concrete sizes differ
per medium (PDF in `pt` for dense legal docs, email in `px` with web-safe
fallbacks). Today: PDF font **families** are centralized (`register-fonts.ts`,
incl. `Geist SemiBold`/`ExtraBold` from TASK-1040) but the **type scale is not yet
adapter-governed** (sizes are still per-component); email is not governed. Future
PDF/email type adapters derive the role scale from the SoT — never re-hardcode.

### Hard rules

- **NEVER** `fontSize` inline on `<Typography>` — use a variant/token. Enforced by
  `greenhouse/no-fontsize-inline-typography` (warn; scoped to `<Typography>` so it
  never flags icon `fontSize`). Run `pnpm test:lint-rules` covers the rule tests.
- **NEVER** monospace for numbers/IDs/amounts — Geist + `tabular-nums` (`numeric-id`
  / `numeric-amount` / `kpi-value`).
- **NEVER** edit `src/@core/theme/*` (Vuexy core) — override in `mergedTheme.ts`.
- **NEVER** a token without a consumer; **NEVER** a fixed-type `clamp()` in product
  (fluid type is marketing-only).
- **ALWAYS** move the 3 layers together (SoT ≡ `mergedTheme` ≡ DESIGN.md) or
  `typography-drift.test.ts` fails CI — it guards runtime ≡ SoT ≡ DESIGN.md
  **front-matter + prose** ≡ **V1 §15.1** (TASK-1042: every `Npx`/`Nrem` literal
  in the §Typography prose and the V1 table must be a live SoT size).
- Living reference (internal): `/admin/design-system/typography/mockup` — the
  "museum"; the rules an agent applies live here in DESIGN.md, not in the mockup.

## Layout

Greenhouse favors predictable spacing and strong rhythm over visual tricks.

- AXIS `Gap/Padding-N` maps to `theme.spacing(N)` (`4N px` visually). The AXIS sheet exposes `1..16 + 25`; product UI prefers the established rhythm (`1`, `1.5`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`) unless a concrete spec requires another available step.
- `24px` is the default card padding and a common container rhythm
- `16px` is the standard inner spacing step
- `8px` is the compact inline gap
- `32px` and `40px` are for larger section breathing room

Dense operational surfaces such as payroll, finance tables, and drawers should still feel breathable. Avoid collapsing layouts to the point where labels, captions, or totals visually crash into each other.

## Elevation & Depth

Depth is restrained and **semantic**. New Greenhouse primitives read an elevation **role**, never a numeric index (`Paper elevation={6}` / `theme.shadows[n]` are legacy MUI infra). Roles are served by the theme: `theme.greenhouseElevation.<role>` (SoT `src/components/theme/elevation-tokens.ts`, ADR `GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1`).

The recipe is the convergent 2026 one: two soft shadow layers + a 1px hairline border — never a heavy single drop. No role exceeds `0 8px 24px rgba(0,0,0,0.1)`.

- `none` — flat / outlined surfaces (internal cards, table shells, panels). Default for dense operational UI.
- `raised` — soft local lift for hover/selection. NOT a blanket card resting state.
- `floating` — anchored, transient surfaces (`GreenhouseFloatingSurface`, popovers, menus, rich tooltips, evidence peeks, inline editors, validation bubbles). NOT dialogs.
- `overlay` — higher transient layer, not modal (command previews, floating docks).
- `modal` — blocking surfaces (Dialog, temporary Drawer, destructive/legal/financial confirmations).
- `overflow` — reserved (no runtime value yet): scroll/sticky-edge affordance.

If a layout already communicates hierarchy with spacing and contrast, do not add shadow just to make it feel "designed". Cards inside workbenches stay flat/outlined. On `floating`/`overlay`/`modal` the **border carries the separation under `forced-colors`** (the browser strips `box-shadow`); the shadow is the enhancement. Avoid layering many shadowed containers inside each other.

## Shapes

Rounded corners are moderate and systematic.

- AXIS `Border-Radius-{xs,sm,md,lg,xl}` maps to `theme.shape.customBorderRadius.{xs,sm,md,lg,xl}`.
- `md` is the default for cards, fields, and common interactive surfaces
- `lg` is reserved for floating or high-emphasis containers such as docks and dialogs
- `xl` is for larger panels and previews when `lg` is too tight
- `xxl` (`12px`) and `display` (`16px`) are Greenhouse extensions for large support/editorial/internal documentation surfaces. They are available in `theme.shape.customBorderRadius`, but they are not the default for dense operational cards, tables, menus, inputs, or chips.
- `full` is for pill treatments only; use `9999px` for pills/capsules and `50%` for true circles, not the Figma `500px` literal.

Do not introduce arbitrary radii or make the system softer than the token scale suggests. Greenhouse should feel modern and precise, not playful.

## Components

Buttons:

- `button-primary` is the main action
- `button-primary-hover` (darker tone) is the canonical pressed/hovered state of the primary CTA
- `button-primary-tonal` is a soft-tone alternative that uses the primary-light fill with dark text — reserved for secondary placements where the primary CTA already exists nearby
- `button-primary-disabled` is the disabled variant; relies on text-disabled and inherits the primary surface
- `button-secondary` is an intentional structural action, not a ghost button substitute
- `button-secondary-hover` and `button-secondary-active` darken the secondary navy on interaction
- button text stays sentence-case, never all caps

Cards:

- `card-default` is the baseline surface for forms, dashboards, and operational panels
- `card-default-border` references the subtle 1px border applied to default cards and dividers
- `card-default-dark` and `card-default-dark-secondary` are the dark-mode counterparts (paper + secondary text on dark surfaces)
- `card-floating` is for sticky summary docks, drawers, or elevated moments that need more presence

App shell:

- `app-shell` and `app-shell-dark` define the global page chrome (background + body text) for light and dark themes; product surfaces sit on top of this canvas

Inputs:

- `input-default` should remain quiet and readable
- field typography follows Geist body sizing, not display typography

Status chips:

- small, readable, and semantically colored when needed
- they should not become miniature banners
- semantic variants are first-class: `status-chip-success`, `status-chip-warning`, `status-chip-error`, `status-chip-info`. Pick the one that matches the operational meaning; never repurpose them for decorative emphasis
- `status-chip` is the neutral fallback for stateless metadata

Data-heavy UI:

- prefer strong typography hierarchy and spacing over decorative chrome
- KPIs and totals should feel deliberate but not oversized
- tables should optimize scanability first

## Motion

Duration tokens (ms, fixed scale): `instant 75 · short 150 · standard 200 · medium 300 · long 400 · extended 600`. Easing: `emphasized cubic-bezier(0.2,0,0,1)` (default) · `standard (0.4,0,0.2,1)` · `emphasizedAccelerate (0.3,0,0.8,0.15)` (exits) · `linear`. SoT in code: `src/components/greenhouse/motion/core/tokens.ts` (seconds + CSS strings derived — never parallel). Never `ease-in-out` as default.

- The cinematic / orchestrated / scroll tier runs on **GSAP** behind the canonical primitive. Consume `<Motion>` (declarative) or `useGreenhouseGSAP` (imperative escape hatch) from `@/components/greenhouse/motion`.
- **NEVER** `import 'gsap' / '@gsap/react'` in views/app/components — lint rule `greenhouse/no-direct-gsap-in-views` (error) blocks it; only `src/components/greenhouse/motion/**` may.
- GSAP does NOT replace CSS Tier 1 (hover/tap/toggle/focus) nor framer-motion (existing microinteractions). It's an additive third layer.
- Variants: `entrance · stagger · scrollReveal · timeline`; kinds resolve to a variant (`listMount→stagger`, `sectionReveal→scrollReveal`, `heroIntro→timeline`…).
- `prefers-reduced-motion` is baked into `useGreenhouseGSAP` (non-bypassable). Compositor-only props (`transform`/`opacity`/`filter`/`clip-path`); never `width/height/top/left/margin/padding`.
- Internal museum: `/admin/design-system/motion`. Spec: `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md` · tokens detail: `GREENHOUSE_DESIGN_TOKENS_V1.md` §9.

## Maintenance Protocol

`DESIGN.md` is a living contract. It should evolve whenever the product's visual system evolves, but it must stay tightly synchronized with the real runtime.

Update `DESIGN.md` when any of these change:

- the active typography baseline
- semantic color usage or approved primary accents
- spacing, radius, or elevation rules that affect shared UI behavior
- shared component contracts that agents are expected to reuse
- explicit visual prohibitions or new exceptions

Preferred update order:

1. decide or implement the visual/runtime change
2. update `DESIGN.md` in the same workstream
3. run `pnpm design:lint`
4. if the change is structural, sync `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
5. if the process or agent contract changed, sync `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md`, or `changelog.md` as needed

Ownership rules:

- `DESIGN.md` is the compact, agent-facing contract
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` is the extended canonical explanation
- `src/app/layout.tsx`, `src/components/theme/mergedTheme.ts`, and related theme files remain the source of runtime truth

Drift rules:

- if runtime changed but `DESIGN.md` did not, update `DESIGN.md`
- if `DESIGN.md` changed but runtime did not, either implement the runtime or revert the design contract
- do not leave speculative future-state decisions in `DESIGN.md` unless they are clearly marked as planned

Diff and review guidance:

- use `pnpm design:diff` when comparing substantial revisions of the contract
- use `pnpm design:export:tailwind` only as a downstream artifact generator, not as the source of truth
- when a typography, spacing, or color change is visible to users, treat the update like a product change, not just a doc edit

Good changes for `DESIGN.md`:

- codifying a font pivot that already landed in the theme
- tightening a component contract after shared UI adoption
- documenting an approved exception with clear scope

Bad changes for `DESIGN.md`:

- inventing tokens that do not exist in runtime or docs
- documenting a future visual direction that is not yet approved
- changing the contract without validating whether the live theme still matches it

## Do's and Don'ts

- Do default to Core Blue unless the existing surface already uses another approved Efeonce primary.
- Do keep the active family count at two maximum: Poppins plus Geist.
- Do use Geist for numeric runs with tabular numerals semantics instead of introducing a third font.
- Do preserve bright surfaces and high readability in light mode.
- Do keep product page titles in Poppins and operational detail in Geist.
- Don't reintroduce `DM Sans`, `Inter`, or any monospace family as a baseline.
- Don't use Poppins for paragraph text, tables, helper copy, or dense UI.
- Don't hardcode raw spacing or radius values when an existing token already covers the case.
- Don't turn every emphasis moment into a primary-colored element.
- Don't make admin-template chrome louder than the data.

## Brand assets — Efeonce (institutional)

**Arquitectura de marca: Efeonce (paraguas) vs Greenhouse (plataforma).** EFEONCE es la marca paraguas/institucional; Greenhouse es la plataforma/app de Efeonce. Los dos logos **coexisten** — la elección depende del contexto, NO son intercambiables:

- **Logo Greenhouse** → todo lo de la **app**: navegación, dashboards, surfaces in-app, mockups del portal.
- **Logo + eslogan Efeonce** → todo lo **institucional/externo**: recibos/comprobantes, reportes (p. ej. nómina de contractors), finiquitos, contratos, emails transaccionales, PDFs institucionales. Un documento institucional lleva marca Efeonce, no Greenhouse.

Single source of truth: `src/config/efeonce-brand.ts`. Never hardcode the URL / address / slogan elsewhere — import from there.

- **URL**: `efeoncepro.com` (`EFEONCE_URL`). Already used in the payroll PDF footer + transactional emails.
- **Legal address (fallback)**: `Dr. Manuel Barros Borgoño 71 Of 1105, Providencia, RM — Chile` (`EFEONCE_LEGAL_ADDRESS_FALLBACK`). Prefer the runtime operating entity's `legalAddress` (`getOperatingEntityIdentity()`); the constant is the canonical fallback when no DB context exists.
- **Legal entity (fallback)**: `Efeonce Group SpA` (`EFEONCE_LEGAL_NAME_FALLBACK`).

### Slogan — "Empower your Growth"

A **brand-zone** element (header / masthead / brand strip), **never** the legal footer.

**Independiente del logo**: el eslogan y el logo son elementos de marca separados — se renderizan solos o compuestos, pero **nunca se fusionan en un único asset/imagen**. Usa los componentes canónicos por separado y compón el lockup en el layout.

**Lockup (logo + eslogan juntos)** — relación, NO tamaños fijos:

- El eslogan es **subordinado** al logo: se ve **claramente más pequeño** y **no compite** con él (su ancho no debe igualar ni superar el ancho del wordmark del logo).
- Va **centrado** respecto al logo (logo arriba, eslogan centrado debajo), con separación **mínima** (lockup compacto, sin gap grande).
- El **tamaño absoluto del eslogan es contextual** — depende del tamaño del logo en esa superficie; elige un `fontSize` que lo mantenga visiblemente menor que el logo. No hay un pt fijo (p. ej. el reporte de contractors usa ~7.5pt contra un logo de ~116pt de ancho: es un ejemplo de la **proporción**, no una regla de tamaño).

**Color canónico**: gris **`#848484`** (= token `text-disabled`). Es el default de ambos componentes; un override solo aplica sobre fondo oscuro. Single source of truth: `EFEONCE_SLOGAN_COLOR` en `src/config/efeonce-brand.ts`.

Typography contract (Poppins):

| Word | Family | Weight | Style |
|---|---|---|---|
| Empower | Poppins ExtraBold Italic | 800 | italic |
| your | Poppins ExtraBold | 800 | — |
| Growth | Poppins Black Italic | 900 | italic |

Font assets: `src/assets/fonts/Poppins-{ExtraBold,ExtraBoldItalic,Black,BlackItalic}.ttf` (Google Fonts Poppins v24 Latin subset, SIL OFL 1.1), registered for PDF in `src/lib/finance/pdf/register-fonts.ts`. Render via the canonical components — **never** re-implement the slogan inline:

- Web: `src/components/greenhouse/brand/EfeonceSlogan.tsx`
- PDF: `src/lib/finance/pdf/efeonce-slogan-pdf.tsx`

### Reusable PDF footer

`src/lib/finance/pdf/efeonce-pdf-footer.tsx` (`EfeoncePdfFooter`) is the canonical institutional footer for **all** Efeonce PDFs: legal entity (legalName · RUT) + legal address (line 1), `efeoncepro.com` + optional generated/page (line 2). The footer carries **legal/contact identity only** — the marketing slogan goes in the brand zone, not here. New PDFs reuse this footer instead of rolling their own.

### Ilustraciones / personajes — PROPIETARIAS de Efeonce (no stock)

Las ilustraciones de personaje del portal (`public/images/illustrations/characters/greenhouse-*.png` — p. ej. `greenhouse-404.png`, `greenhouse-401.png`, y futuras como coming-soon) **NO son assets de stock ni del starter Vuexy**: son **obra propia del equipo creativo de Efeonce**, dueños de Greenhouse. Tratarlas como **brand assets propietarios**:

- **NUNCA** describirlas, documentarlas ni comentarlas en código como "stock", "Vuexy character", "ilustración genérica" o equivalente. Son originales de Efeonce.
- Cuando un diseño de referencia (Figma DS Vuexy, etc.) traiga una ilustración stock, la versión que va al producto es la **propia de Efeonce** con el mismo estilo de personaje 3D (coherencia con `greenhouse-404`/`greenhouse-401`), no la stock importada — salvo instrucción explícita del operador.
- El estilo canónico del personaje (3D, hoodie azul Efeonce, expresivo) es la línea visual de marca; assets nuevos deben mantener esa consistencia.

Regla cross-agente (Claude + Codex): cualquier ilustración de personaje bajo `characters/greenhouse-*` se asume **autoría Efeonce**, no atribuir a terceros ni a librerías de stock.

## Brand assets — AXIS (design system only)

**AXIS es el logo del Design System de Efeonce — NO es marca de producto.** Identidad del sistema de diseño (tokens, paleta, componentes), distinta del logo **Greenhouse** (app/portal) y del logo **Efeonce** (institucional/PDFs).

**Regla dura — scope cerrado:** el logo AXIS se usa **ÚNICAMENTE** en superficies del propio design system — referencias de paleta/tokens, documentación del DS, theme previews internos. **NUNCA** en UI de producto, dashboards, navegación, login, emails, PDFs, comprobantes, finiquitos, portal cliente, ni ningún contexto de cara al usuario u operador. Si dudás, NO uses AXIS: usá **Greenhouse** (app) o **Efeonce** (institucional).

**Componente canónico:** `src/components/greenhouse/brand/AxisWordmark.tsx` (`variant`: `full` | `isotype` | `negative`). NUNCA pegar el `<svg>` inline ni referenciar el archivo a mano.

**Assets (vector):** `public/branding/axis-*.svg`

- `full` → `axis-full-color.svg` — lockup color (navy + naranja), sobre fondo claro. Default.
- `isotype` → `axis-isotipo-full-color.svg` — solo el isotipo, para espacios reducidos.
- `negative` → `axis-color-negative.svg` — blanco + naranja, sobre fondo oscuro.

Cross-agente (Claude + Codex): AXIS = marca del design system, scope cerrado. Cualquier uso fuera de surfaces del DS es un error de marca.

## Brand assets — Integraciones de terceros (Notion, Teams, …)

**Esto NO es la marca Efeonce/Greenhouse.** Son los **isotipos de marcas de terceros** que Greenhouse integra (Notion, Microsoft Teams, y a futuro HubSpot, etc.). Se usan **solo para etiquetar superficies de integración** — el panel de vínculo de teamspace/canal en el wizard de alta, conectores, settings de integración — donde el usuario necesita reconocer "esto es Notion / esto es Teams". Gobierno aparte del logo institucional (ese vive en la sección anterior + `src/config/efeonce-brand.ts`).

**Componente canónico:** `src/components/greenhouse/brand/BrandIsotypes.tsx` → `NotionIsotype`, `TeamsIsotype` (prop `size`). NUNCA re-implementar el isotipo inline ni pegar un `<svg>` de marca suelto.

**Cómo se renderizan (regla dura):** cada isotipo usa el **glyph Tabler de la marca** ya bundleado (`tabler-brand-notion`, `tabler-brand-teams`, `tabler-brand-*`) vía `<i className>`, coloreado a la marca:

- **Notion** → glyph `tabler-brand-notion` negro dentro de una caja blanca redondeada (lockup canónico sobre superficies claras).
- **Teams** → glyph `tabler-brand-teams` en púrpura oficial `#5059C9`, sin caja.

NUNCA usar paths SVG hand-transcritos (de simple-icons u otra fuente): rinden como un blob malformado cuando les falta `fill-rule`/container, arrastran marcas que Microsoft/Notion pidieron retirar de esas librerías, y se desvían del sistema de iconos del portal (Tabler en todo). El bug fuente (TASK-998): el isotipo de Teams era un `<path>` simple-icons monocromo sin container → blob púrpura ilegible.

**Reglas duras:**

- Decorativos: `aria-hidden`. El significado lo carga el **label de texto adyacente** ("Notion del cliente", "Teams del cliente"), nunca el glyph solo.
- Para una integración nueva (HubSpot, Slack, etc.): agregar un `<XIsotype>` a `BrandIsotypes.tsx` reusando su glyph Tabler `tabler-brand-<x>` si está en el bundle (verificar en `src/assets/iconify-icons/generated-icons.css`); si no está, agregarlo al bundle — NUNCA hand-author el SVG.
- Estos marks de terceros **NUNCA** se usan como marca propia del portal ni en documentos institucionales (recibos, finiquitos, contratos) — esos llevan **solo** marca Efeonce.
- Tamaño vía `size`; color a la marca vía `color`/container, no inventar variantes.
