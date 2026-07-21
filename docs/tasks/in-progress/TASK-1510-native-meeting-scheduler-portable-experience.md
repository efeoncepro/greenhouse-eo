# TASK-1510 — Native Meeting Scheduler Portable Experience

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1510-native-meeting-scheduler.md`
- Flow: `docs/ui/flows/TASK-1510-native-meeting-scheduler-flow.md`
- Motion: `docs/ui/motion/TASK-1510-native-meeting-scheduler-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Temporal Operations Desk y adapter Growth CTA nativo promovidos; flags staging/Production y binding piloto activos. El host WordPress aislado /agenda está live con disponibilidad real; la recuperación es nativa y no expone enlaces HubSpot. Siguen pendientes booking controlado, evidencia de medición y publish GTM.`
- Rank: `TBD`
- Domain: `growth|public-site|ui`
- Blocked by: `none`
- Branch: `task/TASK-1510-native-meeting-scheduler-portable-experience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye `<efeonce-meeting-scheduler>`, una experiencia portable, rica y moderna para elegir un horario y reservar mediante TASK-1509. La dirección activa usa un calendario mensual inequívoco, una agenda del día seleccionado y un resumen persistente. “Time Horizon” fue rechazada en el checkpoint visual porque no se reconocía como calendario.

Los dos resultados centrales son estética diferencial y medición GTM de extremo a extremo. El renderer emite un funnel allowlisted sin PII; sólo la primera respuesta con recibo server-confirmed habilita `gh_meeting_booking_confirmed -> generate_lead`. La recuperación ocurre dentro del scheduler; un outcome ambiguo exige revisar el correo y nunca ofrece un segundo booking inmediato.

## Why This Task Exists

El iframe funciona pero impone estética, pasos y scroll ajenos. Un simple calendario blanco no justificaría reemplazarlo. El nuevo scheduler debe convertirse en una pieza distintiva del sitio, hacer tangible la disponibilidad y permitir medir dónde se pierde intención —vista, slot, datos, validación o booking— sin confundir interacción con conversión.

## Goal

- Entregar un Web Component host-neutral con calendario mensual, agenda diaria y resumen de reunión accesibles y responsive.
- Instrumentar el funnel completo en GTM/GA4 con evento genérico + parámetros y cero PII.
- Confirmar visualmente el booking sólo desde el recibo server-side de TASK-1509.
- Pilotear un host público controlado con rollback instantáneo al embed/link.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/tasks/to-do/TASK-1509-growth-meetings-scheduler-server-adapter.md`

Reglas obligatorias:

- La riqueza se logra con composición, visualización temporal, profundidad, typography, responsive transformation y motion causal; no con gradients/cards/particles genéricos.
- El renderer sólo consume DTOs browser-safe; no importa provider SDK, secret, store o server-only modules.
- No hay booking optimista. Success y `generate_lead` requieren el recibo server-confirmed.
- WordPress/Think sólo configuran atributos allowlisted y placement; no duplican fields, booking, consent o telemetry.
- Los estados de carga/degradación ofrecen recuperación nativa por reintento o navegación mensual. Después de `provider_dispatched`, un outcome ambiguo o booking provider-created-invalid bloquea otro intento o vía de reserva; esta task no toca `book_meeting`/Action Registry de TASK-1431.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`
- `docs/reference/measurement-gtm-ga4/LEARNINGS.md`
- `docs/ui/visual-directions/TASK-1510-native-meeting-calendar-direction.md`
- `docs/ui/wireframes/TASK-1510-native-meeting-scheduler.md`
- `docs/ui/flows/TASK-1510-native-meeting-scheduler-flow.md`
- `docs/ui/motion/TASK-1510-native-meeting-scheduler-motion.md`

## Dependencies & Impact

### Depends on

- TASK-1509 DTOs/errors/fixtures, receipt and feature-flag contract.
- Portable custom-element patterns in `src/growth-forms-renderer/**`.
- Governed WordPress runtime export/diff/release process.
- GTM container `GTM-NGHPGRLZ` and GA4 property `486264460` after measurement ID read-back.

### Blocks / Impacts

