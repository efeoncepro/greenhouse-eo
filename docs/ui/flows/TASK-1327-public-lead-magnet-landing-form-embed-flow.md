# TASK-1327 — Brand Visibility Public Lead Magnet Flow Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1327 — Public lead-magnet landing + embed del form gobernado`
- Related wireframe: [docs/ui/wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md](../wireframes/TASK-1327-public-lead-magnet-landing-form-embed.md)
- Intended route / surface: `think.efeoncepro.com/brand-visibility`
- Flow type: `cross-route`
- Primary primitives: Think Astro landing shell + governed `<greenhouse-form>` renderer + rich route-local loader/analysis states + existing report route `/brand-visibility/r/[token]`
- Copy source: local Think landing copy aligned to Greenhouse context and Growth Forms governed states

## Flow Brief

- Primary user: anonymous prospect evaluating whether to run the AI/Brand Visibility lead magnet.
- Entry moment: user lands from search, social, sales/email link or direct navigation.
- Successful outcome: user submits the governed form, sees an enterprise-grade analysis wait state, and reaches the private report on screen.
- Primary decision/action: complete the form after understanding what analysis/report the lead magnet will produce.
- Non-goals: make the landing a full methodology page, expose raw grader states, create a local intake endpoint, or index tokenized reports.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| `/brand-visibility` landing | Entry, lead magnet positioning, form host | First fold pairs editorial thesis, signal preview and form host; later sections add report preview and trust notes. | Form appears immediately after thesis/signal preview; sections stack in the same order. | Think Astro page |
| `<greenhouse-form>` | Governed data capture and submit | Embedded in a restrained panel, appearance bare, inherits container width with rich loading skeleton. | Full-width form host with stable spacing and visible focus. | Growth Forms renderer |
| Analysis wait panel | Post-submit wait while grader runs | Replaces the form lane with an enterprise analysis console: status chip, four governed stages, signal scan and live-region copy. | Full-width panel below thesis; no fake progress or cramped animation. | Think route-local state + GSAP |
| Report screen | Primary completion | The user is redirected or linked to `/brand-visibility/r/<token>` when the governed contract exposes readiness. | Same route, responsive report. | Think report route |
| Email delivery | Secondary recovery channel | Optional backup/link recovery, not primary UX completion. | Same. | Greenhouse email pipeline |
| `/brand-visibility/r/[token]` | Private report destination | Existing report renderer, `noindex`. | Existing responsive report. | Think report route |

## Flow Map

1. Entry: user opens `/brand-visibility`; page is indexable and presents Brand Visibility Grader as the literal offer.
2. Primary action: user reviews the lead magnet promise and fills the governed `<greenhouse-form>`.
3. Transition: submit is handled by the renderer; Greenhouse accepts the submission and enqueues the grader path.
4. Analysis wait: the form lane transitions into a rich analysis console with stage map, signal scan and copy that explains the governed wait. It may display real status only if a governed handle exists.
5. Completion: when the governed status/token is ready, the page exposes `Abrir informe`, plays a short report-ready overlay, stores a short-lived arrival flag, and opens `/brand-visibility/r/<token>`.
6. Recovery / exit: if the form cannot load, submit fails or origin authorization fails, the landing shows a safe degraded message and does not expose internals.

## Report-Aligned Wait Stages

Estas etapas derivan del reporte actual y sirven para orientar la espera. Solo pueden marcarse como completadas si el status gobernado lo confirma; en caso contrario se muestran como narrativa/skeleton sin progreso falso.

| Stage | Mirrors report block | User-facing purpose | Requires real status to mark complete? |
|---|---|---|---|
| `accepted` | Form submission accepted | Confirmar que los datos entraron al flujo gobernado. | yes |
| `queued` | Run creation | Explicar que el análisis se está preparando. | yes |
| `processing` | Executive summary / evidence model | Explicar que presencia, citabilidad, categoría y operabilidad se están preparando. | yes |
| `ready` | Report screen | Abrir o enlazar el reporte privado. | yes |
| `recovery_email` | Email delivery | Canal secundario si el usuario abandona o necesita recuperar el link. | n/a |
 
