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
- Status real: `Parcial: release general ec317c928 efectivo; Web6/Server10 publicados18/10, EC ON, bridges4250795666af en ambos hosts y dos policies Ads publicadas20:35Z. HubSpot propiedad/campo14/mapping CONFIG_VERIFIED; captura de recibos Meta publicada en Server10. Flag Ads de proyecto ON20:36:20Z; deployment companion Vercel READY con alias/SHA y presencia de claves env/build verificados20:43:28Z; cadena configurada, booleano congelado no expuesto por API. Protocolo/negativos y configuración verificados; primera ocurrencia bajo esta activación, recibos individuales Graph/HubSpot, recepción Ads y atribución pendientes. Sin fabricar negocio.`
- Rank: `Now`
- Domain: `data`
- Blocked by: `none`
- Branch: `develop; checkout compartido, sin worktrees`

## Summary

Enriquecer Leads aceptados/reservas confirmadas con matching compatible para Meta y Google.
Consentimiento granular en el POST de negocio, proyección cifrada durable, delivery por destino,
Meta mediante el GTM Server existente y Google mediante UPD dedicado sin otra conversión GA4.
Audiencias por formulario/reunión, con vínculo Ads y settings verificados.
La ampliación Ads online usa acciones nativas propias para solicitud comercial y reserva confirmada,
con recibo durable, canal reservado de EC y un único emisor por acción; conserva el espejo GA4.

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
- `docs/architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md`
- `docs/reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md`

## Dependencies & Impact

- Existing public Forms/Meetings commands and shared PostgreSQL transaction.
- Existing sGTM GTM-K2X4ZTTK, template Meta base pin a575edb31aa447469b855c3006ed9991dad711cf; extensión de captura de recibos publicada con Server10.
- Existing ops-worker Forms dispatch cadence; no new service/project/cron.
- GA4 486264460 / G-KYPPY57M14 / stream 10593675149, Google Ads link 10593794382.

### Files owned

- `src/growth-measurement-context/**`, `src/lib/growth/measurement/**`
- Additive request/capture changes in public Forms/Meetings and portable API clients.
- `services/ops-worker/server.ts`, dedicated scripts/templates and scoped measurement docs.

## Current Repo State

Snapshot de intake histórico. Para el estado vigente, usar Status real y el checkpoint18/10.

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

Delta Ads online autorizado17/10 (no cambia la evidencia histórica Meta/UPD):

- [x] Recibo Ads sólo tras aceptación/confirmación persistida; dedupe/replay sin segunda señal; tests focales.
- [x] Consent granular/GPC, click context30d y EC por user_data reservado, sin hash/PII en telemetría; tests.
- [x] Dos acciones secundarias nativas propias creadas, readback por campo y bindings saneados completos.
- [x] Workspaces GTM API Web8/Server12, tags nativos/Linker/excepción GA4 y quick_preview sin error.
- [x] Protocolo Google real y negativos: cuatro casos SDK Preview y cuatro SDK live, transporte interceptado; Client GA4 reconstruye user_data en probe suprimido, sin salida Ads/Meta.
- [x] Términos específicos aceptados con autorización y EC efectivo ON, método GTM; readback API/UI de cuenta6862539491.
- [x] Backend y bundles promovidos en release general ec317c928, con CI/Deep y manifest del release verificados.
- [x] Bridge canónico SHA4250795666af publicado e idéntico en WP/Think; cuatro casos UI y doce casos de consentimiento Google PASS.
- [x] GTM Web6/Server10 publicados y releídos por versión/fingerprint/árbol exactos; captura de recibos Meta publicada en Server10.
- [x] Policies Performance/Discovery revisión2 publicadas20:35Z con Ads opt-in; destinos Meta/UPD y mappings existentes preservados.
- [x] HubSpot Performance: propiedad técnica, campo14 oculto/opcional y mapping por CAS CONFIG_VERIFIED; trece campos/settings preservados y defaults reconciliados por GET sin repetir PATCH.
- [x] Flag Ads de proyecto ON verificado20:36:20Z; es configuración del proyecto, no prueba del valor congelado del deployment.
- [x] Companion Vercel READY, alias/SHA exactos y cadena de configuración verificados20:43:28Z (proyecto true + clave env/build presentes). La API no expone el valor booleano congelado ni prueba una conversión.
- [ ] Primera solicitud comercial real bajo esta activación: recibo durable y recepción de la acción Ads correspondiente; sin enviar formularios sintéticos.
- [ ] Primera reserva comercial real confirmada bajo esta activación: recibo durable y recepción de la acción Ads correspondiente; no convertir clics o apertura de agenda.
- [ ] Primera identidad nativa HubSpot exacta de una nueva submission marcada, con historial completo y conversionId verificado.
- [ ] Recibo individual Graph y recepción positiva Google Ads comprobados con ocurrencias reales; configuración/probes suprimidos no los sustituyen.
- [ ] Atribución Ads observada y reconciliada; recepción, Test Events y HTTP aceptado no prueban atribución.