- Enables gradual native-scheduler rollout across Efeonce public surfaces.
- Creates a reusable design/measurement system for meeting conversion, not a page-local widget.
- Future CTA routing remains separate until TASK-1431 ownership is released.

### Files owned

- `src/growth-meeting-renderer/**`
- `src/lib/copy/growth-meetings*`
- `scripts/frontend/scenarios/native-meeting-scheduler.scenario.ts`
- `scripts/gtm/build-meeting-scheduler-workspace.ts`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/reference/measurement-gtm-ga4/container-snapshot.json` after approved publish.
- `docs/ui/visual-directions/TASK-1510-native-meeting-calendar-direction.md`
- `docs/ui/wireframes/TASK-1510-native-meeting-scheduler.md`
- `docs/ui/flows/TASK-1510-native-meeting-scheduler-flow.md`
- `docs/ui/motion/TASK-1510-native-meeting-scheduler-motion.md`
- `docs/ui/reviews/TASK-1510-native-meeting-scheduler-review.md`
- Exact public-site host files identified by governed runtime diff before edit.

## Current Repo State

### Already exists

- Growth Forms proves a portable host-DOM custom-element pattern across Greenhouse/WordPress.
- HubSpot Scheduler remains the server-side provider; its embed/link is not part of the native user experience.
- GTM already receives generic Growth Form and CTA families; Tracking Plan owns tagging state.
- TASK-1509 provides one safe booking/measurement authority.

### Gap

- No native renderer, semantic month calendar, daily agenda, state machine or accessible slot picker exists.
- Meeting embeds only expose coarse viewed/loaded/failed measurement; no native funnel or server-confirmed conversion rail exists.
- No GVC premium scenario or frontier visual source exists for this surface.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-meeting-renderer/**` as portable bundle consumed by governed public hosts.
- Future candidate home: `ui-package`
- Boundary: the `efeonce-meeting-scheduler` custom element consumes TASK-1509 DTOs/errors and emits allowlisted lifecycle events; hosts own only placement/appearance.
- Server/browser split: browser owns interaction/display/dataLayer; provider, secrets, PII policy, idempotency, receipt and conversion authority stay server-side.
- Build impact: one explicit renderer entrypoint/bundle using existing build patterns; no heavy animation/provider SDK.
- Extraction blocker: current public tokens/copy/bundle publishing remain in Greenhouse until authorized extraction.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: prospecto público de alta intención que quiere coordinar una conversación con Efeonce.
- Momento del flujo: CTA principal de una landing o contacto, antes de hablar con el equipo.
- Resultado perceptible esperado: reconocer un calendario al instante, elegir fecha/hora sin fricción y recibir un resumen confirmado con calendario/Teams.
- Friccion que debe reducir: iframe ajeno, scroll interno, calendario utilitario, timezone incierta y medición ciega entre click y booking.
- No-goals UX: agenda administrativa, login, chat-bot, marketing-consent preseleccionado, reschedule/cancel propio.

### Surface & system decision

- Surface: Web Component embebible con demo deterministic y primer host público gobernado.
- Composition Shell: `no aplica` — public portable experience; el host conserva su shell editorial.
- Primitive decision: `new` — `<efeonce-meeting-scheduler>` como public host-adapter reusable; no private Greenhouse primitive.
- Adaptive density / The Seam: `aplica` — un controlador conserva el intent y resuelve recetas `launcher|guided|split|command` por tamaño de contenedor, no por viewport.
- Floating/Sidecar/Dialog decision: un Growth CTA angosto permanece launcher y abre una task surface accesible (`dialog` desktop, `full_screen` mobile); un host editorial ancho puede usar `inline` o `page`. El CTA nunca se expande en un scheduler gigante.
- Copy source: `src/lib/copy/*`; no strings de error/success en hosts.
- Access impact: `none`; surface/origin/anti-abuse los gobierna TASK-1509.

### State inventory