La UI puede enseñar el mapa de cuatro etapas desde el inicio del wait state, pero no usar checkmarks, porcentajes, motores completados ni "listo" sin status real.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Load landing | Browser | `landing.ready` or `form.loading` | n/a | Route must not require auth. |
| Renderer script resolved | `<greenhouse-form>` host | `form.ready` | n/a | Depends on TASK-1335 and render contract. |
| Submit form | User in renderer | `form.submitting` then `form.accepted` or `form.error` | Native submit | No local submit handler except renderer callbacks/events if documented. |
| Submission accepted | Renderer success event | `analysis.waiting` | n/a | Rich transition; actual status labels only if governed status exists. |
| Governed status ready | Governed status/token reader | `analysis.ready` | n/a | Required for primary UX; requires report URL/token/handle from trusted contract. |
| Retry load | Degraded form host | `form.loading` | Button Enter/Space | Only if the host can safely re-request the renderer. |
| Open report link | Analysis ready state or recovery email | `/brand-visibility/r/[token]` | Link activation | Token route remains noindex. |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| landing.ready | Landing shell and static sections are rendered. | Route load | Renderer starts loading | First fold must include thesis and form host. |
| form.loading | Renderer script or form contract is resolving. | Component mount | Contract success/error | Stable skeleton; no layout jump. |
| form.ready | Governed form fields are available. | Contract success | User submits | Host does not duplicate fields or validation. |
| form.submitting | Renderer is sending data to Greenhouse. | Native submit | Accepted/error | Disable duplicate submits via renderer behavior. |
| analysis.waiting | Submission accepted and grader is underway. | Renderer success | Ready status/token, error, user exit | Analysis console + stage map + signal scan; no fake percentages. |
| analysis.ready | Governed status reports a ready private report link/token. | Status/token reader | User opens report | CTA plus automatic report-ready overlay/redirect; only if URL/handle is provided by trusted contract. |
| form.accepted | Submission accepted for async grader. | Renderer success | analysis.waiting | Transitional fallback, not final UX. |
| form.error | Submission failed or renderer returned safe error. | Renderer error | Retry/edit | Safe copy, no raw stack/API details. |
| form.denied | Origin/surface is not authorized. | CORS/surface guard failure | TASK-1335/runtime fix | Pre-launch blocker, not acceptable as final. |
| report.opened | User opens tokenized report. | Ready status/CTA or recovery email link | n/a | Existing report route, noindex. |

## Routing Contract

- Route changes: `path`
- Canonical URL: `https://think.efeoncepro.com/brand-visibility`
- Deep-link behavior: canonical landing is shareable; optional hash anchors may target `#form` or `#report-preview` only if implemented accessibly.
- Back button behavior: browser back returns to the prior page; form state is not guaranteed after back/reload.
- Reload behavior: reload returns to `landing.ready` and re-resolves the form contract; no local draft persistence.
- Shareability: landing is public/indexable; report token links are private/noindex and not exposed in sitemap.

## Focus & Accessibility

- Initial focus: browser default; skip link should target main content.
- Escape behavior: none; no modal/drawer in V1.
- Click-away behavior: none.
- Focus restore: if retry or accepted states replace the form host, focus moves to the new state heading when technically possible.
- Modal vs non-modal semantics: all surfaces are in-flow and non-modal.
- Screen reader announcement: form load/error/accepted/analysis states use polite live region if the host controls them.
- Keyboard traversal: top nav, form fields, submit, retry/links and FAQ must be reachable in document order.
- Reduced motion: use the motion contract; ambient loaders collapse to static skeleton + text.

## Data & Command Boundaries

