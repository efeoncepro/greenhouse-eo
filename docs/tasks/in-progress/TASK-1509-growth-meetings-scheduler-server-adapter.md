# TASK-1509 — Growth Meetings Scheduler Server Adapter

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-023`
- Status real: `Adapter y piloto native-only liberados; flags staging/Production y binding /agenda activos. Pendientes: booking controlado/replay, read-back HubSpot/Outlook/Teams, evidencia /g/collect y publish GTM.`
- Rank: `TBD`
- Domain: `growth|public-site|crm|data`
- Blocked by: `none`
- Branch: `task/TASK-1509-growth-meetings-scheduler-server-adapter`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Productiza el `conditional pass` de TASK-1366 como adapter server-side seguro sobre HubSpot Scheduler API. Entrega config/availability y un command de booking gobernado con origen/surface, Turnstile, rate limiting, idempotencia, atribución allowlisted, errores sanitizados y señales. Los defaults de código permanecen OFF; el piloto aislado `/agenda/` opera con flags de staging/Production ON.

La tarea persigue dos resultados inseparables: habilitar una UI propia de alta calidad y crear un rail de medición GTM/GA4 confiable. HubSpot continúa como fuente de verdad de disponibilidad, calendario, Teams, contacto y reunión; Greenhouse no crea un calendario paralelo.

## Why This Task Exists

El spike verificó una reserva real con Office 365, Teams y CRM, pero su harness no es una capacidad pública. Una UI de frontera necesita un contrato estable y rápido; GTM necesita distinguir exploración, fricción y conversión real sin PII ni clicks autorreportados. Exponer HubSpot directamente dejaría tokens, abuso, duplicados, atribución y degradación fuera de gobierno.

## Goal

- Exponer configuración y disponibilidad HubSpot como DTOs browser-safe para surfaces autorizadas.
- Ejecutar booking idempotente y aceptar éxito sólo con reserva online, calendar event y Teams válidos.
- Emitir un recibo de conversión opaco que permita `gh_meeting_booking_confirmed -> generate_lead` sin PII ni doble conteo.
- Mantener HubSpot como provider server-side invisible; resolver recuperación en la UI nativa y ejecutar rollback por flags, binding o versión, nunca mediante un enlace visible.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md`
- `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md`

Reglas obligatorias:

- HubSpot Scheduler API y la scheduling page son source of truth; no persistir ni calcular slots propios.
- Browser, WordPress y GTM nunca reciben tokens, raw provider errors, name/email/company, HubSpot contact ID o calendar event ID.
- `book_meeting` de TASK-1431 permanece navigation-only; este command se nombra `native_meeting_booking` y no edita Action Registry.
- Confirmación exige `isOffline=false`, `calendarEventId`, slot exacto y conferencia `teams.microsoft.com`; toda degradación falla cerrado.
- La conversión nace del resultado server-confirmed. Click, vista, selección o inicio de booking nunca son key events.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/reference/measurement-gtm-ga4/LEARNINGS.md`
- `docs/epics/to-do/EPIC-023-growth-cta-popup-cro-engine.md`

## Dependencies & Impact

### Depends on

- TASK-1366 live evidence and governed HubSpot scope `scheduler.meetings.meeting-link.read`.
- Existing Growth Forms patterns for public CORS/surface authority, Turnstile, PII and canonical errors.
- Existing GTM container/property contract: `GTM-NGHPGRLZ`, GA4 property `486264460` and generic event discipline.

### Blocks / Impacts

- Blocks TASK-1510 native portable renderer.
- Affects public growth API, HubSpot scheduling traffic, measurement contract, flags and reliability.
- La graduación de `open_meeting_scheduler` más allá del piloto aislado permanece separada y requiere evidencia por surface; `book_meeting` conserva su contrato navigation-only.

### Files owned

- `src/lib/growth/meetings/**`
- `src/app/api/public/growth/meetings/**`
- `scripts/hubspot/smoke-scheduler-booking.mjs`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `scripts/hubspot/smoke-scheduler-booking.mjs` verifies details, availability and booking with redacted output.
- PDR-009 records the source-of-truth, native-only recovery and attribution limits.
- Growth Forms provides proven public-origin/CORS, Turnstile, PII and error-boundary patterns.
- The live scheduling page `efeoncepro/agenda-discovery` uses Office 365, Teams, 30 minutes, company required and legal consent.

### Estado vigente 2026-07-21

- Reader/command, DTOs browser-safe, public API, ledger de idempotencia, provider adapter y receipt ya existen.
- Migración dev, race PostgreSQL y lecturas provider están verificadas; los flags staging/Production y el binding piloto están activos.
- `/agenda/` consume el adapter mediante la experiencia native-only. HubSpot no aparece como UI alternativa.
- Falta ejercer un booking controlado post-flip con replay/read-back y cerrar la evidencia de medición antes de publicar GTM.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/meetings/**` with transport under `src/app/api/public/growth/meetings/**`.
- Future candidate home: `domain-package`
- Boundary: browser-safe contract -> public route adapters -> canonical reader/command -> HubSpot Scheduler adapter.
- Server/browser split: DTO/error enums may be browser-safe; provider token/calls, contact data, idempotency, attribution authority and audit stay server-only.
- Build impact: `none`; use existing fetch/runtime without HubSpot SDK.
- Extraction blocker: shared public surface policy, Turnstile/rate-limit and secret resolution remain in Greenhouse until an authorized extraction.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: HubSpot scheduling page, connected Office 365 calendar and resulting CRM contact/meeting.
- Consumidores afectados: TASK-1510, WordPress/Think hosts, GTM/GA4 and operators doing runtime read-back.
- Runtime target: `local mocked -> staging controlled -> production shadow -> pilot`.

### Contract surface

- `GET /api/public/growth/meetings/config?surfaceId=...&timezone=...`: browser-safe duration, visitor-resolved IANA timezone policy, required fields/legal consent and availability/recovery mode; no organizer/provider IDs or provider link. Surface timezone is fallback, not a visitor allowlist.
- `GET /api/public/growth/meetings/availability?surfaceId=...&timezone=...&monthOffset=...`: normalized bounded days/slots with explicit freshness/state.
- `POST /api/public/growth/meetings/book`: slot/duration/timezone/locale, required contact/form fields, legal consent, surface/captcha, idempotency key and attribution envelope.
- `POST /api/public/growth/meetings/verify-email`: veredicto browser-safe, rate-limited y autorizado por surface/origin para feedback debounced; la autoridad se reejecuta dentro de `book` antes de CAPTCHA, disponibilidad, claim o write.
- Public errors are a closed enum: `unavailable|slot_unavailable|validation_failed|captcha_failed|rate_limited|booking_rejected|provider_degraded`; never provider bodies/messages.
- Success returns only browser-needed appointment facts plus an opaque one-time `conversionReceipt`; no contact/calendar identifiers.
- Provider endpoints: Scheduler API 2026-03 details/availability and booking; slug stays server configuration.

### Data model and invariants

- No availability/meeting source-of-truth table.
- Durable idempotency claim before provider write, keyed by opaque client key plus HMAC/fingerprint de todos los campos semánticos normalizados; raw email nunca aparece en keys/logs/signals.
- Same key+digest replays the public outcome; key+different digest rejects; concurrent claims produce at most one HubSpot write.
- Claim states distinguish `claimed|failed_prewrite|provider_dispatched|succeeded|failed_terminal|ambiguous|provider_created_invalid`; sólo `failed_prewrite` puede reclaimarse automáticamente.
- Store only minimum receipt/digests, surface, requested slot, safe outcome and timestamps under explicit retention.
- Success requires online, exact slot, calendar event and valid Teams host; `webConferenceMeetingId` remains optional when Teams URL is valid.
- Config, availability and booking use one canonical visitor timezone; invalid zones fail before provider access and
  the returned HubSpot `bookingTimezone` must match after IANA alias canonicalization.
- Conversion receipt is unguessable, bound to one successful claim and stored only as a hash. A replay does not mint or re-enable a conversion receipt; it carries no PII and cannot authorize another booking.

### PII, policy and security

- Reuse surface/origin authority; CORS never replaces server validation.
- Reuse the canonical Growth Forms `verifyEmail` policy and its free/disposable-domain datasets; do not fork lists. Personal/disposable emails fail closed with `validation_failed`, and neither endpoint logs or returns the raw email.
- Require Turnstile hostname/action for booking, atomic PostgreSQL rate-limit buckets over HMAC privacy-safe keys, bound availability range/cadence and reject unexpected fields.
- Resolve HubSpot credentials only server-side; missing scope/config fails closed.
- Booking-processing consent and optional marketing consent are separate; marketing defaults false.
- Forms API/`hutk` remains OFF unless CMP/Consent Mode, dedupe and explicit policy approval exist.
- Logs/Sentry/GTM/GA4 contain no PII, exact appointment timestamp, contact/calendar ID or provider payload.

### Migration / backfill / rollback

- Migration: additive idempotency/audit storage only if Discovery proves no existing command ledger fits; architecture/ADR precedes schema.
- Backfill: none; do not import historic meetings/contacts.
- Flag contract defaults safe (`false`) in code; staging/Production currently set both read and booking flags to `true` for the allowlisted pilot.
- Rollback: flag OFF, binding `paused` o versión/backup previo del host. Preserve receipts for reconciliation; never delete calendar meetings as rollback and never expose an automatic provider link.

### Observability and runtime evidence

- Signals: `growth.meeting.availability_failed`, `booking_failed`, `offline_booking_detected`, `duplicate_prevented`, plus PII-free success count.
- Provider calls carry opaque correlation IDs; sanitized categories distinguish transport, policy, conflict, offline and schema drift.
- Tests cover schema drift, concurrency, ambiguous timeout, blocked email, invalid Teams host, receipt replay and raw-error/PII redaction.
- Controlled smoke proves API receipt, HubSpot contact/meeting, Office 365 event, Teams URL and native reschedule/cancel links. Inbox QA is explicit, never inferred.

### Measurement

- Tier B funnel: renderer emits canonical `gh_meeting_step_reached` with allowlisted `meeting_step`, `surface_id`, `placement`, `scheduler_key`, `availability_state`, `days_ahead_bucket`, `time_of_day_bucket` and sanitized `error_category`.
- Allowed `meeting_step`: `viewed|availability_loaded|availability_failed|date_selected|slot_selected|details_started|validation_failed|booking_started|booking_failed`; `fallback_opened` remains reserved only for historical/cached-client compatibility and is not emitted by the native renderer.
- Tier A conversion mirror: only the first successful conversion receipt branch allows renderer event `gh_meeting_booking_confirmed`; GTM maps it to recommended GA4 `generate_lead` with `lead_source=meeting_booking`, does not forward the custom confirmation event, and no other scheduler event is a key event.
- Exact slot, email, name, company, free text, receipt and correlation ID are excluded from `dataLayer`/GA4.
- Tracking plan must define funnel/custom dimensions, dedupe semantics, measurement ID verification and `/g/collect`/Realtime evidence before publish.
- GTM workspace changes follow propose -> preview -> human confirm -> publish; this task never silently publishes the container.

<!-- ZONE 2 — PLAN MODE: executor-owned; intentionally empty at registration -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Architecture and measurement decision

- Create `GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md` with C4, threat model, idempotency, provider lock-in, conversion receipt and native recovery.
- Freeze the GTM event/parameter matrix and decide whether the existing command ledger satisfies durable claims.

### Slice 1 — Contracts and provider adapter

- Define browser-safe DTO/errors/fixtures and server-only Scheduler adapter.
- Add contract/redaction tests against verified 2026-03 shapes.

### Slice 2 — Policy, idempotency and receipt

- Implement surface/origin, Turnstile, rate limit, consent and attribution policy.
- Implement durable claim/replay/concurrency and online/calendar/Teams validation.
- Issue one safe conversion receipt per successful claim.

### Slice 3 — Routes, signals and measurement registry

- Add config/availability/book route adapters over primitives.
- Register flag, signals and the meeting funnel/conversion rows in Tracking Plan.

### Slice 4 — Controlled runtime proof

- Run approved booking and duplicate replay; read back HubSpot/Outlook/Teams and document native recovery/rollback.

## Out of Scope

- Renderer/visual system/public host (TASK-1510).
- Renderer/host removal of iframe/link and the additive Action Registry adapter belong to TASK-1510; TASK-1509 remains the booking authority.
- Reschedule/cancel APIs, payments, routing redesign or CRM Meetings API writes.
- Historic backfill or marketing Forms API submission by default.
- Publishing GTM workspace without a later explicit human confirmation.

## Detailed Spec

The canonical capability is a provider-independent meetings contract with one HubSpot Scheduler adapter. Route handlers validate transport and delegate; the reader/command own policy and invariants. PostgreSQL and HubSpot do not form an atomic distributed boundary: durable pre-dispatch state and fail-closed reconciliation minimize duplicates without claiming exactly-once. Measurement receives only allowlisted state categories, while exact attendee and appointment facts remain inside the server/provider boundary.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 -> 1 -> 2 -> 3 -> 4.
- No write route before anti-abuse, idempotency and fail-closed tests pass.
- TASK-1510 may use fixtures after Slice 1. The isolated public read/UX pilot may run after provider-read, migration,
  anti-abuse and native-recovery evidence; graduation or measurement publish remains gated on the controlled booking proof.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicate calendar booking | HubSpot/Office 365 | medium | durable claim and replay receipt | `growth.meeting.duplicate_prevented` |
| Offline/no-Teams accepted | HubSpot/Teams | low | strict response gate + terminal native recovery | `growth.meeting.offline_booking_detected` |
| Public abuse | public API | medium | Turnstile, surface/origin, limits | captcha/rate outcomes |
| PII/provider leak | privacy/measurement | low | closed DTO/event allowlists + negative tests | redaction gate |
| Funnel double-counts conversion | GTM/GA4 | medium | receipt-gated single event; generate_lead only | reconciliation mismatch |

### Feature flags / cutover

- Code defaults remain OFF. Staging/Production are currently ON by explicit rollout; the read flag gates config/availability and the booking flag enables writes only on allowlisted surfaces.
- Revert is flag OFF/binding paused/version rollback. Before dispatch the renderer may offer native retry; `ambiguous`/`provider_created_invalid` never auto-retry or open another booking path because it could duplicate a real meeting.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0–1 | revert docs/contracts | minutes | yes |
| 2–3 | flag OFF, stop new claims, retain receipts | <5 min + propagation | yes |
| 4 | stop pilot and manually reconcile created event | bounded review | partial |

### Production verification sequence

1. Local contract/concurrency/redaction/receipt suites.
2. Staging availability matches official provider data.
3. Isolated `/agenda/` pilot proves native UI/recovery without a booking write.
4. Controlled booking + identical replay produces one event.
5. HubSpot CRM and authenticated Outlook prove the same online Teams meeting.
6. Keep the native pilot isolated until `/g/collect` and GTM gates pass; do not promote to Contacto/RRSS.

### Out-of-band coordination required

- Approved recipient/time for booking smoke and optional inbox inspection.
- HubSpot page/calendar/scope must remain healthy.
- Production flags were explicitly approved and are ON; GTM publish still requires a separate explicit human confirmation.

<!-- ZONE 4 — VERIFICATION & CLOSURE -->

## Acceptance Criteria

- [x] Architecture names HubSpot as SoT and documents threat model, receipt, provider failure, native recovery and flag/version rollback.
- [x] Config/availability return normalized browser-safe DTOs only for authorized surfaces.
- [x] Booking enforces surface/origin, Turnstile, limits, validation and consent without raw errors/secrets.
- [x] Concurrent/replayed requests create at most one booking; conflicting key reuse rejects.
- [x] Success is impossible for offline, missing calendar, mismatched slot or invalid Teams result.
- [x] Conversion receipt is opaque/replay-safe and carries no PII/provider IDs.
- [x] Tracking Plan defines the Tier B funnel and receipt-gated `generate_lead` rail with no PII/exact slot.
- [x] Flag/signals/rollback are registered with safe code defaults and current live ON state recorded in the ledger.
- [ ] Controlled runtime proof verifies HubSpot, Office 365, Teams and duplicate replay without exposing a provider UI path.

## Verification

- [x] `pnpm codex:task-hook TASK-1509`
- [x] `pnpm task:lint` (TASK-1509/TASK-1510 changed set: zero errors/warnings)
- [x] Focused contract/concurrency/security/measurement tests.
- [x] `pnpm lint`
- [x] `pnpm tsc --noEmit`
- [ ] Controlled redacted runtime smoke.
- [x] `pnpm ops:lint --changed`
- [ ] `pnpm qa:gates --changed --agent codex`
- [x] `pnpm docs:closure-check` (sin finding bloqueante; warnings de cierre/índices se coordinan en el cierre multiagente)

## Closing Protocol

- [x] Keep lifecycle `in-progress` while controlled booking/replay, optional inbox QA, `/g/collect` and GTM publish remain pending; flags and public pilot are complete.
- [ ] Synchronize registry/index, architecture/ADR, flag ledger, Tracking Plan, changelog and Handoff.
- [x] Record runtime/flag/native-recovery evidence without secrets or PII.

## Definition of Done

- [x] Adapter, contracts, security/idempotency, receipt, tests, signals and measurement registry are complete.
- [ ] A controlled real booking and replay prove runtime behavior.
- [ ] Graduation beyond the isolated `/agenda/` pilot remains gated on TASK-1510 controlled booking, `/g/collect` and GTM publish evidence.

## Runtime Evidence — 2026-07-21

- Migration `20260721034500000_task-1509-growth-meeting-scheduler.sql` applied to dev Cloud SQL; all four
  `greenhouse_growth.meeting_*` tables, unique claim/booking/receipt indexes and runtime-role grants read back.
- Live PostgreSQL race test produced exactly one `claimed` and one `in_progress_or_unknown`; semantic key conflicts
  rejected, successful replay count remained one, receipt count remained one and cleanup left zero test residue.
- Canonical secret `growth-meeting-hmac-secret` provisioned in Secret Manager; `greenhouse-portal` received
  secret-level `secretAccessor`, and the real `resolveMeetingPrivacyHasher()` consumer produced a 64-character digest.
- HubSpot Scheduler inspect remained healthy: group calendar online, Office 365 provider, Teams-compatible contract,
  30-minute duration and live availability present. No booking write was made in this read-only check.
- Visitor-timezone inspect remained healthy with `America/Lima`: HubSpot returned 197 live 30-minute slots for the
  same online Office 365 group calendar. Example instant `2026-07-21T13:15:00Z` renders 08:15 Lima / 09:15 Santiago,
  proving one booking instant with local representations. No booking write was made.
- GTM disposable workspace `task-1510-native-meeting-scheduler-1784624040208` (ID `6`) compiles and syncs in
  `quick_preview`: eight allowlisted DLVs, two triggers and two GA4 tags. No version or publication occurred.
- Flags staging/Production and binding `fhsf-efeonce-lead-gen-web`/`discovery` are active. The native-only bundle
  was released at `fbe8a9c76a74` (run `29854833210`); `/agenda/` exposes no HubSpot link/copy and retains the
  complete August grid when HubSpot returns zero slots. No booking was created during release verification.

## Follow-ups

- Ejecutar un booking controlado y replay con read-back HubSpot/Outlook/Teams; validar el rail browser con `/g/collect`.
- Publicar GTM sólo después de Preview/Tag Assistant, evidencia live y confirmación humana explícita.
- Graduar `open_meeting_scheduler` una superficie a la vez, sin cambiar `book_meeting` navigation-only ni reintroducir una salida visible al provider.
