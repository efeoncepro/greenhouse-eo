# TASK-2034 — Lead matching para Meta y Google Ads

<!-- ZONE 0 — Identity & Triage -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Status real: `Implementacion`
- Rank: `Now`
- Domain: `data`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`

## Summary

Enriquecer Leads aceptados/reservas confirmadas con matching compatible para Meta y Google.
Consentimiento granular en el POST de negocio, proyección cifrada durable, delivery por destino,
Meta mediante el GTM Server existente y Google mediante UPD dedicado sin otra conversión GA4.
Audiencias por formulario/reunión, con vínculo Ads y settings verificados.

## Why This Task Exists

La recuperación live 5/5 sólo transporta PageView/Lead sin email/teléfono. GA4 está vinculado a
Google Ads 9531478329 con personalización; al inicio UPD estaba desactivado y faltaban audiencias.
UPD/ack y siete audiencias 90 d ya activados/releídos; rolloutbackend aún pendiente.
El operador autorizó implementación el 2026-10-13: «Bien, hagamoslo además GA4… Google Ads».

## Goal

- Matching consentido de Leads para Meta y Google Ads.
- Mantener GA4 como espejo único de conversión y clasificar audiencias sin PII en dimensiones.
- Recepción verificable, retries estables y estados honestos por destino.

<!-- ZONE 1 — Context & Constraints -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md`

## Dependencies & Impact

- Existing public Forms/Meetings commands and shared PostgreSQL transaction.
- Existing sGTM GTM-K2X4ZTTK, template Meta pin a575edb31aa447469b855c3006ed9991dad711cf.
- Existing ops-worker Forms dispatch cadence; no new service/project/cron.
- GA4 486264460 / G-KYPPY57M14 / stream 10593675149, Google Ads link 10593794382.

### Files owned

- `src/growth-measurement-context/**`, `src/lib/growth/measurement/**`
- Additive request/capture changes in public Forms/Meetings and portable API clients.
- `services/ops-worker/server.ts`, dedicated scripts/templates and scoped measurement docs.

## Current Repo State

