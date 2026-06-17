# Invariantes operativos para agentes — Integraciones/infra cross-runtime (TASK-490…846)

---

## Invariantes operativos para agentes — Integraciones/infra cross-runtime (TASK-490…846)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo de signature platform, sample-sprint outbound, cross-runtime observability (Sentry init), PostgreSQL connection pooling, HubSpot companies inbound. Contrato por sub-área en sus specs/task-specs (citadas en cada bloque). Dedup = TASK-1160 Slice 4.

### Signature platform invariants — provider-neutral + ZapSign (TASK-490 + TASK-491, desde 2026-06-05)

La firma electrónica de Greenhouse (cartas oferta, contratos laborales, MSA, futuros documentos) es **provider-neutral** (EPIC-001, identidad `documents`). El aggregate `greenhouse_core.signature_requests` (+ `signature_request_signers` + `signature_request_events` append-only, trio state-machine+CHECK+audit TASK-765) modela la solicitud; el provider concreto vive detrás del **port hexagonal** `SignatureProviderAdapter` (`src/lib/signatures/provider-port.ts`). ZapSign es el primer (y único V1) adapter: `zapSignSignatureAdapter` (`src/lib/integrations/zapsign/signature-adapter.ts`).

**Pipeline canónico**:

```text
createSignatureRequest (draft) → sendSignatureRequest (adapter.createDocument → ZapSign)
  → ZapSign callback → /api/webhooks/zapsign (genérica [endpointKey] + processInboundWebhook + inbox dedupe)
    → handler 'zapsign' DISPATCH CASCADE:
       1. getSignatureRequestByProviderToken → applyZapSignStateToSignatureRequest (aggregate)
       2. getMasterAgreementBySignatureDocumentToken → syncMasterAgreementSignature (MSA legacy fallback)
       3. else → ignore
  → reconcile (safety-net): reconcileZapSignSignatureRequest(id) — endpoint admin + CLI
```

**State machine provider-driven (TASK-490)**: `applyProviderStatus` es **monotónico + tolerante a callbacks fuera de orden** (nunca regresa; terminal inmutable). El status event (`signature.request.{partially_signed,completed,failed,...}` v1) se emite SOLO en un cambio real de estado → reentrega del webhook idempotente.

**⚠️ Reglas duras**:

- **NUNCA** llamar la API de ZapSign (`createZapSignDocument`/`getZapSignDocument`) directo desde un dominio o route para el flujo del aggregate. Pasar por `zapSignSignatureAdapter` (port). El lane MSA legacy (`/api/finance/master-agreements/[id]/signature-requests`) es el único caller directo restante y coexiste — NO migrarlo aquí.
- **NUNCA** recrear una ruta webhook one-off para ZapSign (la dedicada `/api/webhooks/zapsign/route.ts` fue borrada en TASK-491). Todo callback entra por el bus canónico (`endpoint_key='zapsign'`, handler `src/lib/webhooks/handlers/zapsign.ts`). Mismo principio para un provider de firma nuevo: handler en el bus, NO ruta dedicada.
- **NUNCA** romper el **dispatch cascade** del handler: el aggregate `signature_requests` tiene prioridad; el lane MSA es el fallback (coexistencia, invariante TASK-490). Modificar el handler sin preservar el fallback MSA rompe la firma de MSA en producción (lane vivo). Los tests `src/lib/webhooks/handlers/zapsign.test.ts` cubren ambos paths.
- **NUNCA** marcar un `signature_request` como `completed` sin `signed_document_asset_id` (CHECK DB). El recovery DEBE bajar el PDF firmado al vault ANTES de aplicar `completed`. Por eso el webhook Y el reconcile comparten `applyZapSignStateToSignatureRequest` (`src/lib/integrations/zapsign/apply-state.ts`) — single source of truth del recovery. NO usar el `reconcileSignatureRequest` genérico de TASK-490 para ZapSign (no baja el archivo → violaría el CHECK).
- **NUNCA** persistir el PDF firmado del aggregate fuera del context `signature_signed_document` (vault privado, acceso own member/own client/HR/Finance/admin). El lane MSA usa `master_agreement` (no mezclar).
- **NUNCA** leer el documento a firmar con `downloadPrivateAsset` en el adapter (infla `download_count` + emite `asset.downloaded` por cada envío). Usar `downloadGreenhouseStorageObject` (read sin side-effects).
- **NUNCA** confiar el status del payload del webhook para el aggregate. El handler **re-consulta** el estado autoritativo vía `adapter.getDocumentState` (la API es la fuente de verdad; el payload puede ser parcial). El lane MSA sí usa el payload (comportamiento legacy preservado verbatim).
- **NUNCA** invocar `Sentry.captureException` directo en estos paths. Usar `captureWithDomain(err, 'documents', { tags: { source: 'zapsign_webhook' | 'admin_signature_request_reconcile' } })`.
- **NUNCA** reconfigurar el webhook de ZapSign ni cambiar el secret `ZAPSIGN_WEBHOOK_SHARED_SECRET` al tocar este flujo. El `auth_mode='bearer'` + el fallback aditivo `x-zapsign-webhook-secret` en `verifyAuth` preservan el auth exacto del route viejo. La URL no cambia.
- **SIEMPRE** que emerja un provider de firma nuevo (DocuSign, etc.), implementar el port `SignatureProviderAdapter` + un handler en el bus + un `apply-state` análogo. Cero lógica de provider en el aggregate.
- **SIEMPRE** que el aggregate gane un producer real (TASK-1024 bridge contracting → `createSignatureRequest`/`sendSignatureRequest`), correr el smoke real ZapSign end-to-end + confirmar los signals `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` en steady=0.