- Default: calendario mensual estable en la zona IANA detectada del visitante, fechas disponibles y agenda del día seleccionado; la zona de la surface sólo cubre detección ausente/inválida.
- Loading: skeleton estructural de calendario; sin fechas o slots falsos.
- Empty: mes sin disponibilidad con navegación bounded.
- Error: recovery inline, provider-safe y retry.
- Degraded / partial: freshness/availability no autoritativa se rotula; no simula slots.
- Slot conflict: el resumen entra a warning, preserva datos no sensibles, refresca calendario y devuelve foco.
- Validation: progresiva y reactiva; un campo virgen permanece neutral, el blur activa validación y una corrección posterior actualiza error/éxito mientras se escribe. El resumen aparece sólo al intentar continuar, los mensajes tienen región live estable y la selección se preserva.
- Corporate email: separa sintaxis local de verificación corporativa asíncrona con estados pending/success/error, copy específico para personal/desechable y submit inactivo durante un veredicto pendiente o rechazado; blur verifica inmediatamente y el input usa debounce. Una degradación de red no suplanta la autoridad server-side de TASK-1509.
- Booking pending: el resumen cambia a processing, CTA bloqueada, sin auto-retry.
- Success: el resumen se transforma en recibo confirmado con fecha/zona local/duración/expectativa Teams; cero IDs.
- Permission denied: surface inválida muestra indisponibilidad genérica sin filtrar detalles de policy.
- Long content: timezone/legal/copy envuelven sin romper calendario, agenda o resumen.
- Mobile / compact: receta `guided` con una decisión por plano, strip de fechas y acceso explícito a “Ver mes”; el mes semántico no desaparece. Targets >=44px y cero overflow.
- Keyboard / focus: tabla con caption/headers, botones sólo en días disponibles, slots cronológicos, foco visible y restauración a heading/error.
- Reduced motion: same information architecture, instant transformations, no meaning lost.

### Interaction contract

- Primary interaction: inspect month -> select date/slot -> inspect summary -> details/consent -> reserve -> confirmed summary.
- Hover / focus / active: available/selected states use interactivity, shape, text/dot and border, never color alone.
- Pending / disabled: disabled reason visible; stable idempotency key throughout intent.
- Escape / click-away: el host de diálogo contiene/restaura foco y permite cierre seguro. Tras dispatch, cerrar oculta pero no destruye el controlador ni habilita un segundo booking.
- Focus restore: step heading; conflict alert then first available slot; back returns to selected slot; success heading.
- Latency feedback: causal status; after 8s show “seguimos confirmando” without resubmitting.
- Toast / alert behavior: primary state inline/live region; no host toast duplication.

### Motion & microinteractions

- Motion primitive: tokenized CSS only for short selection/state continuity.
- Enter / exit: calendar, agenda and steps use direct or short state transitions; no decorative entrance.
- Layout morph: selected slot becomes an inline summary; CTA activation establishes a new task surface and never morphs the small host into a large inline application.
- Stagger: subtle only for contextual labels, never slots.
- Timing / easing token: canonical public motion tokens; no scattered literal timings/easings.
- Reduced-motion fallback: direct state swap and equivalent focus/live-region behavior.
- Signature microinteractions: month navigation, selected date/time and confirmed summary; all causal and bounded.

### Implementation mapping