- Existing consent bridge supplies separate ads/analytics states; only opt-in categories grant ads.
- Meetings ledger keeps HMAC, not recoverable contact; build matching at confirmation.
- Matching backend and native Google UPD contract under implementation, flags default OFF.
- Unrelated shared WIP preserved. No production capture/dispatch flip yet.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/measurement`, existing portal API and ops-worker
- Future candidate home: `domain-package`
- Boundary: source domains call shared preparation/enqueue; destination adapters own delivery
- Server/browser split: browser context only; contact normalization/encryption/delivery server-only
- Build impact: portable renderer helper plus existing worker input; no dependency added
- Extraction blocker: borrow canonical source transaction for atomic enqueue

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: Forms accepted/Meetings succeeded; new measurement delivery projection
- Consumidores afectados: public portable API clients, portal commands, existing ops-worker, sGTM, GA4
- Runtime target: `production`

### Contract surface

- Existing: public submit/book, receipt gate, commercial allowlists, GA4 mirror.
- New: optional measurementContext, backend /efeonce/lead-enrichment Client, Google user_data-only MP.
- Backward compatibility: `gated`; legacy/malformed context does not reject business requests.
- Full API parity: canonical domain command shared by API consumers; provider side effects async.

### Data model and invariants

- New: greenhouse_growth.measurement_conversion and measurement_delivery.
- Identity: durable UUID per source_kind/source_id; leases SKIP LOCKED, 5 attempts, 24 h retry window.
- Snapshot: consent flags/date/source/version, without client/cookie IDs in cleartext.
- Matching material: encrypted AES-256-GCM, deleted after 48 h; never in outbox/logs/telemetry.
- Write-target allowlist: N/A; source-domain tx borrowed, new projection owner is measurement.
- Tenant/space boundary: only canonical Efeonce hosts and commercial Forms/scheduler allowlists.
- Audit/outbox/history: durable destination receipts; http_accepted does not claim provider processing.
- Failed instrumentation does not reject the form/booking; savepoint isolates enqueue failure.

### Migration, backfill and rollout

- Migration posture: `additive`; SQL parked in pending-migrations until release precondition.
- Default state: capture/meta/google flags OFF.
- Backfill: none; no inferred historic advertising consent.
- Rollback: flags OFF; restore prior GTM live version and browser Lead ownership together.
- External coordination: AES key, ingress token, MP secret, UPD policy/UI, renderer+worker release.
- Cutover: backend Meta only once active; disable legacy form/meeting CAPI triggers atomically.

### Security and access

- Auth/access gate: existing submit validation/CORS/captcha; sGTM bearer SHA-256 digest over TLS.
- Sensitive data posture: contact-derived hashes and original IP/UA encrypted; no raw contact egress.
- Error contract: safe error classes/statuses only, no body/credential logging.
- Abuse/rate-limit posture: source domain guards, scoped ingress/schema/24 h timestamp, durable UUID retry.

### Runtime evidence

- Local: normalization fixtures, negatives/consent/GPC/URLs, encryption binding, dispatch ack and replay tests.
- DB: additive migration/readback + queue concurrency smoke after release precondition.
- Integration: GTM Preview and Meta Test Events, Google MP validation/settings readback.
- Reliability: per-destination attempts/dead_letter and encrypted-material expiry; existing worker cadence.
- Production: source+worker release → migration/secrets → Client/tag Preview → consent/context smoke → coordinated cutover.

<!-- ZONE 4 — Verification & Closing -->

## Acceptance Criteria

- [x] Public POST carries granular consent/context, never treats processing consent as ads consent.
- [x] Backend builds Meta and Google normalized hashes separately; no PII custom GA4 params.
- [ ] Atomic durable capture + destination-specific retry, no second GA4 generate_lead.
- [x] Meta custom Client validates authentication, schema, commerce, identity and consent.
- [x] Google UPD property/settings, MP secret and Ads linkage verified before activation.
- [x] Commercial audiences created/read back separately from matching delivery.
- [ ] Meta Test Events Server shows matching keys and classifiers; positive/negative/replay checks.
- [ ] Source/worker/renderer released, parked migration applied, flags and live delivery verified.
- [ ] Docs, mirrored skills, audit/handoff, rollback and scope checks complete.

<!-- ZONE 2 — Plan Mode -->

## Implementation Plan

1. Implement destination payloads, context capture, encrypted queue and existing worker drain.
2. Build sGTM Client/workspace, Test Events and Google audience/settings draft.
3. Validate and release owned source; apply migration and configure scoped secrets.
4. Activate source capture, switch Meta ownership, enable Google only after policy/settings.
5. Verify readbacks and close with actual runtime status.

## Verification

- Started 2026-10-13: Google Admin readbacks confirm link and current dimensions/audiences.
- 71 tests/10files PASS + 21 Client tests PASS; TypeScript/ESLint, portable Forms/Meetings builds y worker bundle PASS.
- Google API+UI: UPD/ack habilitados, autocolección OFF, Ads link existente, siete audiencias 90 d y dimensiones lead_source/scheduler_key releídas.
- Tres secretos scoped/versión 1 preparados en efeonce-group; refs aún no en runtimes. No nuevo servicio/proyecto/cron.
- GTMworkspace 8 PreviewcompiledPASS; MetaTestEventsProcessedServer em/ph/fn/ln y clasificadores para amboshosts. FixtureIDs e407fecc-5d9e-4cb7-948d-0151d1d5fc57/ec437ec1-5429-4b00-98b9-b2b6e07e1af5. Seis negativosHTTP400/401; replaymismoIDHTTP 200, sin afirmar dedupeattribution.
- Recibos .captures/meta-capi-diagnostic-2026-10-13/{google-lead-audiences-receipt,matching-secrets-receipt,matching-preview-canary}.json; capturas ga4-lead-audiences-created.png y meta-lead-matching-processed.png.
- Migración parked sin aplicar; live 5/5 conservado y drafttestcode retirado. Captura/send prod ausentes/defaultOFF.
- Release completo develop→main autorizado el13/10; sin checkout alternativo. Build local completo PASS; suite global interrumpida por saturación. CI y override formal del batch pendientes.

## Progress Log

- 2026-10-13: authorized implementation; code under shared checkout, unrelated WIP preserved.
- 2026-10-13: auditoría corrigió isolationForms/destinations, vetoSec-GPC y leases/CAS. ProviderGoogle activo, MetaTestEventsPASS. Pending: decisión de integración/releaseacotado, SQL/runtime flags y validaciónlive real.

## Risks & Open Questions

- Google UPD policy/ack aceptados el2026-10-13 tras autorización; no repetir aceptación.
- No synthetic CRM submissions/bookings; canaries go only to Test Events.
- Matching/HTTP success does not demonstrate an audience eligible to serve ads or campaign performance.

## Completion Criteria

Acceptance evidence + Status real current, runtime and rollout gates passed, documentation closure.

## Handoff

Current implementation owner Codex. Production flags ausentes/defaultOFF hasta release.
Necesita decisión operador sobre integración acotada debido al contrato sharedworkspace; no publicar380 archivos ajenos.

<!-- ZONE 3 — Execution Spec -->

## Normative Docs

- `docs/reference/measurement-gtm-ga4/09-hubspot-consent.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

## Scope

- Source capture, encrypted queue, destination adapters, sGTM Client and GA4 audiences.

## Out of Scope

- Campaign spend and uploading historical contacts without advertising consent.

## Detailed Spec

Source/payload contracts live in `src/lib/growth/measurement`; explicit advertising context in public POST. Google enriches existing client_id with no events. Meta ownership switches only after backend/renderer rollout.

## Rollout Plan & Risk Matrix

Ordering: source/worker → parked migration/secrets → Client preview → context smoke → sender cutover → flags.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| Duplicate Lead | Meta | One sender at cutover; stable IDs | Test Events/replay |
| PII ordinary params | GA4 | Dedicated top-level user_data only | Payload tests |
| Instrumentation failure rejects booking | Sources | Savepoint/flag/caught preparation | Safe warnings |
| Broad unrelated release | Production | Review actual diff and manifest | Release preflight |

Flags: GROWTH_MEASUREMENT_CAPTURE_ENABLED, GROWTH_MEASUREMENT_META_ENABLED, GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED, GROWTH_MEASUREMENT_RETENTION_ENABLED default OFF; retention stays ON after rollout during rollback. Capture/send OFF restores data boundary; coordinate legacy Meta trigger restore with backend send disabled. Preserve receipts.

## Closing Protocol

- [ ] Runtime acceptance and current Status real recorded.
- [ ] Task index, audit/handoff, changelog and mirrored skills synchronized.
- [ ] Scope/type/context and meaningful QA checks passed.


### Delta de release completo autorizado — 2026-10-13

Sin worktree ni rama adicional. Tres flags worker usan GitHub repo vars y env del workflow,
con fallbackfalse en deploy.sh; refs pinned declaradas. Se activan vars + revisión servida
juntos tras SQL y cutover; retención permanece activa durante rollback. Build completo
local pasó. No repetir build/suite completos en el equipo: CI remoto del SHA candidato.