**Spec canónica**: `docs/tasks/complete/TASK-490-signature-orchestration-foundation.md` + `docs/tasks/complete/TASK-491-zapsign-adapter-webhook-convergence.md`. EVENT_CATALOG: Deltas 2026-06-05 (`signature.request.*`). Migraciones: `20260605210419134` (aggregate) + `20260605215340232` (webhook endpoint).

**Bridge contracting → firma (primer producer real del aggregate, TASK-1024, desde 2026-06-05)**: el Workforce Contracting Studio es el primer dominio que produce + consume `signature_requests`. Producer `sendContractingCaseToSignature` (`src/lib/workforce/contracting/signature/`); consumer reactivo `contracting_signature_bridge` (`src/lib/sync/projections/`).

- **NUNCA** firmar un contrato/oferta con el representante legal como firmante ZapSign. El **único firmante electrónico es el TRABAJADOR**; la firma del representante de la entidad va **pre-estampada** en el PDF (TASK-863/1023, `@/lib/legal-signatures`). La e-firma del trabajador es válida para contratos (≠ finiquito, que exige ratificación notarial). El `resolveContractingWorkerSigner` resuelve worker name+email fail-closed (sin email → no se puede enviar).
- **NUNCA** disparar el envío a firma automáticamente al llegar a `ready_for_signature`. Es una **acción de operador explícita** (CTA, capability `workforce.contracting.send_signature`) — el operador revisa el PDF antes de comprometer la e-firma. El evento `ready_for_signature` es audit/notificación, no trigger de envío.
- **NUNCA** llamar la API de ZapSign dentro de una tx PG. El producer es 3-fases: (1 tx) crear el `signature_request` draft idempotente (`caseId:pdfAssetId`); (2 sin tx) `sendSignatureRequest` a ZapSign; (3 tx) avanzar el caso `ready_for_signature → sent_for_signature`. El caso avanza SOLO si ZapSign aceptó (retry idempotente).
- **NUNCA** marcar el caso `fully_signed` sin ligar `signed_pdf_asset_id`. El consumer reactivo re-lee el `signature_request` (que el webhook TASK-491 ya pobló con `signedDocumentAssetId`), liga el asset y avanza el caso. Idempotente + cubre el crash window (transiciona por `sent_for_signature` si el producer murió). El CHECK del aggregate ya garantiza `completed ⇒ signed_document_asset_id`.
- **NUNCA** duplicar los signals del aggregate per-dominio: el contracting reusa `documents.signature_request.{pending_overdue,failed,signed_artifact_missing}` (TASK-490). El único signal contracting-específico es `workforce.contracting.signature_desync` (el caso quedó atrás de su request → consumer falló; steady=0).
- **SIEMPRE** que un dominio nuevo necesite firma (quote, MSA migrado, addenda), reusar el mismo patrón: producer command (validación + createSignatureRequest + sendSignatureRequest fuera de tx + transición) + consumer reactivo filtrado por `sourceKind`. Cero acoplamiento a ZapSign.

