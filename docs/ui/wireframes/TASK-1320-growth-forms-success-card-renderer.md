# TASK-1320 — Growth Forms Success Card Renderer Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1320 — Growth Forms Success Card — Renderer (ui-ux)`
- Product Design asset: `none — contract-first platform capability`
- Intended consumers: Growth Forms renderer, WordPress/Astro/Next.js host surfaces, AEO `/aeo-2/`, future lead magnets
- Copy source: `success_behavior_json` browser-safe copy refs + renderer locale fallback
- Primitive decision: `extend` — extend Growth Forms renderer success state into a reusable in-card success card pattern
- UI ready target: `no`

## Brief

- Primary user: anonymous public visitor who submitted a Growth Form.
- User moment: immediately after a successful `accepted` public form submission.
- Job to be done: know that the request was received, understand what happens next, and optionally take one governed next action without leaving the host page by default.
- Primary decision signal: the user should trust that the form was received and know the next safe step.
- Non-goals: Thank You page, HubSpot embed, host-owned success DOM, exposing submission details, promising destination delivery, or creating a lead magnet asset service in this slice.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Status mark | Communicate completion without color-only success | Renderer local `ghf-success-card__mark` | `successBehavior.presentation` / renderer fallback |
| 1 | Header | State the accepted outcome in one sentence | `h3` or nearest valid heading level inside renderer root | `successBehavior.titleCopyRef` or `title` |
| 2 | Body | Explain what was accepted and avoid overpromising downstream delivery | Paragraph block | `successBehavior.bodyCopyRef` or `body` |
| 3 | Next steps | Show 2-4 bounded steps such as review, email follow-up, scheduling | Ordered/list semantics | `successBehavior.steps[]` |
| 4 | Reward / asset offer | Optional gift/ebook/download/case-study reveal | Action block, not raw asset URL leakage | `successBehavior.reward` browser-safe metadata |
| 5 | Actions | Optional CTA(s) after acceptance | Native buttons/links styled by renderer tokens | `successBehavior.actions[]` |
| 6 | Support note | Privacy/support/retry context | Muted note | `successBehavior.supportingNoteCopyRef` or `supportingNote` |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `growth.forms.success.default.title` | Header | `Recibimos tu informacion` | none | Generic fallback, not AEO-specific. |
| `growth.forms.success.default.body` | Body | `Tu solicitud quedo registrada. La estamos revisando y aqui mismo te mostramos el siguiente paso.` | none | Honest `accepted`: NO promete contacto saliente ni tiempos (dispatch es async at-most-once, la entrega a HubSpot puede dead-letter). "Te contactaremos" solo es valido bajo un contrato que lo pruebe (p. ej. `review_pending`). |
| `growth.forms.success.default.step.review` | Next steps | `Validamos la informacion enviada.` | none | Optional default. |
| `growth.forms.success.default.step.context` | Next steps | `Revisamos el contexto de tu marca.` | none | Optional for diagnostic/lead forms. |
| `growth.forms.success.default.step.follow_up` | Next steps | `Te proponemos el siguiente paso.` | none | Avoid time promises unless contract supplies them. |
| `growth.forms.success.reward.ebook.title` | Reward | `Te dejamos un recurso para empezar` | reward label | For ebook/gift cases. |
| `growth.forms.success.reward.ebook.body` | Reward | `Puedes descargarlo ahora sin volver a completar el formulario.` | asset label | Do not expose private token in copy. |
| `growth.forms.success.action.schedule` | Action | `Agendar una conversacion` | URL from allowlisted action | External CTA allowed only through contract allowlist. |
| `growth.forms.success.action.download` | Action | `Descargar ebook` | asset label | May call governed asset access route or public allowlisted URL. |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Recibimos tu informacion` | `Tu solicitud quedo registrada. La estamos revisando...` | Optional next action | Replaces the form after `accepted`. Sin promesa de contacto saliente ni tiempos. |
| loading | N/A | N/A | N/A | Existing submit pending state stays before success. |
| empty | N/A | N/A | N/A | Success card requires accepted submission. |
| partial | `Recibimos tu informacion` | `El siguiente paso puede tardar unos minutos en quedar disponible.` | Optional retry/access action | Use only when reward/action is temporarily unavailable. |
| error | Existing form error copy | Existing recovery | Existing retry | No thank-you on rejected/invalid/captcha failure. |
| denied | Existing unauthorized/disabled copy | Existing recovery | Existing recovery | No success card. |

## Accessibility Contract

- Heading order: renderer must not inject an `h1`; use a configurable or safe inner heading (`h3` default) and avoid fake headings.
- Chart/table alternatives: N/A.
- Aria labels: success panel uses `role="status"` or equivalent polite announcement; optional reward/action controls have visible labels and accessible names.
- Focus notes: after accepted submit, focus moves to the success card container with `tabindex="-1"`; CTA tab order follows visible order.
- Color-independent state labels: success is communicated with title/body/icon shape, not green color alone.

## Implementation Mapping

- Route / surface: portable `<greenhouse-form>` renderer inside WordPress/Astro/Next.js host surfaces; first runtime verifier is public AEO `/aeo-2/`.
- Primitives: extend Growth Forms renderer internal status UI; do not create WordPress-local DOM behavior.
- Variants / kinds: `success-card` presentation for `inline_message` or new `inline_card` success behavior; optional reward variants `none|download|external_link|asset_access`.
- Component candidates: `src/growth-forms-renderer/renderer.ts`, `src/growth-forms-renderer/styles.ts`, `src/growth-forms-renderer/contract.ts`, `src/lib/growth/forms/contracts.ts`, `src/lib/growth/forms/policy-compiler.ts`.
- Copy source: `success_behavior_json` and `copy_refs_json`, with renderer locale fallback in `src/growth-forms-renderer/copy.ts`.
- Data reader / command: published render contract reader and public submit command; no UI-only state source.
- API parity: public render contract carries browser-safe success card metadata; submit endpoint remains the acceptance primitive.
- Access / capability: public anonymous form surface, protected by existing host surface/CORS/embed/captcha/rate-limit policies.
- Runtime consumers: Web Component, WordPress host, Astro host, Greenhouse preview/test harness, public verification scripts.
- Print/email/PDF considerations: N/A for V1.
- GVC markers: success card wrapper `data-capture="growth-form-success-card"`, reward block `data-capture="growth-form-success-reward"` when present, action row `data-capture="growth-form-success-actions"`.

## GVC Scenario Plan

- Scenario file: extend AEO live verifier or add `scripts/frontend/scenarios/growth-forms-success-card.ts` if the generic scenario harness supports public routes.
- Route: `/aeo-2/` for first consumer; generic fixture page if available for non-AEO renderer tests.
- Viewports: desktop 1440/2048 and mobile 390.
- Required steps: load form, fill valid data, complete Turnstile/test harness path where available, submit, wait for accepted response, assert form fields are replaced by success card.
- Required captures: full conversion card before submit, success card after submit, mobile success card, reduced-motion success state if supported by scenario.
- Required `data-capture` markers: `growth-form-success-card`, `growth-form-success-reward`, `growth-form-success-actions`.
- Assertions: no visible legacy bottom-only message, no `firstName`/PII echo, no raw `submissionId`, no `fullName` echo, card has title/body, optional reward/action renders only from allowlisted contract.
- Scroll-width checks: `scrollWidth == clientWidth` desktop and mobile 390.
- Accessibility/focus checks: active element is success card or first intentional CTA after render; status announcement semantics present.
- Reduced-motion evidence: transition collapses to immediate content swap with no hidden content or delayed focus.

## Design Decision Log

- Decision: implement the thank-you experience as a reusable Growth Forms in-card success card governed by `success_behavior_json`.
- Alternatives considered: Thank You page redirect, WordPress-local script replacing the card, HubSpot native form success message, generic toast.
- Why this pattern: it preserves the host page context, prevents per-host drift, keeps destination details server-side, and creates a reusable lead-magnet/reward capability for all forms.
- Reuse / extend / new primitive: extend existing Growth Forms renderer status primitive; create a named success-card presentation if needed.
- Open risks: asset/reward URLs can leak if the contract is too permissive; copy can overpromise destination delivery; success state can cause layout jump on mobile.
- Follow-up: a future governed asset access primitive may be needed for private downloads, tokenized reports or personalized lead magnets.

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
