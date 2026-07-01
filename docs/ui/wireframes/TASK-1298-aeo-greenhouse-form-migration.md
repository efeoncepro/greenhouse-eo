# TASK-1298 / AEO Public Landing — Greenhouse Form Migration

## Meta

- Status: `needs-modernization-pass`
- Owner task: `TASK-1298`
- Product Design asset: `live WordPress /aeo-2/ conversion section`
- Intended consumers: public visitors on `https://efeoncepro.com/aeo-2/`
- Copy source: Growth Forms render contract + AEO landing wrapper copy
- Primitive decision: `reuse/extend` — `<greenhouse-form form-key>` portable renderer must either match or improve the existing AEO conversion form
- UI ready target: `no` until renderer/Ohio visual parity + modernized interaction contract are proven in fixture and real composition frames

## Brief

- Primary user: marketing/commercial visitor requesting an AEO diagnostic
- User moment: final conversion section after reading proof/FAQ
- Job to be done: submit brand context with confidence that the form is secure, simple and not a generic embed
- Primary decision signal: the form feels more trustworthy and modern than a generic embed while preserving the approved AEO conversion promise, one-card visual surface, corporate email gate and invisible Turnstile
- Non-goals: redesign the hero, Home, FAQ, HubSpot mapping, Growth Forms engine or renderer core

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Section band | Keep the light AEO conversion area and spacing | Elementor section `.gh-aeo-conversion` | WordPress page `postId=250265` |
| 1 | Header | Preserve public-facing conversion promise | Existing Ohio heading/badge widgets | AEO page content |
| 2 | Form shell | One visible premium card, no card-on-card | Existing `.gh-aeo-growth-form-card` wraps the renderer or renderer owns equivalent chrome after visual approval | WordPress markup + renderer |
| 3 | Form fields | Render canonical fields with modern field affordance | `<greenhouse-form form-key … color-scheme="light">` hardened for Ohio; fields must be white, bordered, focus-visible and visually calm even under hostile host CSS | AEO `formKey` render contract |
| 4 | Trust footer | Trust bullets/privacy/direct conversation as conversion reassurance | AEO wrapper copy or renderer-compatible surrounding markup | AEO page content |
| 5 | Feedback layer | Validation, pending, success/error and email gate should reduce uncertainty | Renderer inline states + live regions + subtle motion | Growth Forms renderer |

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
| `growth.forms.aeo.form.helper.email` | Field helper | `Usa tu correo corporativo para recibir el diagnóstico.` | none | Modernized helper copy; keep near email field if renderer supports helpers |
| `growth.forms.aeo.form.helper.website` | Field helper | `Ingresa el dominio principal de la marca que quieres medir.` | none | Clarifies the AEO diagnostic target |
| `growth.forms.aeo.form.pending` | Pending | `Validando datos y seguridad…` | none | Submit/email/captcha boundary should not feel frozen |
| `growth.forms.aeo.form.success` | Success | `Solicitud recibida. Prepararemos tu lectura inicial y te contactaremos pronto.` | none | Calm, enterprise, no inflated promise |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | none | fields visible | `Solicitar diagnóstico gratis →` | renderer mounted |
| loading | none | renderer loading state | none | should not cause blank card |
| empty | N/A | N/A | N/A | form contract must exist |
| partial | none | inline field errors close to field | fix field | corporate email gate; clear as soon as valid |
| error | submit error | sanitized renderer/server message | retry | no raw errors; keep stable, no decorative motion |
| denied | N/A | public form disabled/unavailable | contact fallback if renderer exposes it | only if API disabled |
| pending | none | `Validando datos y seguridad…` | disabled CTA + progress affordance | no spinner-only meaning |
| success | success message | `Solicitud recibida...` | optional direct conversation link | no confetti; preserve trust |

## Accessibility Contract

- Heading order: keep section H2; renderer field labels remain programmatic labels.
- Chart/table alternatives: N/A.
- Aria labels: field errors use renderer `aria-invalid`/`aria-describedby`; submit status uses renderer live regions.
- Focus notes: invalid submit moves focus to first invalid field; keyboard can complete all fields.
- Color-independent state labels: errors include text, not only border color.

## Implementation Mapping

- Route / surface: WordPress page `postId=250265`, URL `https://efeoncepro.com/aeo-2/`, section `convers`.
- Primitives: `<greenhouse-form form-key … surface … locale="es-CL" color-scheme="light">` portable renderer from `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`, with inner no-JS fallback (direct-link). Baseline composition keeps card chrome on `.gh-aeo-growth-form-card`; a renderer-owned chrome is allowed only if it beats the bridge in frame review without card-on-card. Theme via DM Sans, approved AEO colors and hardened field/button/select styles. Desktop renderer layout pairs short fields/selects (`Nombre`/`Email`, `País`/`Tamaño`) and keeps long intent fields full-width; mobile 390 stacks to one column. Pre-live gate is `pnpm public-website:verify-aeo-prelive-contract`, which checks WordPress bridge/`heroans`, typography, live bridge baseline, hostile Ohio fixture, real AEO composition preview in memory, desktop paired rows and saved frame health.
- Variants / kinds: Growth Forms `formKind=diagnostic_intake`, host surface `fhsf-efeonce-aeo-diagnostic`.
- Component candidates: existing HTML widget in `convers`; existing `.gh-aeo-conversion`, `.gh-aeo-form-card`, `.gh-aeo-growth-form-card` CSS scope.
- Copy source: `render_contract.copy.submit` for CTA; existing WordPress wrapper copy for section header/trust/privacy.
- Data reader / command: public GET/POST/verify-email APIs by AEO `formKey`; slug remains backward-compatible.
- API parity: WordPress only embeds renderer; validation, captcha, submit and destinations stay in Growth Forms.
- Access / capability: public host surface allowlist + CORS for `https://efeoncepro.com`.
- Runtime consumers: public browser, GTM/dataLayer, Growth Forms backend, HubSpot secure-submit dispatcher.
- Print/email/PDF considerations: N/A.
- GVC markers: existing `.gh-aeo-conversion`; add/keep renderer root marker with AEO `formKey` if needed for capture.
- Pre-live interaction gate: `pnpm public-website:verify-aeo-renderer-interaction-preview` injects the renderer in memory and captures focus, required-error and reduced-motion frames without mutating WordPress.