### Sample Sprint outbound projection invariants (TASK-837)

Cuando alguien declara un **Sample Sprint** (`engagement_kind IN ('pilot','trial','poc','discovery')`) vía wizard `/agency/sample-sprints`, Greenhouse:

1. **Exige un HubSpot Deal abierto** — el wizard requiere selección de Deal; el server revalida server-side antes de mutar.
2. **Persiste el service localmente** con `hubspot_deal_id`, `idempotency_key = service_id`, `hubspot_sync_status='outbound_pending'` en una sola tx PG + outbox event `service.engagement.outbound_requested v1`.
3. **Async outbound projection** consume el event y proyecta a HubSpot `p_services` (custom object 0-162) en stage `Validación / Sample Sprint` (ID `1357763256`) con asociaciones Deal+Company+Contacts atómicas.
4. **Reliability**: 7 signals bajo subsystem `commercial` cubren todos los failure modes (overdue, dead_letter, partial_associations, deal_closed, drift, outcome_terminal, legacy).

**Pipeline canónico end-to-end**:

```text
Wizard submit (Vercel route handler /api/agency/sample-sprints)
  ├─> validateDealEligibility (getEligibleDealForRevalidation, NEVER trust client)
  ├─> declareSampleSprint() en tx PG:
  │   ├─ INSERT services (hubspot_deal_id, idempotency_key, hubspot_sync_status='outbound_pending')
  │   ├─ INSERT engagement_approvals + audit_log
  │   ├─ publishOutboxEvent('service.engagement.declared')      (TASK-808 path, cache invalidation TASK-835)
  │   └─ publishOutboxEvent('service.engagement.outbound_requested')  (TASK-837 trigger Slice 4)
  ├─> respond 201 con {serviceId, status:'outbound_pending', idempotencyKey}
  │
  ┊  (async, decoupled — Cloud Scheduler ops-reactive-finance */5 min)
  │
Reactive consumer 'sample_sprint_hubspot_outbound':
  ├─ re-read service desde PG (NO confiar payload)
  ├─ idempotency check: GET /services/by-idempotency-key/<idempotency_key>
  ├─ si match: skip POST + UPDATE local (hubspot_service_id, status='ready')
  ├─ si no match: POST /services con properties + associations (Deal+Company+Contacts)
  ├─ UPDATE atomic local: hubspot_service_id, hubspot_last_synced_at, status='ready'|'partial_associations'
  └─ on bridge fail: rollback in_progress → outbound_pending + retry exponencial (maxRetries=3) → outbound_dead_letter
```

**Webhook eco cascade** (anti-duplicate row): cuando HubSpot dispara webhook `service.creation` post-outbound, el handler `hubspotServicesIntakeProjection` aplica lookup cascade ANTES del UPSERT TASK-813b:

1. Si `properties.ef_greenhouse_service_id` matches `services.idempotency_key` local → UPDATE atomic linkando `hubspot_service_id` y skip UPSERT (evita segunda fila).
2. Fallback: UPSERT canónico TASK-813b (path inbound puro).

**Hard rules (18 invariantes anti-regresión)**:

- **NUNCA** ejecutar POST/PATCH/DELETE a HubSpot inline en un route handler Vercel para Sample Sprints. Toda mutación outbound pasa por outbox event + reactive consumer en `ops-worker` Cloud Run (anti-pattern TASK-771).
- **NUNCA** responder 5xx al cliente cuando PG commiteó y solo HubSpot falló. El cliente recibe 201 con `outbound_pending`; el reactive consumer reintenta async.
- **NUNCA** declarar Sample Sprint sin `hubspotDealId` validado server-side contra Deal abierto. La UI nunca decide elegibilidad final — la revalidación corre en `declareSampleSprint` vía `getEligibleDealForRevalidation` (cache bypass).
- **NUNCA** filtrar Deals elegibles por label visible HubSpot. Solo `is_closed`/`is_won`/stage IDs sincronizados desde `hubspot_deal_pipeline_config`.
- **NUNCA** crear `p_services` HubSpot sin idempotency key. `ef_greenhouse_service_id` (creada en TASK-837 Slice 0.5a) es la property writable canónica — `hs_unique_creation_key` es READ-ONLY en `0-162` (verificado en Checkpoint A 2026-05-09).
- **NUNCA** crear property HubSpot `ef_source_deal_id` ni `ef_engagement_origin`. Reusar `ef_deal_id` y `ef_engagement_kind` (las dimensiones ortogonales "tipo" vs "Deal" ya existen).
- **NUNCA** persistir `hubspot_service_id` sin `idempotency_key` previamente persistido. La idempotency key vive en `services.idempotency_key` desde el INSERT local, ANTES del POST HubSpot.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths del outbound projection. Usar `captureWithDomain(err, 'integrations.hubspot', { tags: { source: 'sample_sprint_outbound', stage: '...' } })`.
- **NUNCA** loggear payload completo del bridge response (puede contener PII de contactos). Usar `redactErrorForResponse` y `redactSensitive` antes de persistir o loggear.
- **NUNCA** crear segunda fila `services` cuando webhook eco entra para un service ya creado por outbound. El handler inbound aplica lookup cascade por `idempotency_key` (TASK-837 Slice 4 patch a `hubspot-services-intake.ts`).
- **NUNCA** mover `p_services` HubSpot a Closed automáticamente cuando outcome Greenhouse es terminal (V1 manual). Reliability signal `outcome_terminal_pservices_open` lo escala operativamente. Automatizar es task derivada V1.1.
- **NUNCA** inventar Deal retroactivamente para Sample Sprint legacy sin Deal. Operador comercial decide via manual queue: vincular existente, declarar legacy o cerrar.
- **NUNCA** depender de `ef_pipeline_stage` como source of truth de HubSpot stage. Solo `hs_pipeline_stage`. La property `ef_pipeline_stage` quedó deprecated para Sample Sprints (Checkpoint D resuelto).
- **NUNCA** modificar el CHECK constraint `services_hubspot_sync_status_check` sin extender ambos sets de valores: inbound (`pending|synced|unmapped` TASK-813/836) + outbound (`outbound_pending|outbound_in_progress|ready|partial_associations|outbound_dead_letter` TASK-837).
- **SIEMPRE** que un Sample Sprint se declare via wizard, emitir outbox event `service.engagement.outbound_requested v1` en la misma tx PG. NO confundir con `service.engagement.declared v1` (TASK-808) que tiene cache invalidation consumer (TASK-835).
- **SIEMPRE** revalidar elegibilidad del Deal server-side al submit (stage abierto + company + ≥1 contacto). El cache del reader tiene TTL 60s; la revalidación es fresh (NEVER cache).
- **SIEMPRE** que outbound projection reciba 429 de HubSpot, respetar `Retry-After` header del bridge response. Backoff exponencial automatico via outbox state machine TASK-773.
- **SIEMPRE** que un service entre en `outbound_dead_letter`, requiere humano via dead-letter UX (`commercial.engagement.recover_outbound` capability, FINANCE_ADMIN o EFEONCE_ADMIN solo).

**Helpers canónicos**:

- `getEligibleDealForRevalidation(hubspotDealId)` — `src/lib/commercial/eligible-deals-reader.ts`, fresh PG read.
- `listEligibleDealsForSampleSprint({...})` — wizard reader con cache TTL 60s per subject.
- `declareSampleSprint(input)` — `src/lib/commercial/sample-sprints/store.ts`, atomic tx + 2 outbox events.
- `sampleSprintHubSpotOutboundProjection` — `src/lib/sync/projections/sample-sprint-hubspot-outbound.ts`, reactive consumer.
- `createHubSpotGreenhouseService` / `findHubSpotGreenhouseServiceByIdempotencyKey` / `updateHubSpotGreenhouseService` — `src/lib/integrations/hubspot-greenhouse-service.ts`, bridge clients.

**Reliability signals (subsystem `commercial`, steady=0)**:

- `commercial.sample_sprint.outbound_pending_overdue` (lag/warning)
- `commercial.sample_sprint.outbound_dead_letter` (dead_letter/error)
- `commercial.sample_sprint.partial_associations` (drift/warning)
- `commercial.sample_sprint.deal_closed_but_active` (drift/warning)
- `commercial.sample_sprint.deal_associations_drift` (drift/warning)
- `commercial.sample_sprint.outcome_terminal_pservices_open` (drift/warning)
- `commercial.sample_sprint.legacy_without_deal` (data_quality/warning)

