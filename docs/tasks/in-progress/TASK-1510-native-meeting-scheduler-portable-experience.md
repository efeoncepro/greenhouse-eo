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
- Wireframe: `docs/ui/wireframes/TASK-1510-native-meeting-calendar.md`
- Flow: `docs/ui/flows/TASK-1510-native-meeting-scheduler-flow.md`
- Motion: `docs/ui/motion/TASK-1510-native-meeting-scheduler-motion.md`
- Backend impact: `none`
- Epic: `EPIC-023`
- Status real: `Renderer de calendario portable validado localmente; GTM workspace, host pilot y runtime proof de TASK-1509 pendientes`
- Rank: `TBD`
- Domain: `growth|public-site|ui`
- Blocked by: `none`
- Branch: `task/TASK-1510-native-meeting-scheduler-portable-experience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye `<efeonce-meeting-scheduler>`, una experiencia portable, rica y moderna para elegir un horario y reservar mediante TASK-1509. La dirección activa usa un calendario mensual inequívoco, una agenda del día seleccionado y un resumen persistente. “Time Horizon” fue rechazada en el checkpoint visual porque no se reconocía como calendario.

Los dos resultados centrales son estética diferencial y medición GTM de extremo a extremo. El renderer emite un funnel allowlisted sin PII; sólo la primera respuesta con recibo server-confirmed habilita `gh_meeting_booking_confirmed -> generate_lead`. El iframe/link sigue disponible como fallback pre-dispatch; un outcome ambiguo exige revisar el correo y nunca ofrece un segundo booking inmediato.

## Why This Task Exists

El iframe funciona pero impone estética, pasos y scroll ajenos. Un simple calendario blanco no justificaría reemplazarlo. El nuevo scheduler debe convertirse en una pieza distintiva del sitio, hacer tangible la disponibilidad y permitir medir dónde se pierde intención —vista, slot, datos, validación, booking o fallback— sin confundir interacción con conversión.

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
- El fallback queda accionable en pilot y degradación pre-dispatch. Después de `provider_dispatched`, un outcome ambiguo o booking provider-created-invalid bloquea un segundo intento/fallback inmediato; esta task no toca `book_meeting`/Action Registry de TASK-1431.

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
- `docs/ui/wireframes/TASK-1510-native-meeting-calendar.md`
- `docs/ui/flows/TASK-1510-native-meeting-scheduler-flow.md`
- `docs/ui/motion/TASK-1510-native-meeting-scheduler-motion.md`

## Dependencies & Impact

### Depends on

- TASK-1509 DTOs/errors/fixtures, receipt, feature flag and fallback contract.
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
- HubSpot embed/link fallback is live and PDR-009 forbids premature removal.
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
- Adaptive density / The Seam: `aplica` — desktop presenta contexto + calendario mensual + agenda diaria; 390px se convierte en un flujo de una columna completamente inline.
- Floating/Sidecar/Dialog decision: sin modal, floating surface ni summary sticky; ningún panel puede ocultar fechas, slots o campos.
- Copy source: `src/lib/copy/*`; no strings de error/success en hosts.
- Access impact: `none`; surface/origin/anti-abuse los gobierna TASK-1509.

### State inventory

- Default: calendario mensual estable con timezone, fechas disponibles y agenda del día seleccionado.
- Loading: skeleton estructural de calendario; sin fechas o slots falsos.
- Empty: mes sin disponibilidad con navegación bounded y fallback.
- Error: recovery inline, provider-safe, retry y fallback.
- Degraded / partial: freshness/availability no autoritativa se rotula; no simula slots.
- Slot conflict: el resumen entra a warning, preserva datos no sensibles, refresca calendario y devuelve foco.
- Validation: summary + field-level messages; la selección se preserva.
- Booking pending: el resumen cambia a processing, CTA bloqueada, sin auto-retry.
- Success: el resumen se transforma en recibo confirmado con fecha/timezone/duration/Teams expectation; cero IDs.
- Permission denied: surface inválida degrada a fallback genérico.
- Long content: timezone/legal/copy envuelven sin romper calendario, agenda o resumen.
- Mobile / compact: mes completo de siete columnas, agenda debajo, resumen inline y targets >=44px; cero overlay/overflow.
- Keyboard / focus: tabla con caption/headers, botones sólo en días disponibles, slots cronológicos, foco visible y restauración a heading/error.
- Reduced motion: same information architecture, instant transformations, no meaning lost.

### Interaction contract

- Primary interaction: inspect month -> select date/slot -> inspect summary -> details/consent -> reserve -> confirmed summary.
- Hover / focus / active: available/selected states use interactivity, shape, text/dot and border, never color alone.
- Pending / disabled: disabled reason visible; stable idempotency key throughout intent.
- Escape / click-away: no overlays.
- Focus restore: step heading; conflict alert then first available slot; back returns to selected slot; success heading.
- Latency feedback: causal status; after 8s show “seguimos confirmando” without resubmitting.
- Toast / alert behavior: primary state inline/live region; no host toast duplication.

### Motion & microinteractions

- Motion primitive: tokenized CSS only for short selection/state continuity.
- Enter / exit: calendar, agenda and steps use direct or short state transitions; no decorative entrance.
- Layout morph: selected slot becomes an inline summary; the same document order is preserved at 390px.
- Stagger: subtle only for contextual labels, never slots.
- Timing / easing token: canonical public motion tokens; no scattered literal timings/easings.
- Reduced-motion fallback: direct state swap and equivalent focus/live-region behavior.
- Signature microinteractions: month navigation, selected date/time and confirmed summary; all causal and bounded.

### Implementation mapping

- Surface: `src/growth-meeting-renderer/**`; deterministic demo host + approved staging public host.
- Primitive / variant / kind: new `<efeonce-meeting-scheduler appearance="calendar|bare">`.
- Internal components: scene shell, context rail, timezone label, semantic month table, daily agenda, step rail, attendee fields, selected summary and recovery/fallback.
- Copy source: `src/lib/copy/growth-meetings*` or nearest existing growth dictionary confirmed in Discovery.
- Reader / command: TASK-1509 config/availability/book only.
- API parity: no UI-only write/success; server receipt gates confirmation.
- Browser events: canonical `gh_meeting_step_reached` plus dataLayer-only `gh_meeting_booking_confirmed`; strict parameter allowlist from TASK-1509. GTM maps only the latter to `generate_lead` and never forwards the custom confirmation name to GA4.
- GTM mapping: one generic GA4 tag for Tier B funnel; one conversion tag mapping confirmed to `generate_lead`; dimensions reuse surface/placement and add only governed scheduler interaction/stage fields.
- States: complete State inventory, including ambiguous timeout and fallback.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/native-meeting-scheduler.scenario.ts`.
- Routes: deterministic local demo and approved staging host.
- Viewports: 1440x1000 and 390x844.
- Quality profile: `premium`.
- `qualityProfile: 'premium'`; keyboard probes; `reducedMotionCheck: true`.
- Steps: view -> availability -> date/slot -> details -> validation -> pending -> confirmed; plus empty/conflict/degraded/fallback.
- Captures: calendar first fold, date/time selection, inline summary, details, pending, confirmed summary, degraded/fallback and compact transform.
- Markers: `native-meeting-scheduler`, `meeting-calendar`, `meeting-agenda`, `meeting-details`, `meeting-summary`.
- Assertions: no console/page errors, no PII in dataLayer, exact expected events once, `/g/collect` payloads, one primary action, focus destinations, 44px targets and `scrollWidth===clientWidth`.
- Review dossier: `docs/ui/reviews/TASK-1510-native-meeting-scheduler-review.md`.
- Baseline decision: the official HubSpot embed on the selected pilot surface is the functional/CRO baseline; the accepted monthly-calendar captures become the visual baseline after human approval. Time Horizon remains only as a negative comparison.

### Design decision log

- Selected “Monthly Calendar + Daily Agenda”: calendar recognition is immediate; month context and chronological times stay visibly connected.
- Rejected “Time Horizon”: abstract week strip and density bars did not read as a calendar.
- Rejected “Calendar Console”: polished but administrative, dense and aesthetically incremental.
- Rejected “Conversational Scheduler”: novel but hides comparison, adds turns and weakens keyboard/recovery.
- Reuse / extend / new: new portable public adapter; reuse tokens/control/a11y/telemetry patterns; no private primitive or page-local form.
- Measurement decision: generic interaction event + parameterized funnel; only receipt-gated confirmed maps to key event.
- Open risks: real provider latency and exact host constraints require staging evidence after TASK-1509.

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
- Export/diff public runtime, add smallest host adapter behind flag and preserve embed/link fallback.

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

The renderer is a standalone custom element with an explicit state reducer. Rendering, accessibility and telemetry consume the same typed actions so visual state and measurement cannot drift. The month table is a date-selection surface over normalized availability, not an event-management calendar. The selected-meeting summary may enter `confirmed` only from TASK-1509's successful conversion receipt. Hosts provide placement/configuration attributes and retain the fallback; they never fork the flow.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1509 fixtures -> Slice 1 checkpoint -> TASK-1509 staging ready -> Slice 2 -> Slice 3 preview -> Slice 4 confirmation/pilot.
- No public native booking while backend flag is OFF or fallback unavailable.
- No GTM publish before Preview/Tag Assistant + `/g/collect` + explicit human OK.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rich UI hurts booking clarity/perf | UI/CRO | medium | one action, performance budget, first-fold + funnel evidence | visual score + abandonment step |
| Stale slot displayed | HubSpot/UI | medium | server revalidation + conflict recovery | booking conflict |
| Host CSS breaks scene | WordPress | medium | scoped bundle/tokens + live GVC | diff/overflow |
| GTM double-counts or leaks PII | measurement/privacy | low | generic allowlist, receipt gate, parity/negative tests | `/g/collect` audit |
| Native path fails | conversion | low | persistent fallback + flag rollback | fallback_opened + booking_failed |

### Feature flags / cutover

- Consumes `GROWTH_NATIVE_MEETING_SCHEDULER_ENABLED`.
- OFF -> embed/link; shadow -> invisible/deterministic validation; pilot -> native on one allowlisted surface with fallback; graduation later.
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
4. Staging real availability and fallback.
5. GTM workspace preview + browser dataLayer/`/g/collect`, no publish.
6. Approved real booking and HubSpot/Outlook/Teams read-back.
7. Human confirms GTM publish; create version/publish/snapshot/realtime verify.
8. Pilot one surface; compare view->slot->details->confirmed/fallback and visual evidence before graduation.

### Out-of-band coordination required

- Kinsta/public runtime rollout approval.
- Approved recipient/time and optional inbox inspection.
- Human first-fold acceptance, enterprise verdict, GTM publish and production flag flip.

<!-- ZONE 4 — VERIFICATION & CLOSURE -->

## Acceptance Criteria

- [x] UI artifacts pass readiness and preserve `UI ready: yes` before JSX.
- [x] Monthly calendar/daily agenda is materially clearer than the rejected picker and validated visually at 1440/390.
- [x] Renderer consumes only TASK-1509 browser contracts and contains no provider/store/server imports.
- [ ] Full state inventory is accessible at desktop/390; the primary confirmed flow passes keyboard/reduced-motion/no-overflow locally, while empty/degraded/conflict/ambiguous remain pending in the staging dossier.
- [x] `gh_meeting_step_reached` covers the local fixture funnel with strict generic parameters, valid pairs and no PII/exact slot.
- [x] `gh_meeting_booking_confirmed` emits exactly once per server receipt in reducer/browser tests; GTM mapping/publish remains pending.
- [ ] GTM generic tags are built/read back/previewed; publish occurs only after explicit human confirmation and live evidence.
- [ ] Governed public host retains actionable embed/link fallback and flag rollback.
- [ ] One controlled native booking verifies renderer -> adapter -> HubSpot/Outlook/Teams and `/g/collect`/GA4 evidence.

## Verification

- [ ] `pnpm codex:task-hook TASK-1510`
- [x] `pnpm task:lint --task TASK-1510`
- [x] `pnpm ui:wireframe-check --task TASK-1510`
- [x] `pnpm ui:flow-check --task TASK-1510`
- [x] `pnpm ui:motion-check --task TASK-1510`
- [x] `pnpm ui:readiness-check --task TASK-1510`
- [x] Renderer/a11y/telemetry/parity tests: 11 focal tests + ESLint + TypeScript.
- [x] `pnpm fe:capture native-meeting-scheduler --env=local` — premium, 1440×1000 + 390×844, 24 frames, exit 0; only `baseline_stale` warning pending human approval.
- [x] `pnpm fe:capture:review .captures/2026-07-21T08-43-09_native-meeting-scheduler`
- [ ] `pnpm fe:capture native-meeting-scheduler --env=staging`
- [ ] `pnpm fe:capture:review <capture-dir>`
- [ ] `pnpm ui:quality --task TASK-1510`
- [ ] GTM workspace read-back/quick preview + Playwright dataLayer/`/g/collect`.
- [ ] `pnpm measurement:smoke` after approved publish.
- [ ] `pnpm ops:lint --changed`
- [x] `pnpm qa:gates --changed --agent codex --task TASK-1510 --ui --runtime --integration --docs` — advisory; rollout dependencies remain explicit.
- [x] `pnpm docs:closure-check` — no blocking finding; functional/client docs intentionally wait for public activation.

## Closing Protocol

- [ ] Keep `code complete, rollout pendiente` while GTM publish, public pilot or fallback evidence is pending.
- [ ] Record bundle/host/flag/GTM version, GVC dossier, scorecard, funnel and booking evidence in Handoff/changelog.
- [ ] Never claim global iframe replacement from a single pilot.

## Definition of Done

- [ ] Portable frontier renderer, complete flow/a11y, GTM funnel and premium evidence are complete.
- [ ] Controlled booking and conversion measurement are runtime-verified with fallback rollback.
- [ ] Any wider graduation remains evidence-driven, one surface at a time.

## Follow-ups

- After TASK-1431, graduate `hubspot_handoff` and additional public surfaces without changing navigation-only `book_meeting`.
