---
version: alpha
name: Greenhouse EO Portal
description: Greenhouse design contract for coding agents. Derived from the live MUI theme and the canonical typography/token docs.
colors:
  primary: "#0375DB"
  primary-light: "#3691E3"
  primary-dark: "#024C8F"
  secondary: "#023C70"
  secondary-light: "#035A9E"
  secondary-dark: "#022A4E"
  info: "#0375DB"
  neutral: "#F8F9FA"
  surface: "#FFFFFF"
  surface-alt: "#FAFBFC"
  surface-dark: "#162033"
  background-dark: "#101827"
  text-primary: "#1A1A2E"
  text-secondary: "#667085"
  text-disabled: "#848484"
  text-primary-dark: "#F5F7FA"
  text-secondary-dark: "#B0B9C8"
  on-primary: "#FFFFFF"
  on-surface: "#1A1A2E"
  on-surface-dark: "#F5F7FA"
  success: "#6EC207"
  warning: "#FF6500"
  error: "#BB1954"
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
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.4
  section-title:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.5
  label-md:
    fontFamily: Geist
    fontSize: 0.9375rem
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
    letterSpacing: 0.4px
  overline:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.167
    letterSpacing: 1px
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
  xs: 2px
  sm: 4px
  md: 6px
  lg: 8px
  xl: 10px
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
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.text-primary}"
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
    backgroundColor: "{colors.secondary-light}"
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
    textColor: "{colors.text-primary}"
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

## Typography

Greenhouse uses exactly two active font families:

- `Poppins` for controlled display moments only
- `Geist` for everything else

The split is intentional:

- `headline-display`, `headline-lg`, `headline-md`, and `page-title` are the only places where Poppins should appear
- all body copy, tables, forms, metadata, chips, buttons, IDs, and KPI values use Geist

Numeric alignment uses Geist with tabular numerals semantics. Do not introduce monospace for IDs, amounts, or tables. The semantic equivalents are `numeric-id`, `numeric-amount`, and `kpi-value`.

Use the scale semantically:

- `page-title` for product page titles
- `section-title` for section headers inside cards and drawers
- `body-lg` for primary readable copy
- `body-md` for dense product UI copy, table cells, and helpers
- `body-sm` for metadata and timestamps
- `overline` for compact uppercase labels above values

## Layout

Greenhouse favors predictable spacing and strong rhythm over visual tricks.

- `24px` is the default card padding and a common container rhythm
- `16px` is the standard inner spacing step
- `8px` is the compact inline gap
- `32px` and `40px` are for larger section breathing room

Dense operational surfaces such as payroll, finance tables, and drawers should still feel breathable. Avoid collapsing layouts to the point where labels, captions, or totals visually crash into each other.

## Elevation & Depth

Depth is restrained. Most surfaces should feel flat-to-soft rather than glossy.

- default cards are subtle and stable
- floating docks, dialogs, and popovers can step up in elevation
- avoid layering many shadowed containers inside each other

If a layout already communicates hierarchy with spacing and contrast, do not add shadow just to make it feel "designed".

## Shapes

Rounded corners are moderate and systematic.

- `md` is the default for cards, fields, and common interactive surfaces
- `lg` is reserved for floating or high-emphasis containers such as docks and dialogs
- `full` is for pill treatments only

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
