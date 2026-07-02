# TASK-1318 / Growth Forms — Full Name Destination Split

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1318`
- Product Design asset: live AEO conversion form at `https://efeoncepro.com/aeo-2/#diagnostico`
- Intended consumers: public visitors submitting Growth Forms, beginning with AEO `efeonce-aeo-diagnostic`
- Copy source: Growth Forms published `field_schema` / render contract
- Primitive decision: `reuse/extend` — keep `<greenhouse-form>` renderer and add a backend normalization policy; no new UI primitive
- UI ready target: `yes` for this microcopy because implementation mapping, GVC/Playwright plan and decision log are bounded below

## Brief

- Primary user: a public visitor asking for an AEO diagnostic.
- User moment: completing the first required identity field in the conversion form.
- Job to be done: enter one natural name field without deciding what part is first name vs last name.
- Primary decision signal: the label reads `Nombre completo`, while HubSpot still receives native `firstname` and `lastname` values when possible.
- Non-goals: redesign the form, add a second surname field to AEO, change WordPress chrome, change the renderer visual system, or send raw HubSpot mapping to the browser.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Conversion card | Existing AEO Growth Forms card remains unchanged | `.gh-aeo-growth-form-card` + `<greenhouse-form>` | WordPress `postId=250265`, widget `convers` |
| 1 | Name field | Rename the visible first field from `Nombre` to `Nombre completo` | existing renderer text input | published AEO `field_schema` |
| 2 | Delivery enrichment | Split submitted full name into destination fields | server-side Growth Forms normalizer | `submitForm` normalized fields |
| 3 | Destination mapping | Send derived values to HubSpot properties | HubSpot secure-submit adapter mapping | destination `fieldMapping` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.forms.field.fullName.label` | Name field label | `Nombre completo` | none | AEO vNext field label; should be reusable by other Growth Forms |
| `growth.forms.aeo.form.error.fullName.required` | Name field required error | `Escribe tu nombre completo para personalizar el diagnóstico.` | none | Field-specific required copy if activation script updates required errors |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | none | field label visible | existing submit CTA | no layout change |
| error | none | required error near field | fix field | copy should refer to full name |
| degraded | none | submit accepted even if name has one token | none | last name is omitted rather than fabricated |

## Accessibility Contract

- Field label remains the accessible name of the input.
- Required/error relationship remains renderer-owned via `aria-invalid` and `aria-describedby`.
- No visual-only indicator is introduced.
- No keyboard or focus behavior changes.

## Implementation Mapping

- Route / surface: public AEO conversion form at `https://efeoncepro.com/aeo-2/#diagnostico`.
- Primitive / variant / kind: existing `<greenhouse-form>` renderer, `formKind=diagnostic_intake`, `style_variant=diagnostic_premium`.
- Component candidates: no JSX/renderer component change expected; field label comes from the published Growth Forms contract.
- Copy source: Growth Forms `field_schema` + activation script for AEO reference copy.
- Data reader / command: public `submitForm` command in `src/lib/growth/forms/commands.ts`.
- API parity: browser submits one `fullName`; server derives internal destination fields before persistence/delivery. HubSpot mapping remains server-only.
- Access / capability: existing public surface allowlist/CORS/Turnstile/email gate unchanged.
- States to implement: one-token name, two-token name, multi-token name, whitespace-only rejection through existing required validation.
- HubSpot properties: use native contact properties `firstname` and `lastname`; do not invent custom HubSpot properties for name parts.
- Greenhouse persistence: preserve the visible raw `fullName` and add derived `firstName`/`lastName` only through declared policy.

## GVC Scenario Plan

- Scenario file: use existing public site route capture/verifier; add focused Playwright checks only if `public-website:verify-aeo-live-contract` cannot assert the label.
- Route: `https://efeoncepro.com/aeo-2/#diagnostico`
- Viewports: desktop `1440x1200`, mobile `390x1100`.
- Required steps:
  - load AEO page and scroll to `.gh-aeo-conversion`;
  - assert one visible label `Nombre completo`;
  - assert old label `Nombre` is not rendered as a standalone label;
  - assert field remains required and focusable;
  - assert no horizontal page overflow desktop/mobile;
  - submit behavior stays fail-closed without Turnstile token in API contract tests.
- Required captures: conversion card desktop/mobile after vNext publish.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root.
- Assertions: label exact, `formKey` unchanged, `security.captcha` still present, HubSpot destination remains server-only, `heroans` hash unchanged if WordPress is touched.
- Scroll-width checks: desktop and mobile 390 through the AEO live verifier or focused Playwright probe.
- Accessibility/focus checks: existing renderer invalid-submit behavior remains intact.

## Design Decision Log

- Decision: keep one visible `Nombre completo` field for AEO and split server-side for destinations.
- Alternatives considered: add a visible `Apellido` field to AEO; keep label `Nombre` and send only `firstname`; create custom HubSpot field for full name.
- Why this pattern: AEO is a low-friction public diagnostic form; adding `Apellido` increases form effort for a field HubSpot can receive through a conservative derived split. HubSpot's native contact fields are `firstname` and `lastname`, so destination mapping should target those names rather than custom properties.
- Reuse / extend / new primitive: extend Growth Forms backend policy; reuse renderer and destination adapter.
- Open risks: human names are culturally variable. The normalizer must never fabricate a last name; with a single token, send only first name and preserve raw `fullName` in Greenhouse.

## Acceptance Checklist

- [ ] All visible copy for this change is declared.
- [ ] Dynamic values are bounded: no unreviewed regex or arbitrary admin-authored pattern.
- [ ] Implementation mapping names command, destination adapter and public surface.
- [ ] GVC/Playwright plan covers label and no-overflow.
- [ ] Design decision log explains why AEO keeps one visible field.