**Spec canónica**: `docs/tasks/in-progress/TASK-837-deal-bound-sample-sprint-service-projection.md`. Runbook recovery: `docs/operations/runbooks/sample-sprint-outbound-recovery.md`. Bridge endpoints: `services/hubspot_greenhouse_integration/app.py` (POST `/services`, PATCH `/services/<id>`, GET `/services/by-idempotency-key/<key>`).

### Cross-runtime observability — Sentry init invariant (TASK-844)

`src/lib/**` corre en **5 runtimes distintos** y todos consumen el wrapper canónico `captureWithDomain` (207 callsites) para emitir incidents a Sentry con tag `domain` para roll-up por módulo en el reliability dashboard.

| Runtime | Sentry init path | Status |
|---|---|---|
| **Vercel** (Next.js 16 App Router) | Auto vía `src/instrumentation.ts` → `sentry.server.config.ts` → `next.config.ts withSentryConfig` | ✅ canónico desde día 1 |
| **ops-worker** Cloud Run (generic Node ESM) | `services/ops-worker/server.ts` línea de init invocando `initSentryForService('ops-worker')` desde `services/_shared/sentry-init.ts` | ✅ TASK-844 Slice 3 |
| **commercial-cost-worker** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **ico-batch** Cloud Run | mismo patrón ops-worker | ✅ TASK-844 Slice 4 |
| **hubspot_greenhouse_integration** Cloud Run (Python) | Out of scope (Python services tienen su propio SDK Sentry si emerge necesidad) | N/A |

**Helper canónico**: `services/_shared/sentry-init.ts` (`initSentryForService(serviceName, options?)`).

- DSN missing → `console.warn` once + return (graceful degradation, captureWithDomain hace no-op via Sentry SDK builtin fallback).
- DSN present → `Sentry.init({ dsn, environment, serverName, release, tracesSampleRate })` + `Sentry.setTag('service', serviceName)`.
- Idempotente — singleton flag previene doble init + warn spam.
- Secret canónico GCP: `greenhouse-sentry-dsn` (Secret Manager). Si no existe, deploy.sh continúa con warn.

**Wrapper canónico**: `src/lib/observability/capture.ts` importa `@sentry/node` (NO `@sentry/nextjs`). `@sentry/node` es el SDK underlying que `@sentry/nextjs` envuelve — runtime-portable. Sentry hub es global singleton: ambos runtimes acceden al mismo hub.

**Contexto root cause** (ISSUE-074): TASK-813b (async intake p_services HubSpot via webhook → outbox → reactive consumer) nunca funcionó end-to-end en producción porque el wrapper importaba `@sentry/nextjs` cuyo shape variaba en runtime Cloud Run, causando `Sentry.captureException is not a function`. Detectado durante smoke test post-merge PR #113 (TASK-836 follow-up). Cerrado live 2026-05-09 19:30:04 con cycle PATCH→materialized verificado.

**⚠️ Reglas duras**:

- **NUNCA** importar `@sentry/nextjs` directamente en código bajo `src/lib/`. Usar `captureWithDomain(err, '<domain>', { extra })` desde `src/lib/observability/capture.ts` que abstrae `@sentry/node` runtime-portable.
- **NUNCA** crear nuevo Cloud Run Node service sin `initSentryForService(name)` como primera línea ejecutable de `server.ts`, después de imports y antes de `createServer`. Lint rule `greenhouse/cloud-run-services-must-init-sentry` (modo `error`) bloquea el commit.
- **NUNCA** invocar `Sentry.captureException()` directo en code path con dominio claro. Usar `captureWithDomain(err, '<domain>', { extra })`. Sin tag `domain`, el incident no aparece en signals per-module del reliability dashboard.
- **NUNCA** modificar `services/_shared/sentry-init.ts` para cambiar el contract de degradation. DSN missing DEBE no-op silenciosamente; observabilidad nunca bloquea path principal.
- **NUNCA** mover el call `initSentryForService(...)` después del primer createServer/listen en `server.ts`. Tiene que correr antes de cualquier handler HTTP que pueda invocar funciones de `@/lib/**`.
- **NUNCA** importar el helper desde `@/lib/...` o re-exportarlo desde `src/`. Vive intencionalmente en `services/_shared/` para preservar el boundary runtime (Vercel runtime usa init Next.js auto; Cloud Run runtime usa este helper explícito).
- **NUNCA** crashear el helper si DSN tiene formato inválido — Sentry SDK valida internamente y degrada graceful.
- **SIEMPRE** que emerja un Cloud Run Node service nuevo, agregar `initSentryForService('<nombre>')` + `COPY services/_shared/ ./services/_shared/` en Dockerfile + opcionalmente SENTRY_DSN secret mount en deploy.sh.
- **SIEMPRE** que un nuevo runtime aparezca (ej. Cloudflare Workers, AWS Lambda, generic Bun service), validar que `@sentry/node` corre allí o adaptar el wrapper sin cambiar la superficie de import.