- [x] Public POST carries granular consent/context, never treats processing consent as ads consent.
- [x] Backend builds Meta and Google normalized hashes separately; no PII custom GA4 params.
- [x] Atomic durable capture + destination-specific retry, no second GA4 generate_lead. SQL role-runtime canary + template6 Client GA4 boundary verified.
- [x] Meta custom Client validates authentication, schema, commerce, identity and consent.
- [x] Google UPD property/settings, MP secret and Ads linkage verified before activation.
- [x] Commercial audiences created/read back separately from matching delivery.
- [x] Meta Test Events Server shows matching keys/classifiers; positives, six negatives and stable-ID replay verified (not attribution dedupe).
- [x] Source/worker/renderer released, migration applied, scoped secrets and four flags verified live.
- [ ] Complete real source→ledger→destination ack→provider reception evidence for both form and confirmed booking under the current activation; historical Meta form evidence alone does not complete both sources or the new receipts.
- [x] Docs, mirrored skills, audit/handoff and rollback synchronized; closure gates recorded in release dossier.

<!-- ZONE 2 — Plan Mode -->

## Implementation Plan

1. Implement destination payloads, context capture, encrypted queue and existing worker drain.
2. Build sGTM Client/workspace, Test Events and Google audience/settings draft.
3. Validate and release owned source; apply migration and configure scoped secrets.
4. Switch Meta ownership, enable worker destinations/retention after settings, then capture + Vercel redeploy last.
5. Verify readbacks and close with actual runtime status.

## Verification

Checkpoint18/10 vigente: [activación y evidencia saneada](../../audits/growth/2026-10-18-google-ads-activation.md).
Release general [ec317c928](../../audits/releases/2026-10-18-full-develop-production-release.md)
efectivo; el fallo Deep anterior del candidato no es un bloqueo vigente de ese release.
Comparación estructural API:173 comprobaciones, no173 tests unitarios. QA focal:15 pruebas de plan,
16 del builder Meta y10 del guard HubSpot; SDK Preview4/live4 y hosts12 con transporte interceptado.
Web6/Server10 releídos; EC ON; propiedades/formulario/mapping HubSpot verificados sin nuevas
submissions/contactos/reservas. Policies revisión2 publicadas20:35Z; proyecto Ads ON20:36:20Z.
Companion Vercel READY/alias/SHA exactos20:43:28Z y cadena de configuración verificada; la API sólo
expone nombres de claves, no el booleano congelado ni ejecución de una conversión.
Primera ocurrencia y recepción/atribución proveedor bajo esta activación siguen sin verificar.

Evidencia histórica del rollout13/10:

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

- 2026-10-18: [activación Ads y trazabilidad](../../audits/growth/2026-10-18-google-ads-activation.md): release general ec317c928 efectivo, Web6/Server10 publicados y releídos, EC ON, bridges4250795666af en ambos hosts y QA de protocolo/negativos PASS. Policies Performance/Discovery revisión2 publicadas20:35Z; destinos anteriores preservados. HubSpot propiedad/campo14/CAS verificados y captura de recibos Meta publicada. Proyecto Ads ON20:36:20Z; companion Vercel READY, cadena de configuración verificada, primera ocurrencia/Graph/identidad nativa/recepción y atribución Ads pendientes. Task permanece parcial.
- 2026-10-18: [revisión completa del candidato y reparación SQL autorizada](../../audits/releases/2026-10-18-candidate-89d70ec13-review.md). Tres columnas/constraints y dos triggers verificados; scheduler existente recuperado sin POST manual. No certifica entrega HubSpot/Graph ni atribución Ads.

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
Release general vigente ec317c928 y configuración Ads/HubSpot publicados18/10; preservar WIP ajeno.
Companion READY, alias/SHA y cadena de configuración releídos20:43:28Z; canarios/health/watchdog PASS.
Siguiente evidencia: observar fuentes reales consentidas y correlacionar ledger/ack/provider, recibo individual
Graph e identidad nativa HubSpot, sin fabricar negocio ni repetir envíos. No afirmar atribución,
calidad o serving por configuración, protocolo local o Test Events.

<!-- ZONE 3 — Execution Spec -->

## Normative Docs

- `docs/reference/measurement-gtm-ga4/09-hubspot-consent.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`

## Scope

- Source capture, encrypted queue, destination adapters, sGTM Client and GA4 audiences.
- Ads online native actions/EC, receipt-gated browser transport and native HubSpot occurrence tracing.