- Surface: `src/growth-meeting-renderer/**`; deterministic demo host + approved staging public host.
- Primitive / variant / kind: new `<efeonce-meeting-scheduler activation-mode="inline|dialog|full_screen|page" max-recipe="guided|split|command">`; resolved recipe is container-driven and is not a host-forced appearance.
- Internal components: scene shell, context rail, visitor timezone label, semantic month table, daily agenda, step rail, attendee fields, selected summary and native recovery.
- Copy source: `src/lib/copy/growth-meetings*` or nearest existing growth dictionary confirmed in Discovery.
- Reader / command: TASK-1509 config/availability/book only.
- API parity: no UI-only write/success; server receipt gates confirmation.
- Browser events: canonical `gh_meeting_step_reached` plus dataLayer-only `gh_meeting_booking_confirmed`; strict parameter allowlist from TASK-1509. GTM maps only the latter to `generate_lead` and never forwards the custom confirmation name to GA4.
- GTM mapping: one generic GA4 tag for Tier B funnel; one conversion tag mapping confirmed to `generate_lead`; add allowlisted `presentation_variant` and `activation_mode` before publish. Resize/recipe changes are diagnostic context, never funnel steps.
- States: complete state inventory, including ambiguous timeout and retry recovery.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/native-meeting-scheduler.scenario.ts`.
- Routes: deterministic local demo and approved staging host.
- Viewports: 1440x1000 and 390x844.
- Quality profile: `premium`.
- `qualityProfile: 'premium'`; keyboard probes; `reducedMotionCheck: true`.
- Steps: view -> availability -> date/slot -> details -> validation -> pending -> confirmed; plus empty/conflict/degraded/retry.
- Captures: calendar first fold, date/time selection, inline summary, details, pending, confirmed summary, degraded/retry and compact transform.
- Markers: `native-meeting-scheduler`, `meeting-calendar`, `meeting-agenda`, `meeting-details`, `meeting-summary`.
- Assertions: no console/page errors, no PII in dataLayer, exact expected events once, `/g/collect` payloads, one primary action, focus destinations, 44px targets and `scrollWidth===clientWidth`.
- Review dossier: `docs/ui/reviews/TASK-1510-native-meeting-scheduler-review.md`.
- Baseline decision: the official HubSpot embed on the selected pilot surface is the functional/CRO baseline; the accepted monthly-calendar captures become the visual baseline after human approval. Time Horizon remains only as a negative comparison.

### Design decision log

- Selected “Temporal Operations Desk”: compact dossier, continuous monthly canvas and booking inspector keep calendar recognition immediate while increasing productive density.
- Rejected after baseline review “Editorial Concierge”: the large narrative rail and nested gradient summary felt promotional rather than enterprise/task-native.
- Rejected “Time Horizon”: abstract week strip and density bars did not read as a calendar.
- Rejected “Calendar Console”: polished but administrative, dense and aesthetically incremental.
- Rejected “Conversational Scheduler”: novel but hides comparison, adds turns and weakens keyboard/recovery.
- Reuse / extend / new: new portable public adapter; reuse tokens/control/a11y/telemetry patterns; no private primitive or page-local form.
- Measurement decision: generic interaction event + parameterized funnel; only receipt-gated confirmed maps to key event.
- Open risks: real provider latency and exact host constraints require staging evidence after TASK-1509.
- Implementation debt found 2026-07-21: `appearance` is observed but does not resolve a view, full `replaceChildren` can break focus/state continuity, and automatic first-date selection currently emits `date_selected` without user intent. Adaptive implementation must resolve these before pilot.

### Visual verification

- Design-studio full loop: readiness -> calendar first-fold checkpoint -> full states -> premium GVC dossier -> score >=4.5/no dimension <4 -> UI/enterprise reviews.
- Additional task-specific floor: visual impact, responsive transformation, motion and generic-template resistance each >=4.5.

<!-- ZONE 2 — PLAN MODE: executor-owned; intentionally empty at registration -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Monthly calendar first fold

- Build custom-element lifecycle, scene/token contract, fixture client, semantic month and selected-day agenda.
- Capture desktop/390 first fold and pause for ACCEPT/REVISE before full wiring.

### Slice 2 — Flow, states and telemetry source

- Wire config/availability/book, fields/consent, conflict/timeout/degraded states and full a11y.
- Emit/dedupe allowlisted funnel events and receipt-gated confirmation event; add parity/PII tests.

### Slice 3 — GTM workspace and governed host

- Build DLVs, triggers and generic GA4 tags in GTM workspace; read back shapes and preview without publishing.
- Export/diff public runtime and add the smallest host adapter behind a flag.

### Slice 4 — Premium evidence, publish gate and pilot

- Run GVC, scorecard, browser dataLayer/`/g/collect`, first real booking and HubSpot/Outlook read-back.
- Present GTM workspace diff and request explicit human confirmation before create-version/publish; snapshot after approved publish.
- Pilot one allowlisted surface and monitor before any graduation.

## Out of Scope

- Backend adapter/idempotency/receipt/PII authority (TASK-1509).
- Removing all embeds, global CTA cutover or editing TASK-1431.
- Reschedule/cancel UI, payments, login or sales-routing redesign.
- Publishing GTM or flipping production without explicit human confirmation.

## Detailed Spec

The renderer is a standalone custom element with an explicit state reducer. Rendering, accessibility and telemetry consume the same typed actions so visual state and measurement cannot drift. The month table is a date-selection surface over normalized availability, not an event-management calendar. The selected-meeting summary may enter `confirmed` only from TASK-1509's successful conversion receipt. Hosts provide placement/configuration attributes; they never fork the flow or inject provider links.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1509 fixtures -> Slice 1 checkpoint -> TASK-1509 staging ready -> Slice 2 -> Slice 3 preview -> Slice 4 confirmation/pilot.
- No public native booking while the backend flag is OFF or the native recovery contract is not available.
- No GTM publish before Preview/Tag Assistant + `/g/collect` + explicit human OK.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rich UI hurts booking clarity/perf | UI/CRO | medium | one action, performance budget, first-fold + funnel evidence | visual score + abandonment step |
| Stale slot displayed | HubSpot/UI | medium | server revalidation + conflict recovery | booking conflict |
| Host CSS breaks scene | WordPress | medium | scoped bundle/tokens + live GVC | diff/overflow |
| GTM double-counts or leaks PII | measurement/privacy | low | generic allowlist, receipt gate, parity/negative tests | `/g/collect` audit |
| Native path fails | conversion | low | in-product retry + flag/version rollback | availability_failed + booking_failed |

### Feature flags / cutover

- Consumes `GROWTH_NATIVE_MEETING_SCHEDULER_ENABLED`.
- OFF -> native surface unavailable/version rollback; shadow -> invisible/deterministic validation; pilot -> native on one allowlisted surface; graduation later.
- Revert: flag OFF + host cache purge; no calendar/CRM data migration.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–2 | revert bundle; fixtures have no external state | minutes | yes |
| 3 | discard GTM workspace + flag OFF host | <15 min | yes |
| 4 | publish prior GTM version if needed, flag OFF, reconcile confirmed event | bounded | partial for created meetings |

### Production verification sequence

1. Task/readiness/wireframe/flow/motion gates.
2. First-fold desktop/390 ACCEPT.
3. Full state/a11y/telemetry suites.
4. Staging real availability and native recovery.
5. GTM workspace preview + browser dataLayer/`/g/collect`, no publish.
6. Approved real booking and HubSpot/Outlook/Teams read-back.
7. Human confirms GTM publish; create version/publish/snapshot/realtime verify.
8. Pilot one surface; compare view->slot->details->confirmed/recovery and visual evidence before graduation.

### Out-of-band coordination required

- Kinsta/public runtime rollout approval.
- Approved recipient/time and optional inbox inspection.
- Human first-fold acceptance, enterprise verdict, GTM publish and production flag flip.

<!-- ZONE 4 — VERIFICATION & CLOSURE -->

## Acceptance Criteria

- [x] UI artifacts pass readiness and preserve `UI ready: yes` before JSX.
- [x] Monthly calendar/daily agenda is materially clearer than the rejected picker and validated visually at 1440/390.
- [x] Renderer consumes only TASK-1509 browser contracts and contains no provider/store/server imports.
- [ ] Full state inventory is accessible at desktop/390; confirmed and empty-month flows pass keyboard/no-overflow locally, while degraded/conflict/ambiguous remain pending in the staging dossier.
- [x] `gh_meeting_step_reached` covers the local fixture funnel with strict generic parameters, valid pairs and no PII/exact slot.
- [x] `gh_meeting_booking_confirmed` emits exactly once per server receipt in reducer/browser tests; GTM mapping/publish remains pending.
- [x] GTM generic tags are built/read back/quick-previewed in disposable workspace 6; publish still requires explicit human confirmation and live evidence.
- [x] Host público gobernado de piloto en `https://efeoncepro.com/agenda/` (WP `251583`, `noindex`) usa exclusivamente la experiencia nativa y conserva rollback operativo por flags/binding o backups Elementor; no sustituye todavía Contacto/RRSS.
- [x] Growth CTA exposes an additive `open_meeting_scheduler` action; `book_meeting` remains navigation-only. The native adapter lazy-loads, uses dialog/full-screen activation and preserves one connected scheduler across close/reopen.
- [ ] One controlled native booking verifies renderer -> adapter -> HubSpot/Outlook/Teams and `/g/collect`/GA4 evidence.

