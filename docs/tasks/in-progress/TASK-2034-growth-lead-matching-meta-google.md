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
- Status real: `Parcial: released PR254/main d692ab51dc48; SQL, GTM6/5 y cuatro flags activos/verificados. Pendiente primera conversión comercial consentida post-flip y su recepción provider.`
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

La recuperación histórica5/5 transportaba PageView/Lead sin matching de contacto. El operador
pidió enriquecimiento para Meta/Google y autorizó todo develop→main. Release completo PR254
(main d692ab51dc486a0585b7950f95bb627197e6f2c6) y orquestador38483437158 success;
manifest released. GA4 UPD/ack, siete audiencias90d, SQL, secretos, GTM Server6/Web5 y flags
ya activos. Primera aceptación/reserva comercial consentida post-flip aún sin observar.
[Estado verificable y recibos](../../audits/releases/2026-10-13-full-develop-matching-release.md).

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

- Consentimiento granular ads/analytics, sin inferir publicidad del procesamiento; veto GPC.
- Matching backend, renderer y worker released; SQL aplicada y capture/meta/google/retención ON.
- GTM Server6 retira legacyLead12/17; PageView11 y GA4 mirror permanecen, Client GA4 exclusivo.
- Ops00775-fnh100%, Vercel dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT READY/alias canónico.
- WIP ajeno preservado; cierre documental en develop para próximo release.

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

- Migration posture: `additive`; canonical 20261013233429748 applied post-release 2026-10-13 23:34:44.561947Z; parked removed.
- Default state: flags OFF in source; explicitly ON in Production, durable config and served readback recorded.
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
- [x] Atomic durable capture + destination-specific retry, no second GA4 generate_lead. SQL role-runtime canary + template6 Client GA4 boundary verified.
- [x] Meta custom Client validates authentication, schema, commerce, identity and consent.
- [x] Google UPD property/settings, MP secret and Ads linkage verified before activation.
- [x] Commercial audiences created/read back separately from matching delivery.
- [x] Meta Test Events Server shows matching keys/classifiers; positives, six negatives and stable-ID replay verified (not attribution dedupe).
- [x] Source/worker/renderer released, migration applied, scoped secrets and four flags verified live.
- [ ] First accepted commercial form/confirmed booking with ads consent post-flip: source→ledger→destination ack→provider reception; not exercised, no synthetic business records.
- [x] Docs, mirrored skills, audit/handoff and rollback synchronized; closure gates recorded in release dossier.

<!-- ZONE 2 — Plan Mode -->

## Implementation Plan

1. Implement destination payloads, context capture, encrypted queue and existing worker drain.
2. Build sGTM Client/workspace, Test Events and Google audience/settings draft.
3. Validate and release owned source; apply migration and configure scoped secrets.
4. Switch Meta ownership, enable worker destinations/retention after settings, then capture + Vercel redeploy last.
5. Verify readbacks and close with actual runtime status.

## Verification

- Local: 71 tests10files +21Client tests, tipos/lint, portable Forms/Meetings y worker bundle PASS.
- CI candidato38475587661/build y staging smoke38476441021 success. Main CI38479348660:
  20.100 PASS/616 skipped/0 failed; Deep38479348739 y smoke38480495445 success.
- Orquestador38483437158 success, manifest d692ab51dc48-571eef31-2bd1-43b4-b8c8-6da07041a71d
  released. Auth health success, Azure no_diff. Watchdog final ok6/6, drift/data_missing0, Teamsfalse.
- SQL20261013233429748 aplicada23:34:44Z; ocho DML app. Canary rol greenhouse_app pasa
  SAVEPOINT/idempotencia/claims paralelos/leaseCAS/retries/retención48h y elimina fixtures.
- Server6/Web5, cutover23:38:57Z, frozen artifact verified, tag6 sólo[11,33]; legacy12/17 retirados.
  ForwardingGA4 restringido a ClientGA4. Negativos live401/400/400 sin disparar Meta.
- Meta Preview/Test Events Processed/Server em/ph/fn/ln + clasificadores ambos hosts,
  IDs db9788fc-85d8-4315-8033-2ac2eb2ad06a/bc3e69f5-8573-46ce-828b-a2450dd3e694.
  Replay conservaID/tiempo; no atribución deduplicada demostrada.
- GA4 correcto486264460/G-KYPPY57M14, UPD/ack activos, automáticaOFF, Ads9531478329 y
  personalización existentes. Siete audiencias90d y dimensioneslead_source/scheduler_key releídas.