## Out of Scope

- Campaign spend and uploading historical contacts without advertising consent.

## Detailed Spec

Source/payload contracts live in `src/lib/growth/measurement`; explicit advertising context in public POST. Google UPD enriches existing client_id with no events. Ads online has its own receipt-gated reserved channel and native actions; it never creates another GA4 generate_lead. Meta ownership switches only after backend/renderer rollout.

## Rollout Plan & Risk Matrix

Ordering: source/worker → parked migration/secrets → Client preview → context smoke → sender cutover → worker destinations/retention ON → source capture/redeploy last.

| Risk | System | Mitigation | Signal |
|---|---|---|---|
| Duplicate Lead | Meta | One sender at cutover; stable IDs | Test Events/replay |
| PII ordinary params | GA4 | Dedicated top-level user_data only | Payload tests |
| Instrumentation failure rejects booking | Sources | Savepoint/flag/caught preparation | Safe warnings |
| Broad unrelated release | Production | Review actual diff and manifest | Release preflight |

Flags: GROWTH_MEASUREMENT_CAPTURE_ENABLED, GROWTH_MEASUREMENT_META_ENABLED, GROWTH_MEASUREMENT_GOOGLE_UPD_ENABLED, GROWTH_MEASUREMENT_RETENTION_ENABLED default OFF; retention stays ON after rollout during rollback. Capture/send OFF restores data boundary; coordinate legacy Meta trigger restore with backend send disabled. Preserve receipts.
Ads agrega GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED con default OFF y policies opt-in; el valor ON
del proyecto18/10 se completó con companion READY y cadena de configuración verificada; no acredita
por sí solo una conversión real ni recepción proveedor.

## Closing Protocol

Checkpoint18/10: [activación publicada y límites](../../audits/growth/2026-10-18-google-ads-activation.md).
Release general ec317c928 efectivo; Web6/Server10, EC, bridge de ambos hosts, policies revisión2 y
HubSpot configurados/releídos. Meta receipt capture publicado en Server10. El proyecto tiene Ads ON,
y companion READY con alias/SHA y cadena de configuración verificados20:43:28Z; canarios, health y
watchdog PASS. La API no expone el booleano congelado ni acredita una conversión real.
Los planes [previos](../../audits/growth/2026-10-18-google-ads-prerelease-validation.md) y el
[paquete de release](../../operations/releases/google-ads-2026-10-18/README.md) quedan como historia,
no como indicación de volver a publicar. Observar tráfico real para cerrar recepción, identidades
individuales y atribución, sin submissions/bookings/replay fabricados.

- [x] Current Status real and published configuration/protocol evidence recorded with explicit limits.
- [ ] Companion runtime acceptance, first real occurrences, individual receipts and provider reception/attribution verified.
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

### Checkpoint 2026-10-14 — contexto de visitante

[Corrección y evidencia](../../audits/measurement/META_LEAD_VISITOR_CONTEXT_2026-10-14.md):
Server7 publicado, sólo template30; nueve campos matching + website recibidos por Test Events
ambos hosts, código temporal por request. Bridge WP421eaa3 / Think PR14, external_id SHA256,
normalización y helper IP/UA de POST preparados para release completo develop→main.
63 Vitest +25 Client +8 attribution +16 bridge PASS. Primera aceptación comercial sigue
pendiente: ledger últimos7d sin conversiones al corte; no usar fixtures para cerrar ese criterio.

## Verificación del 14/10/2026

PR255 completa la corrección de contexto del visitante y la configuración administrable por
API/CLI/panel; Server9 estricto, ambos hosts y fuente nueva sin redeploy verificados.
[Release y recibos](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
La recepción en Test Events no cierra el acceptance comercial ni demuestra evolución de EMQ.

## Delta 2026-10-17 — Google Ads online y conversiones mejoradas

El operador pidió implementación de GTM para leads y agendas y subagentes de investigación, y recordó
la API GTM. Se conserva ownership de esta task: no nueva task paralela ni infraestructura. Plan:
contratos/fuentes → recibo postcommit → browser/contexto → acciones secundarias/plan GTM → borradores
API/compilación → QA focal → documentación/commit; activación exige gates de publicación/release.
[ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md),
[manual](../../manual-de-uso/growth/activar-conversiones-google-ads.md) y
[evidencia](../../audits/growth/2026-10-17-google-ads-online-conversions.md) poseen el contrato y límites.
26 suites/404 tests y TypeScript focal PASS; sin publicación ni conversión enviada. Data Manager,
resultados CRM y TASK-1885 no se absorben. Primera conversión Meta comercial ya consta en runtime10;
la condición conjunta formulario/reserva del acceptance histórico permanece parcial.