## Verification

- [ ] `pnpm codex:task-hook TASK-1510`
- [x] `pnpm task:lint --task TASK-1510`
- [x] `pnpm ui:wireframe-check --task TASK-1510`
- [x] `pnpm ui:flow-check --task TASK-1510`
- [x] `pnpm ui:motion-check --task TASK-1510`
- [x] `pnpm ui:readiness-check --task TASK-1510`
- [x] Renderer focal suite: 39 passed across 7 files; broader server/a11y/telemetry/timezone evidence remains green; ESLint, TypeScript and production build pass.
- [x] `pnpm fe:capture native-meeting-scheduler --env=local` — premium, 1440×1000 + 390×844, 24 frames, exit 0; only `baseline_stale` warning pending human approval.
- [x] `pnpm fe:capture:review .captures/2026-07-21T08-43-09_native-meeting-scheduler`
- [x] Timezone/GVC recheck: `.captures/2026-07-21T09-45-48_native-meeting-scheduler`, 22 frames desktop/mobile, exit 0; labels and GMT offset fit without overflow.
- [x] Los campos usan el subset canónico Iconify/Tabler (`user|id|mail|building-skyscraper`) generado en build; no contienen SVG manual ni dependen del CSS del host.
- [x] Iconography GVC recheck: `.captures/2026-07-21T09-52-43_native-meeting-scheduler`, 22 frames desktop/mobile, exit 0; `tabler-mail` y el set completo revisados visualmente.
- [x] Premium 2026 pass GVC: `.captures/2026-07-21T10-31-38_native-meeting-scheduler`, 36 frames command/split/guided,
  exit 0; no runtime/accessibility/layout/performance/enterprise-rubric findings. The immediate date-selection frame
  remains visible, targets are >=44 px and reduced-motion reaches the same state.