**Defense-in-depth (3 capas)**:

1. **Lint rule** `greenhouse/cloud-run-services-must-init-sentry` (modo `error`, TASK-844 Slice 6): bloquea commits que crean `services/<svc>/server.ts` con import de `@/lib/**` sin `initSentryForService` import + call.
2. **Reliability signal** `observability.cloud_run.silent_failure_rate` (TASK-844 Slice 5): cuenta filas en `outbox_reactive_log` con `last_error LIKE '%captureException is not a function%'` últimas 24h. Steady=0; cualquier > 0 indica regresión runtime.
3. **Cloud Logging stderr fallback**: si Sentry no está configurado, errores siguen visibles en Cloud Logging via `console.error`/`console.warn`. Helper escribe warn al startup cuando DSN missing.

**Spec canónica**: `docs/tasks/in-progress/TASK-844-cross-runtime-observability-sentry-init.md`. ISSUE relacionado: `docs/issues/resolved/ISSUE-074-ops-worker-missing-sentry-bundle-blocks-projections.md` (post Slice 8).

### PostgreSQL connection management — runtime invariants (TASK-846)

Greenhouse comparte una única instancia Cloud SQL PostgreSQL 16 entre 5 runtimes (Vercel + 3 Cloud Run Node services + hubspot Python). Cada runtime tiene su propio pool de `pg-node` independiente. Sin coordinación cross-runtime explícita, cualquier runtime puede saturar el budget global de 100 conexiones (ISSUE detectado 2026-05-09: 103% saturation live + Sentry NEW issue 7 errors `remaining connection slots are reserved`).

**Architectural decision V1 deployed (TASK-846)**: defense-in-depth de 3 capas, deployment data-driven del multiplexer. NO se deploya PgBouncer en V1 — la evidencia post-Slice 1 ALTER ROLE (saturation 103% → 66%) indica que el problema fundamental era leak de idle connections, no demanda > capacidad.

**Topología V1 canónica**:

```text
Vercel functions × N    pool max=3, idleTimeoutMillis=10s    ──→ Cloud SQL
ops-worker              pool max=15, idleTimeoutMillis=30s        max_connections=100
commercial-cost-worker  (TASK-846 Slice 3)                        ALTER ROLE idle_session_timeout=5min
ico-batch                                                          (TASK-846 Slice 1)
                            ┌─ Reliability signal ─┐
                            │ runtime.postgres.    │
                            │ connection_saturation│   ← V2 trigger data-driven
                            │ ok < 60%             │
                            │ warning > 60%        │
                            │ error > 80%          │
                            └──────────────────────┘
```

**V2 contingente (TASK-846)**: si reliability signal alerta sustained > 60%, deploy PgBouncer en GKE Autopilot (~$75-85/mes). Cloud Run NO soporta TCP raw → PgBouncer NO va en Cloud Run.

**⚠️ Reglas duras**:

- **NUNCA** crear `Pool` de `pg-node` directo sin pasar por `getGreenhousePostgresConfig()` desde `src/lib/postgres/client.ts`. El helper aplica runtime detection (Vercel max=3, Cloud Run max=15) automáticamente. Lint rule `greenhouse/no-direct-pg-pool` (TASK-846 Slice 7) bloquea regresión.
- **NUNCA** configurar `max > 15` en Vercel function. La VLA ya satura PG con 5-10 functions concurrentes. Override solo con justificación documentada en task spec.
- **NUNCA** removeer `ALTER ROLE greenhouse_app SET idle_session_timeout = '5min'` ni `greenhouse_ops SET idle_session_timeout = '15min'`. Settings persistidos en `pg_roles.rolconfig` cross-restart. Verificación: `SELECT rolname, rolconfig FROM pg_roles WHERE rolname IN ('greenhouse_app', 'greenhouse_ops')` debe devolver el timeout configurado.
- **NUNCA** usar `LISTEN/NOTIFY` desde aplicación. Greenhouse usa outbox pattern canónico (TASK-773). Garantiza compatibilidad con V2 PgBouncer transaction pooling cuando se deploye.
- **NUNCA** usar prepared statements server-side (`PREPARE ... EXECUTE`). `pg-node` por default usa simple Query — preserva compatibilidad transaction pooling.
- **NUNCA** ignorar el reliability signal `runtime.postgres.connection_saturation` en estado `unknown` por > 24h. Es la señal data-driven que dispara V2 deployment.
- **NUNCA** invocar `Sentry.captureException` directo en code path `src/lib/postgres/`. Usar `captureWithDomain(err, 'cloud', ...)`.
- **SIEMPRE** que emerja un nuevo runtime que necesite Postgres, usar `getGreenhousePostgresConfig()` que detecta runtime automáticamente. Override via env vars `GREENHOUSE_POSTGRES_MAX_CONNECTIONS` / `GREENHOUSE_POSTGRES_IDLE_TIMEOUT_MS` solo con razón documentada.
- **SIEMPRE** monitorear `runtime.postgres.connection_saturation` en `/admin/operations`. Steady < 30% (V1 funcional). Sustained > 60% → escalar a TASK-847 V2 deployment.

**Defense-in-depth V1 (3 capas)**:

1. **PG-side `idle_session_timeout` por role** (ALTER ROLE): PG corta connections idle > 5min server-side. Persistente cross-restart.
2. **pg-node Pool tuning per-runtime**: max conservador, idleTimeoutMillis agresivo. Backpressure local.
3. **Reliability signal `runtime.postgres.connection_saturation`**: detecta regresión global. Trigger V2 deployment data-driven.

**Spec canónica**: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`. Task implementación V1: `docs/tasks/in-progress/TASK-846-postgres-connection-pooling-v1-data-driven.md`. Task contingencia V2: `docs/tasks/to-do/TASK-847-postgres-pgbouncer-gke-v2-deployment.md`.

### HubSpot inbound webhook — companies + contacts auto-sync (TASK-706)

Cuando alguien crea o actualiza una company/contact en HubSpot, **NO requerir sync manual ni esperar al cron diario**. La app HubSpot Developer envía webhooks v3 a Greenhouse y el portal sincroniza automáticamente.

**Coexistencia con paths previos** (no se contraponen — los 3 convergen en el mismo motor `syncHubSpotCompanies`):

| Path | Trigger | Latencia | Rol |
|---|---|---|---|
| **Webhook** (TASK-706, default) | Event HubSpot | <10s | Path por defecto en producción. Captura el 99% de cambios en tiempo real. |
| **Adoption manual** (TASK-537) | Click en Quote Builder | <2s | Fallback rápido cuando el operador necesita avanzar antes que llegue el webhook (timeout, race UI), o adopt company antigua que predates webhook subscription. |
| **Cron diario** (TASK-536) | Schedule | ~24h | Safety net — sweep periódico que captura events perdidos (HubSpot retries exhausted, handler bug). NO desactivar aunque webhook esté en prod. |

Los 3 hacen UPSERT idempotente por `hubspot_company_id`. Si convergen al mismo company en el mismo segundo, no hay duplicados.

**Pipeline canónico**:
1. **HubSpot Developer Portal** → suscripción a `company.creation`, `company.propertyChange`, `contact.creation`, `contact.propertyChange`. Target URL: `https://greenhouse.efeoncepro.com/api/webhooks/hubspot-companies`. Signature method: v3.
2. **Endpoint Next.js** `/api/webhooks/hubspot-companies` (genérico `/api/webhooks/[endpointKey]/route.ts`) recibe POST.
3. **`processInboundWebhook`** lookup en `greenhouse_sync.webhook_endpoints` por `endpoint_key='hubspot-companies'`. Inbox row creado para idempotencia (dedupe by `event_id`).
4. **Handler `hubspot-companies`** (en `src/lib/webhooks/handlers/hubspot-companies.ts`) valida firma HubSpot v3 internamente (`auth_mode='provider_native'`):
   - HMAC-SHA256 sobre `POST + uri + body + timestamp` con `HUBSPOT_APP_CLIENT_SECRET`.
   - Rechaza requests con timestamp > 5 min de antigüedad.
   - Comparison timing-safe.