- Ops00775-fnh100% con Meta/Google/retención true y GitHub repo vars persistentes. Canary200
  dentro del worker resuelve tres secretos versión1, unavailableDestinations=[]/processed0.
- Vercel capturetrue exacto, payloadref1, credencial real service_account_key del portalSA;
  redeploy dpl_BxU6V7EGpo5R3REbazWxhXLsrVZT READY y alias canónico. Bundles con contexto.
- Sin TTL en secretos ni condición temporal IAM tagging. No infraestructura/cron nueva.
- Falta primera conversión comercial consentida y recepción provider post-flip; no se crean
  submissions/bookings/CRM/quotes/pagos para probar. Incidente mindicador separado sigue abierto.
- Dossier y lista de recibos saneados: docs/audits/releases/2026-10-13-full-develop-matching-release.md.

## Progress Log

- 2026-10-13: autorización de implementación, Google settings/audiencias y pruebas locales/Preview.
- 2026-10-13: full develop→main PR254; corregido heapCI6→8GiB sin quitar gates. No repetir
  build/suite local. API cero pasos/UI Startingjob resultaron metadatos incompletos, no inactividad.
- 2026-10-13: released, SQL aplicada, canary cola real, GTM6 cutover, worker ON y capture/redeploy
  último. Rollout operativo completo; Status Parcial por primera conversión consentida no ejercitada.

## Risks & Open Questions

- Google UPD policy/ack aceptados el2026-10-13 tras autorización; no repetir aceptación.
- No synthetic CRM submissions/bookings; canaries go only to Test Events.
- Matching/HTTP success does not demonstrate an audience eligible to serve ads or campaign performance.

## Completion Criteria

Acceptance evidence + Status real current, runtime and rollout gates passed, documentation closure.

## Handoff

Owner Codex. Matching activo y permanente; no volver a ejecutar rollout por snapshots históricos.
El operador exigió todo develop comprometido, ya promovido como PR254. Preservar WIP ajeno.
Observar siguiente fuente real consentida y correlacionar ledger/ack/provider sin fabricar negocio;
con esa evidencia completar el acceptance restante. No afirmar calidad/serving por Test Events.

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

Ordering: source/worker → parked migration/secrets → Client preview → context smoke → sender cutover → worker destinations/retention ON → source capture/redeploy last.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| Duplicate Lead | Meta | One sender at cutover; stable IDs | Test Events/replay |
| PII ordinary params | GA4 | Dedicated top-level user_data only | Payload tests |
| Instrumentation failure rejects booking | Sources | Savepoint/flag/caught preparation | Safe warnings |
| Broad unrelated release | Production | Review actual diff and manifest | Release preflight |

Flags: GROWTH_MEASUREMENT_CAPTURE_ENABLED, GROWTH_MEASUREMENT_META_ENABLED, GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED, GROWTH_MEASUREMENT_RETENTION_ENABLED default OFF; retention stays ON after rollout during rollback. Capture/send OFF restores data boundary; coordinate legacy Meta trigger restore with backend send disabled. Preserve receipts.

## Closing Protocol

- [ ] Runtime acceptance and current Status real recorded.
- [x] Task index, audit/handoff, changelog and mirrored skills synchronized.
- [x] Scope/type/context and meaningful QA checks passed; task lint/mirrors/context strict and CI evidence in release dossier.


### Cierre de rollout — 2026-10-13

Release completo autorizado y ejecutado; capturar sólo aceptación/confirmación. GitHub repo vars
worker son el SoT durable; flags runtime y Vercel exactos releídos. Rollback captura/sendersOFF,
retenciónON, GTM5 sólo tras detener backend, no rotar key48h. Tipo generado omitido con
MIGRATE_SKIP_TYPES permitido: contrato PG explícito ya compilado, futura proyección gobernada.
La migración catalog de TASK-1905 también aplicada, sin marcar esa task completa ni ampliarMCP.


### Auditoría documental integral previa al GO de escalabilidad

Tres subagentes contrastaron código, skills, cronología, release y recibos locales; sin
nuevas mutaciones externas. [Inventario completo](../../audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-13.md)
y [contrato runtime10](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
Corregidos ADR/Tracking, Forms/Meetings, referencias/skills y distinción GA4 confirmación
publicada vs funnel pendiente. La [política configurable](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md)
permanece Proposed, pendiente de GO, sin schema/API/UI/template/release nuevo. No se abre
una task de implementación por esta documentación. StatusParcial conserva acceptance
real comercial pendiente; no tildarlo por una auditoría documental.