- [x] Enterprise UI scorecard: average 4.66/5, no dimension <4 and key premium dimensions >=4.5; visual verdict `PASS`.
- [x] CTA/scheduler contract suite: 171 tests across 25 files; action-registry/parity, lazy task-surface lifecycle, reopen continuity and responsive activation pass. TypeScript and focal ESLint pass.
- [x] CTA seam GVC `.captures/2026-07-21T11-22-29_growth-cta-native-meeting`: 10 frames, desktop/mobile, exit 0; launcher compacto, dialog/full-screen, teclado/reduced-motion y selección preservada al reabrir. Sólo `baseline_stale` pendiente de aprobación humana.
- [x] Reactive validation GVC `.captures/2026-07-21T11-37-07_native-meeting-scheduler`: 39 frames en 1440/820/390, exit 0; neutral→invalid→valid, rechazo corporativo, teclado, reduced-motion, accessibility, layout, runtime y enterprise rubric verdes. Vitest focal 13/13, TypeScript (heap 8 GB), ESLint y bundle portable verdes.
- [x] `pnpm fe:capture:review .captures/2026-07-21T11-37-07_native-meeting-scheduler` — dossier regenerado desde la captura aprobada.
- [x] Confirmation shell GVC `.captures/2026-07-21T12-01-53_native-meeting-scheduler`: 45 frames en
  1440/820/390, transition+settled, exit 0; el éxito reemplaza todo el scheduler, conserva foco/ARIA/reduced-motion,
  no presenta overflow ni PII/receipt y pasa runtime/accessibility/layout/performance/enterprise rubric.
- [x] Copy/UX writing/CRO/commercial audit: all scheduler strings are canonicalized, provider-neutral where appropriate,
  action-led, recovery-oriented and aligned to the 30-minute Microsoft Teams expectation. GTM audit reconfirmed stable
  semantic event identity, no copy-derived parameters, no PII/exact slot and `generate_lead` only from a server receipt.