5. Extrae company IDs únicos del array de events (deduplica). Para `contact.*` usa `associatedObjectId` como company id.
6. Para cada company id, llama `syncHubSpotCompanyById(id, { promote: true, triggeredBy: 'hubspot-webhook' })`:
   - Fetch `/companies/{id}` y `/companies/{id}/contacts` desde Cloud Run bridge.
   - UPSERT en `greenhouse_crm.companies` + `greenhouse_crm.contacts`.
   - Llama `syncHubSpotCompanies({ fullResync: false })` para promover crm → `greenhouse_core.organizations` + `greenhouse_core.clients`.
7. Failures individuales se capturan en Sentry con `domain='integrations.hubspot'`. Si TODOS fallan → throw para que HubSpot reintente.

**⚠️ Reglas duras** (TASK-878 canonical async, desde 2026-05-14):
- **NO** crear endpoints paralelos para HubSpot. Si emerge necesidad de webhook para deals, products, etc., agregar nuevo handler bajo `src/lib/webhooks/handlers/` y nuevo `webhook_endpoints` row, NO endpoint custom.
- **NUNCA** llamar `syncHubSpotCompanyById` desde el webhook handler `hubspot-companies` (request path). El path canónico es emitir outbox event `commercial.hubspot_company.sync_requested v1` via `enqueueHubSpotCompanyEventsAsync`. La projection `hubspot_companies_intake` (TASK-878 Slice 2) consume el event en ops-reactive-finance cron fuera del request path.
- **NUNCA** hacer bridge fetch (Cloud Run hubspot-greenhouse-integration) sincrono dentro del webhook handler — HubSpot timeout 5s; el sync toma 3-10s y dispara retries concurrentes que generaron la race condition cerrada en Slice 1 (RETURNING canónico).
- **NUNCA** generar `company_record_id` / `contact_record_id` en TS antes del INSERT con la intención de hacer SELECT-verify posterior. Siempre `INSERT … ON CONFLICT DO UPDATE … RETURNING <pk>` (patrón canónico TASK-878 Slice 1, ya usado en `nubox/sync-nubox-balances.ts` y `sync/projections/hubspot-services-intake.ts`). El verify defensivo cazaba el síntoma, no la causa.
- **NUNCA** llamar `syncTenantCapabilitiesFromIntegration` inline en el webhook handler. La capability sync vive dentro del `refresh` de la projection (post-TASK-878 Slice 2).
- `syncHubSpotCompanyById` sigue invocable desde CLI scripts (`scripts/integrations/hubspot-sync-company.ts`), admin endpoint (`/api/admin/integrations/hubspot/sync-company`), Quote Builder adopt (TASK-537), y la projection `hubspot_companies_intake` — todos paths que corren fuera del 5s budget HubSpot.
- **NO** sincronizar manualmente si el webhook está activo. El CLI queda solo para backfills históricos o casos de recuperación.
- **NUNCA** loggear el body crudo del webhook en logs (puede contener PII de contactos). El sistema generic ya lo persiste en `greenhouse_sync.webhook_inbox_events` con scrubbing apropiado.
- Cuando se cree un nuevo cliente Greenhouse manualmente (sin pasar por HubSpot), seguir el patrón `hubspot-company-{ID}` solo si tiene HubSpot ID; si NO tiene HubSpot, usar otro prefix (ej. `internal-`, `nubox-`, etc.) para evitar colisión.
- **Reliability signal canónico** `commercial.hubspot_company.intake_dead_letter` (kind=dead_letter, severity=error si count>0, steady=0, subsystem rollup `commercial`). Cuando alerta: bridge Cloud Run caído, `HUBSPOT_ACCESS_TOKEN` corrupto/expirado, permisos OAuth revocados, o schema PG drift.

**Configuración HubSpot Developer Portal** (one-time):
1. App "Greenhouse Bridge" en `developers.hubspot.com/apps`.
2. Webhooks > Create subscription per evento.
3. Activar la app en el portal HubSpot del tenant (Account Settings > Integrations > Connected Apps).

**Tests**: `pnpm test src/lib/webhooks/handlers/hubspot-companies` (6 tests cubren signature validation, timestamp expiry, dedup, partial failures, retry semantics).

**Spec canónica**: `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (sección HubSpot inbound).