- Readers: Growth Forms public render contract for `formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`; governed public grader status/token reader required for on-screen report completion.
- Commands: Growth Forms public submit command owned by Greenhouse renderer.
- API routes: Greenhouse public forms APIs only; no Think API route for intake.
- Optimistic updates: analysis wait may show static next-step skeleton after accepted, but cannot mark steps complete unless status is real.
- Cache / invalidation: normal public asset caching for the landing; form contract caching follows Greenhouse renderer rules.
- Audit / signals: submission, consent, telemetry and grader run signals remain in Greenhouse.
- Tenant / access boundary: public unauthenticated origin must be explicitly authorized by governed surface allowlist (TASK-1335).

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Safe message that the form is unavailable from this surface. | Resolve TASK-1335/config; no local workaround. | Blocks completion. |
| not found / empty | Form unavailable message. | Retry; inspect render contract. | Do not create local fallback fields. |
| partial / degraded | Explain that the form could not fully load. | Retry or public contact link. | Avoid internal terms like CORS. |
| stale data | Renderer should refresh contract or fail safely. | Reload. | No local cache bypass unless renderer supports it. |
| timeout / API error | Safe error state in form host. | Retry. | No raw errors. |
| dirty exit | Browser/default behavior. | User can return and re-enter fields. | No local draft persistence. |
| status unavailable after accepted | Analysis panel cannot complete primary UX. | Treat as blocking contract gap or controlled fallback; do not ship as final TASK-1327. | Email can recover, but not replace on-screen report. |

## GVC Scenario Plan

- Scenario: Think Brand Visibility landing
- Scenario file: `scripts/frontend/scenarios/think-brand-visibility-landing.scenario.ts` or Think-local Playwright equivalent
- Route: `/brand-visibility`
- Viewports: 1440, 1280, 390
- Required steps: load, assert indexable meta, capture entry settled state, wait for form host, keyboard-tab into form, capture form loading/ready, capture submit accepted/analysis wait in controlled safe mode, capture report-ready transition when governed token/status is available, scroll preview/flow/trust, verify no report token is indexed from the landing.
- Required captures: desktop first fold, form loader, form ready, analysis wait, report-ready overlay/transition, desktop full page, mobile first fold, mobile analysis wait, mobile full page, form accepted/degraded if safely reproducible.
- Required `data-capture` markers: `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-signal-preview`, `brand-visibility-form`, `brand-visibility-form-loader`, `brand-visibility-analysis`, `brand-visibility-report-preview`, `brand-visibility-flow`, `brand-visibility-trust`.
- Assertions: no horizontal page overflow, no fake metrics/progress, no custom submit endpoint, route registered in `greenhouse.repo.json`, report token route remains noindex.
- Scroll-width checks: run at desktop and 390px mobile.
- Accessibility/focus checks: visible focus through header/form/retry; no trapped focus; headings in order.
- Reduced-motion evidence: capture/assert reduced-motion mode for entry, loader and analysis panel.

## Design Decision Log

- Decision: cross-route flow with a public indexable lead magnet page, governed form, rich GSAP analysis wait state, report-ready overlay and private noindex report destination.
- Alternatives considered: iframe form, local Astro form, instant in-page report generation, marketing-only page before the form, spinner-only success state.
- Why this pattern: it keeps Greenhouse as SSOT for form/submission/grader and lets Think remain the public renderer/hub while taking the user all the way to the on-screen report.
- Reuse / extend / new primitive: reuse Growth Forms renderer and existing Think report route; no new primitive.
- Open risks: TASK-1335 unresolved CORS/surface authorization; render contract may need publish/verification; submit/status contract may not expose the token/handle needed for on-screen report; rich motion must not hurt LCP/INP.
- Follow-up: if the submit/status contract cannot complete on-screen report delivery, split/raise the contract gap before TASK-1327 implementation.

## Acceptance Checklist

- [x] The owning task declares this file in `Flow`.
- [x] Every surface has desktop and compact behavior.
- [x] Opening, closing, escape and focus restore are specified.
- [x] Route/deep-link/back-button behavior is explicit.
- [x] Data readers/commands are named and UI-only business logic is avoided.
- [x] Failure paths are user-safe and do not expose internals.
- [x] GVC sequence captures prove the flow, not only static screens.
- [x] Design decision log explains why the flow uses these surfaces/routes.