- [x] Final copy GVC `.captures/2026-07-21T12-18-17_native-meeting-scheduler`: 45 frames at 1440/820/390, exit 0;
  revised strings fit without clipping/overflow and validation, confirmation, keyboard, reduced-motion and enterprise
  rubric remain green. The immediately prior cold-build capture exceeded local FCP only; the warm canonical rerun passed.
- [ ] `pnpm fe:capture native-meeting-scheduler --env=staging`
- [ ] `pnpm fe:capture:review <capture-dir>`
- [ ] `pnpm ui:quality --task TASK-1510`
- [x] GTM workspace read-back/quick preview (`compilerError=false`, `syncOk=true`); browser `/g/collect` remains a live-host rollout gate.
- [x] Runtime activation 2026-07-21: `GROWTH_NATIVE_MEETING_SCHEDULER_READ_ENABLED=true` + `GROWTH_NATIVE_MEETING_SCHEDULER_ENABLED=true` in staging/Production, fresh production deployment Ready, and pilot binding `fhsf-efeonce-lead-gen-web`/`discovery` switched to `active`. Public-origin config and availability returned 200 with visitor timezone `America/New_York`; no booking was created for this activation check.
- [x] WordPress pilot 2026-07-21: `/agenda/` page `251583` published as `noindex` with `<efeonce-meeting-scheduler>`. Live Playwright confirmed renderer/real slots in normal Ohio template, desktop + 390 px `overflow=0`, recipes `split|guided`, no console errors, and one allowlisted `gh_meeting_step_reached` dataLayer event without PII/exact slot; no booking or GTM publish was performed. The native-only amendment removes every visible HubSpot link and retains retry/month navigation as recovery.
- [x] Empty-month regression 2026-07-21: HubSpot returns zero August slots, but July→August now keeps `Agosto de 2026`, the semantic 31-day grid, month-specific recovery copy and bounded navigation. Vitest verifies focus restoration and return to July; local browser review at 1440/390 reports zero overflow and console errors. PR #162 was released at SHA `ddd3094538e7` (orchestrator `29848667096`, manifest `released`); the operator's authenticated Chrome session confirmed the full August grid and `overflow=0` live on `/agenda/` without creating a booking.
- [x] Native-only recovery amendment 2026-07-21: WordPress page `251583` was saved through Elementor `Document::save()` after removing its child/page-level HubSpot anchors and fallback CSS; backup `_gh_backup_before_agenda_native_only_20260721T170615Z`, readback `schedulerHosts=1`, `hubspotLinks=0`, protected meta stable. The portable renderer and Growth CTA now expose only native retry/month navigation, covered by 75 focal Vitest tests, TypeScript, ESLint and production build. Premium GVC `.captures/2026-07-21T17-02-42_native-meeting-scheduler` passed 45 frames at 1440/820/390 with zero runtime/layout/a11y errors; bundle rollout remains the final operational step.
- [ ] `pnpm measurement:smoke` after approved publish.
- [x] `pnpm ops:lint --changed`
- [x] `pnpm qa:gates --changed --agent codex --task TASK-1510 --ui --runtime --integration --docs` — advisory; rollout dependencies remain explicit.
- [x] `pnpm docs:closure-check` — no blocking finding; arquitectura, documentación funcional, manual, review y handoff están presentes. El changelog cliente espera la activación pública.

## Closing Protocol

- [ ] Keep `code complete, rollout pendiente` while GTM publish, public pilot or native-recovery evidence is pending.
- [x] Runtime flag/binding, public pilot host and API evidence recorded in the feature-flag ledger, Handoff and changelog; GTM/booking evidence remains pending.
- [ ] Never claim global iframe replacement from a single pilot.

## Definition of Done

- [ ] Portable frontier renderer, complete flow/a11y, GTM funnel and premium evidence are complete.
- [ ] Controlled booking and conversion measurement are runtime-verified with flag/version rollback.
- [ ] Any wider graduation remains evidence-driven, one surface at a time.

## Follow-ups

- After TASK-1431, graduate `hubspot_handoff` and additional public surfaces without changing navigation-only `book_meeting`.
