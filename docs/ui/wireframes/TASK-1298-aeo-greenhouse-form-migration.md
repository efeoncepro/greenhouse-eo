# TASK-1298 / AEO Public Landing — Greenhouse Form Migration

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1298`
- Product Design asset: `live WordPress /aeo-2/ conversion section`
- Intended consumers: public visitors on `https://efeoncepro.com/aeo-2/`
- Copy source: Growth Forms render contract + AEO landing wrapper copy
- Primitive decision: `reuse` — `<greenhouse-form form-guid>` portable renderer inside existing AEO conversion section
- UI ready target: `yes`

## Brief

- Primary user: marketing/commercial visitor requesting an AEO diagnostic
- User moment: final conversion section after reading proof/FAQ
- Job to be done: submit brand context with confidence that the form is secure, simple and not a generic embed
- Primary decision signal: the form keeps the approved AEO copy, one-card visual surface, corporate email gate and invisible Turnstile
- Non-goals: redesign the hero, Home, FAQ, HubSpot mapping, Growth Forms engine or renderer core

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Section band | Keep the light AEO conversion area and spacing | Elementor section `.gh-aeo-conversion` | WordPress page `postId=250265` |
| 1 | Header | Preserve public-facing conversion promise | Existing Ohio heading/badge widgets | AEO page content |
| 2 | Form shell | Host one visible card without card-on-card | Existing `.gh-aeo-growth-form-card` wrapper or renderer-themed host | WordPress HTML widget + renderer |
| 3 | Form fields | Render canonical fields and validation | `<greenhouse-form form-guid>` | AEO `formGuid` render contract |
| 4 | Trust footer | Preserve trust bullets/privacy/direct conversation | AEO wrapper copy or renderer-compatible surrounding markup | AEO page content |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.forms.aeo.conversion.eyebrow` | Header | `Tu primer paso` | none | Existing AEO section |
| `growth.forms.aeo.conversion.title` | Header | `Mide cómo aparece tu marca en la IA` | none | Existing AEO section |
| `growth.forms.aeo.conversion.lead` | Header | `Recibe en 24-48 h un diagnóstico personalizado con score, prompts críticos y competidores citados.` | none | Existing AEO section |
| `growth.forms.aeo.form.submit` | CTA | `Solicitar diagnóstico gratis →` | none | Must come from `render_contract.copy.submit` after `TASK-1297` |
| `growth.forms.aeo.form.trust` | Trust | `Sin costo`, `Sin compromiso`, `Sin permanencia`, `Datos protegidos` | none | Existing AEO wrapper |
| `growth.forms.aeo.form.direct` | Footer | `¿Prefieres coordinar directo? Agenda una conversación →` | link URL | Existing AEO wrapper |
| `growth.forms.aeo.form.privacy` | Footer | `Usaremos tus datos para preparar el diagnóstico y contactarte. Ver política de privacidad.` | privacy URL | Existing AEO wrapper |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | none | fields visible | `Solicitar diagnóstico gratis →` | renderer mounted |
| loading | none | renderer loading state | none | should not cause blank card |
| empty | N/A | N/A | N/A | form contract must exist |
| partial | none | inline field errors | fix field | corporate email gate |
| error | submit error | sanitized renderer/server message | retry | no raw errors |
| denied | N/A | public form disabled/unavailable | contact fallback if renderer exposes it | only if API disabled |

## Accessibility Contract

- Heading order: keep section H2; renderer field labels remain programmatic labels.
- Chart/table alternatives: N/A.
- Aria labels: field errors use renderer `aria-invalid`/`aria-describedby`; submit status uses renderer live regions.
- Focus notes: invalid submit moves focus to first invalid field; keyboard can complete all fields.
- Color-independent state labels: errors include text, not only border color.

## Implementation Mapping

- Route / surface: WordPress page `postId=250265`, URL `https://efeoncepro.com/aeo-2/`, section `convers`.
- Primitives: `<greenhouse-form form-guid>` portable renderer from `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Variants / kinds: Growth Forms `formKind=diagnostic_intake`, host surface `fhsf-efeonce-aeo-diagnostic`.
- Component candidates: existing HTML widget in `convers`; existing `.gh-aeo-conversion`, `.gh-aeo-form-card`, `.gh-aeo-growth-form-card` CSS scope.
- Copy source: `render_contract.copy.submit` for CTA; existing WordPress wrapper copy for section header/trust/privacy.
- Data reader / command: public GET/POST/verify-email APIs by AEO `formGuid`; slug remains backward-compatible.
- API parity: WordPress only embeds renderer; validation, captcha, submit and destinations stay in Growth Forms.
- Access / capability: public host surface allowlist + CORS for `https://efeoncepro.com`.
- Runtime consumers: public browser, GTM/dataLayer, Growth Forms backend, HubSpot secure-submit dispatcher.
- Print/email/PDF considerations: N/A.
- GVC markers: existing `.gh-aeo-conversion`; add/keep renderer root marker with AEO `formGuid` if needed for capture.

## GVC Scenario Plan

- Scenario file: use Playwright/GVC route capture for public URL; add scenario only if existing direct route capture cannot assert form states.
- Route: `https://efeoncepro.com/aeo-2/`
- Viewports: desktop `1440x1200`, mobile `390x1100`, reduced-motion.
- Required steps:
  - load page and scroll to `.gh-aeo-conversion`;
  - assert one visible card surface, no card-on-card;
  - assert `<greenhouse-form form-guid>` is mounted and bridge-only class no longer owns submit logic;
  - trigger required errors;
  - enter Gmail/free email and assert inline block before submit;
  - verify corporate email path reaches Turnstile/submit boundary without raw errors.
- Required captures: conversion section desktop/mobile, field error state, email gate state, post-submit or fail-closed state.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions:
  - `scrollWidth == clientWidth` desktop and mobile 390;
  - CTA text equals `Solicitar diagnóstico gratis →`;
  - `form.formGuid` equals the real AEO GUID from `TASK-1297`;
  - `security.captcha` present in contract;
  - no technical kicker;
  - `heroans` md5 unchanged.
- Scroll-width checks: desktop + mobile 390 via Playwright.
- Accessibility/focus checks: first invalid field receives focus; errors are announced via ARIA attributes.
- Reduced-motion evidence: no non-trivial motion added; renderer and page remain stable under reduced motion.

## Design Decision Log

- Decision: migrate only the form mechanism to `<greenhouse-form>` while preserving the AEO section shell and public copy.
- Alternatives considered: keep bridge HTML longer; rewrite renderer styles inside WordPress; fork AEO-specific renderer.
- Why this pattern: the engine/renderer is now capable of Turnstile and email validation; keeping bridge logic would duplicate submit/captcha/validation by landing.
- Reuse / extend / new primitive: reuse portable renderer; no new UI primitive.
- Open risks: renderer default styling may need scoped CSS variables to match the approved AEO card without card-on-card.
- Follow-up: generalize additional theme tokens only if a second landing needs the same treatment.

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger.
- [ ] Dynamic values are named and bounded.
- [ ] Partial/degraded states are explicit.
- [ ] No copy implies a guarantee when data is estimated.
- [ ] Charts have table/text alternatives.
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