## GVC Scenario Plan

- Scenario file: use Playwright/GVC route capture for public URL; add scenario only if existing direct route capture cannot assert form states.
- Route: `https://efeoncepro.com/aeo-2/`
- Viewports: desktop `1440x1200`, mobile `390x1100`, reduced-motion.
- Required steps:
  - load page and scroll to `.gh-aeo-conversion`;
  - assert one visible premium card surface, no card-on-card;
  - assert `<greenhouse-form form-key>` is mounted and bridge-only class no longer owns submit logic;
  - assert field visual integrity: white fields, visible borders, clean selects, approved CTA color or approved modernized equivalent;
  - assert desktop paired rows for `Nombre`/`Email` and `País`/`Tamaño`; assert mobile 390 one-column without overflow;
  - run `pnpm public-website:verify-aeo-prelive-contract` before any live cutover to prove production still has the restored bridge, `heroans` is stable, controls survive hostile Ohio-like CSS, the real AEO composition works in memory and frame review is fresh/nonblank;
  - trigger required errors;
  - verify focus affordance and accessible error summary with recovery links;
  - enter Gmail/free email and assert inline block before submit;
  - verify corporate email path reaches Turnstile/submit boundary without raw errors.
- Required captures: conversion section desktop/mobile, field error state, email gate state, post-submit or fail-closed state.
- Required `data-capture` markers: `.gh-aeo-conversion`, renderer root, submit button.
- Assertions:
  - `scrollWidth == clientWidth` desktop and mobile 390;
  - desktop pairs short fields/selects into two columns while long intent fields span full width;
  - CTA text equals `Solicitar diagnóstico gratis →`;
  - form controls meet approved baseline or improved frame review: no grey slab inputs, no chevron-wall select, no dark/default CTA;
  - `form.formKey` equals the real AEO formKey from `TASK-1297`;
  - `security.captcha` present in contract;
  - no technical kicker;
  - form renders light even under `prefers-color-scheme: dark` (`color-scheme="light"`);
  - form typography uses the DM Sans stack (computed-style), consistent with the landing;
  - `verify-aeo-form-typography` (rewritten to `.ghf-*` control selectors) passes against the renderer;
  - `heroans` md5 unchanged.
- Scroll-width checks: desktop + mobile 390 via Playwright.
  - Accessibility/focus checks: first invalid field receives focus; errors are announced via ARIA attributes.
  - Reduced-motion evidence: computed transition/animation durations are reduced and renderer/page remain stable under reduced motion.

## Design Decision Log

- Decision: migrate only when `<greenhouse-form>` can match or improve the existing AEO form. The restored bridge is the no-regression baseline, not the aesthetic ceiling. 2026-06-30 pre-live evidence is green in fixture + real-composition preview; live cutover still requires `Document::save()`, hero hash guard, Kinsta purge and GVC/frame review on the saved page.
- Alternatives considered: keep bridge HTML longer; rewrite renderer styles inside WordPress; fork AEO-specific renderer.
- Why this pattern: the engine/renderer is now capable of Turnstile and email validation; keeping bridge logic would duplicate submit/captcha/validation by landing.
- Reuse / extend / new primitive: reuse portable renderer; no new UI primitive.
- Surface composition (F2 = Opción A, arch + product design): keep `.gh-aeo-growth-form-card` as the single visible surface wrapping a transparent renderer (`--ghf-bg: transparent`); do NOT give card chrome to the renderer. Rationale: one owner of card chrome (AEO landing CSS, consistent with market/pipeline/diagnostic cards), lowest blast-radius, reuses the already-gated surface. Alternative B (renderer themed as the card) rejected: re-creates card styling on the renderer and splits chrome ownership → drift.
- Modernization direction: more polished field grouping (desktop paired rows + long full-width fields), clearer helper copy, calmer pending/error/success feedback, visible focus, subtle press/validation feedback and stronger trust hierarchy are allowed if they improve confidence and remain enterprise-sober.
- Open risks: renderer default styling needs isolation/hardening to survive Ohio. First hardening exists for controls/CTA and is covered by `public-website:verify-aeo-prelive-contract`; Shadow DOM or equivalent host isolation remains the fallback if real composition frames still show host leakage after a governed live save.
- Follow-up: generalize additional theme tokens/microinteraction contracts only if a second landing needs the same treatment.

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
