# TASK-379 — Reactive Projections Enterprise Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Cerrada 2026-04-13`
- Rank: `n/a`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-379-reactive-projections-enterprise-hardening` (mergeada via PRs #53 + #54 + release #55)
- Legacy ID: `none`
- GitHub Issue: `ISSUE-046` (cerrado)

## Closing Summary 2026-04-13

Implementacion completa de los 6 slices + audit-only sweep follow-up + provision de 5 alerting policies + promovida a produccion. Backlog drenado de 11,495 → 0 el mismo dia que se detecto el incidente. Cierra ISSUE-046.

**Entregables shippeados**:

- **PR #53** (`task/TASK-379-reactive-projections-enterprise-hardening` → `develop`, merged commit `62f6dfeb`): 6 slices completos (consumer V2 + circuit breaker + 4 publishers refactorizados + Cloud Run scaling + 7 cron jobs por dominio + custom metrics + dashboard + V2 architecture docs).
- **PR #54** (`fix/reactive-audit-only-sweep` → `develop`, merged commit `8d90f15f`): audit-only sweep helper + wire-up al endpoint `/reactive/recover`.
- **PR #55** (`develop` → `main`, merged commit `68c84891`): release de 27 commits acumulados, Vercel prod deploy success.
- **Migration aplicada**: `migrations/20260413105218813_reactive-pipeline-v2-circuit-breaker.sql` (tabla `projection_circuit_state`).
- **Cloud Run**: revision `00007-q45` (V1) → `00008-grv` (V2) → `00009-p8b` (V2 + sweep).
- **IAM**: `roles/monitoring.metricWriter` granted al SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`.
- **Cloud Scheduler**: 7 jobs por dominio (`ops-reactive-organization`, `-finance`, `-people`, `-notifications`, `-delivery`, `-cost-intelligence`, `-recover`).
- **Cloud Monitoring**: 5 custom metric descriptors (`backlog_depth`, `lag_seconds_p95`, `throughput_events_per_run`, `error_rate`, `circuit_breaker_state`) + 1 notification channel `webhook_tokenauth` + 5 alerting policies (IDs `12724517129604513698`, `12724517129604512902`, `9439773336525841089`, `9439773336525840646`, `242492081293795724`).

**Verificacion cuantitativa**:

| Metric | Pre | Post |
|---|---|---|
| Total raw outbox `published` sin log entry | 11,495 | **0** |
| Eventos coaleados V2 | 0 (loop silencioso) | 5,420 |
| Eventos audit-only marcados | 0 | 6,071 |
| Eventos rastreables para TASK-377 | 0 | 2 |
| Projections en circuit `closed` | n/a | 14/14 |

**Documentacion arquitectonica** (canonica):

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (reemplaza V1)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md` (spec tecnica + diagrama)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md` (4 SLOs formales)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` (5 policies + webhook bypass)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 + §5 (actualizado)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (schema versioning convention)
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` (Reactive serving SLO section)
- `docs/operations/TASK_379_DEPLOYMENT_RETROSPECTIVE.md` (retrospectiva operacional completa de la sesion)

**Issue resuelto**: `docs/issues/resolved/ISSUE-046-reactive-pipeline-silent-skip-backlog.md`

**Follow-ups que NO bloquean cierre** (capturados en otros tasks/issues):

1. Implementar TASK-377 (Kortex bridge) y replayear los 2 sister_platform_binding events guardados como `no-op:pending-task-377-consumer` (ver Delta block en `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`).
2. Activar branch protection en `develop` para prevenir push directo (decision pendiente del operador).
3. Cron de retencion que purgue `outbox_events` con entries `no-op:audit-only` > 90 dias (future ops sprint).
4. Cleanup del codigo legacy v1 publishing en las 4 projections refactorizadas (esperar 1-2 semanas de operacion estable).
5. Migrar outbox polling a Pub/Sub event bus (siguiente evolucion arquitectonica, posible TASK-382).
6. Mejorar formato de notificaciones Slack (Pub/Sub → Cloud Run → Slack bot pipeline) — solo si raw JSON deja de ser suficiente.

## Summary

Refactor del pipeline reactivo de outbox + projections + ops-worker para llevarlo a estandar enterprise: scope-level coalescing, multi-instance parallelism con locking, circuit breakers por projection, fan-out reduction en publishers, SLO/SLI medidos, autoscaling driven por backlog y dead-letter alerting. Resuelve el backlog operativo actual de 5446 eventos sin procesar y deja la infraestructura preparada para volumenes 10x.

## Why This Task Exists

El smoke post-deploy del 2026-04-13 expuso que el reactive backlog real (post-fix de `readReactiveBacklogOverview` que ya filtra eventos sin handler) tiene **5446 eventos sin procesar**, dominados por `provider.tooling_snapshot.materialized` (5040) que la projection `staff_augmentation_placements` **nunca ha procesado** (`lastReactedAt: null`). El problema raiz no es un bug puntual — es un conjunto de defectos arquitectonicos del pipeline reactivo que solo se vuelven visibles bajo carga real:

1. **Fan-out explosion en publishers**: `provider_tooling.refresh()` publica 1 evento por snapshot materializado (N eventos por run). Cada uno triggerea una re-materializacion completa del periodo en `staff_augmentation_placements`, que el consumer procesa 1-a-1. La cadena amplifica trabajo redundante.
2. **Consumer itera evento-por-evento sin coalescer por scope**: la tabla `refresh_queue` ya tiene dedup por `(projection, entity_type, entity_id)` pero el consumer no la usa — lee directamente del outbox. 500 eventos del mismo periodo causan 500 refreshes en lugar de 1.
3. **Single-instance Cloud Run sin parallelism real**: el ops-worker probablemente corre con `min=0/max=1/concurrency=1`. La queue se procesa serialmente. No hay locking optimista en `outbox_reactive_log` que permita multi-instance safe.
4. **Sin circuit breaker por projection**: una projection que falla repetidamente bloquea el batch entero. No hay quarentena.
5. **Sin SLO real**: "healthy" se define binariamente como `totalUnreacted === 0`. No hay P50/P95 latency, no hay throughput targets, no hay alerting cuando se degrada.
6. **Cloud Scheduler como polling ciego**: 3 jobs cada 5-15 min sin respeto por la profundidad del queue. Bajo backlog grande, tarda horas en drenar.
7. **Sin alerting en dead-letter**: el estado `dead-letter` existe en `outbox_reactive_log` pero un evento muerto se queda en silencio sin notificar.

Greenhouse opera workflows criticos (payroll, finance, cost attribution) sobre esta infraestructura. El requirement ahora es **enterprise-grade**: el pipeline debe procesar todo, dentro de SLO medibles, con observability accionable y escalado horizontal real.

## Goal

- Refactor del consumer para drenar desde `refresh_queue` con scope-level coalescing.
- Multi-instance parallelism en Cloud Run ops-worker con locking optimista por evento.
- Circuit breaker por projection con quarentena automatica y recovery.
- Fan-out reduction en publishers (`provider_tooling`, `commercial_cost_attribution`, `operational_pl`) — publish-once-per-period.
- Cloud Scheduler dividido por dominio para paralelismo per-domain.
- SLO formales con metricas custom en Cloud Monitoring + alerting Slack/PagerDuty.
- Backfill controlado del backlog actual (5446 eventos) y validacion bajo load test sintetico.
- Documentacion de la nueva arquitectura como playbook V2 que reemplaza V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (seccion 4.9 ops-worker)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- El refactor es **backward-compatible**: durante el rollout coexisten consumer V1 y V2, los publishers v1 y v2, hasta que la migracion este verificada.
- **No perder eventos** durante el switchover. Cada cambio de consumer/publisher tiene un mecanismo de fallback.
- **Idempotencia garantizada**: cada projection refresh debe ser idempotente (ya lo es contractualmente, hay que verificarlo bajo concurrencia).
- Schemas de eventos versionados — los consumers nuevos aceptan v1 (legacy) y v2 (nuevo) durante la transicion.
- El backfill del backlog historico es **opt-in y reversible** — no se mass-acks sin auditoria.
- Cloud Run ops-worker sigue siendo el unico runner reactivo. No reintroducir polling de Vercel salvo como fallback manual.
- Las metricas custom siguen el naming convention `greenhouse/reactive/<metric>` definido en `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`.

## Normative Docs

- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — playbook actual, sera reemplazado por V2 al cierre.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` seccion 4.9 — descripcion canonica del ops-worker.
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — politica de SLO y alerting.
- `services/ops-worker/README.md` — operacion del servicio.

## Dependencies & Impact

### Depends on

- Tabla `greenhouse_sync.outbox_events` (existente).
- Tabla `greenhouse_sync.outbox_reactive_log` (existente).
- Tabla `greenhouse_sync.refresh_queue` (existente — hoy infrautilizada).
- Cloud Run service `ops-worker` en `us-east4` (existente).
- Cloud Scheduler jobs `ops-reactive-process`, `ops-reactive-process-delivery`, `ops-reactive-recover` (existentes — seran reemplazados).
- Cloud Monitoring custom metrics API (a habilitar/configurar).
- Slack webhook `SLACK_ALERTS_WEBHOOK_URL` (ya configurado).

### Blocks / Impacts

- **Cualquier feature nueva que dependa de projections reactivas** se beneficia inmediatamente del SLO mejorado.
- `TASK-377` (Kortex bridge) consume eventos de sister platforms — debe coordinar con el nuevo consumer V2.
- Modulos que publican eventos costosos (finance, payroll, cost attribution) deben revisar si su patron de publish entra dentro del fan-out budget del nuevo modelo.
- ISSUE-044 (dashboard SSR streaming) — independiente, no impactado.

### Files owned

- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/sync/projection-registry.ts`
- `src/lib/sync/projections/provider-tooling.ts`
- `src/lib/sync/projections/commercial-cost-attribution.ts`
- `src/lib/sync/projections/operational-pl.ts`
- `src/lib/sync/projections/staff-augmentation.ts`
- `src/lib/sync/publish-event.ts`
- `src/lib/operations/reactive-backlog.ts`
- `src/lib/operations/reactive-circuit-breaker.ts` (nuevo)
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `services/ops-worker/Dockerfile`
- `migrations/[next]_reactive-pipeline-v2-locking-and-circuit-breaker.sql` (nuevo)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (nuevo)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md` (nuevo)
- `docs/issues/open/ISSUE-045-reactive-backlog-fan-out-diagnostic.md` (a crear en Phase 0)

## Current Repo State

### Already exists

- `src/lib/sync/reactive-consumer.ts` — consumer actual con iteracion evento-por-evento desde outbox, sin scope coalescing. **CRITICAL DISCOVERY (Phase 1 audit)**: el bug NO es falta de SKIP LOCKED — es que el consumer no usa los helpers que ya existen en refresh-queue.ts.
- `src/lib/sync/refresh-queue.ts` — **YA TIENE** `dequeueRefreshBatch()` con `FOR UPDATE SKIP LOCKED` ([refresh-queue.ts:112](src/lib/sync/refresh-queue.ts#L112)) y `claimOrphanedRefreshItems()` ([refresh-queue.ts:189-227](src/lib/sync/refresh-queue.ts#L189-L227)). El consumer V2 los va a llamar en lugar de iterar outbox.
- `src/lib/sync/projection-registry.ts` — registry funcional con `getAllTriggerEventTypes`, `getProjectionsForEvent`, `PROJECTION_DOMAINS`. In-memory, populated at startup.
- 25 projections registradas en `src/lib/sync/projections/index.ts`. Inventario completo en el audit report (Phase 2).
- `services/ops-worker/server.ts` — endpoints `POST /reactive/process`, `POST /reactive/process-domain` (acepta `domain` en body), `POST /reactive/recover`, `POST /cost-attribution/materialize`, `GET /health`.
- 3 Cloud Scheduler jobs activos: `ops-reactive-process` (todos los dominios `*/5`), `ops-reactive-process-delivery` (solo delivery `2-59/5`), `ops-reactive-recover` (`*/15`). Solo delivery tiene su propio lane.
- Cloud Run baseline real (corregido del audit, no la asuncion previa): `--memory=1Gi --cpu=1 --timeout=300 --max-instances=2 --concurrency=1` ([deploy.sh:35-37](services/ops-worker/deploy.sh#L35-L37)).
- `src/lib/operations/reactive-backlog.ts` — fix de filtrado por handlers registrados ya en main (PR #50), confirmado en [reactive-backlog.ts:129](src/lib/operations/reactive-backlog.ts#L129).
- Schema actual de `outbox_events`: `event_id PK, aggregate_type, aggregate_id, event_type, payload_json (JSONB), status, occurred_at, published_at`. Append-only por diseno.
- Schema actual de `outbox_reactive_log`: `(event_id, handler) PK, reacted_at, result, retries, last_error`. Ya tiene ON CONFLICT idempotency.
- Schema actual de `projection_refresh_queue`: `refresh_id PK, projection_name, entity_type, entity_id, status (CHECK pending/processing/completed/failed), priority, triggered_by_event_id, error_message, retry_count, max_retries, created_at, updated_at, UNIQUE(projection_name, entity_type, entity_id)`. Recovery via `updated_at` staleness, NO necesita columnas claimed_by explicitas.
- Sentry runtime + Slack alerts (`SLACK_ALERTS_WEBHOOK_URL`) configurados.
- SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/run.invoker`. Pendiente verificar si tiene `roles/monitoring.metricWriter`.

### Gap

- Consumer no usa `refresh_queue` (que ya tiene SKIP LOCKED) — itera el outbox directo con offset/limit (no multi-instance safe).
- Sin scope-level coalescing — cada evento dispara un refresh aunque caigan 500 al mismo scope. Esto es el corazon del problema de fan-out.
- Sin circuit breaker por projection. Una projection que falla repetidamente bloquea el batch entero.
- Publishers en cadena: `provider_tooling.refresh()` publica 1 evento por snapshot (N eventos por run); `staff_augmentation_placements.refresh()` consume Y publica eventos propios; `operational_pl` publica 1-2 eventos por snapshot. Cadena que amplifica fan-out.
- Cloud Run con `max-instances=2 concurrency=1` — solo 2 procesos serializados como techo. Insuficiente bajo backlog real.
- Solo 1 dominio (`delivery`) tiene su propio Cloud Scheduler lane. Los otros 5 dominios (`organization`, `people`, `finance`, `notifications`, `cost_intelligence`) comparten el job "todos".
- Sin custom metrics en Cloud Monitoring para reactive pipeline.
- Sin alerting policies en Slack/PagerDuty para backlog, lag o dead-letter.
- Sin SLO formal documentado.
- Event Catalog NO documenta convencion de schema versioning para payloads — TASK-379 introduce el patron `schemaVersion: 2` como convencion nueva.
- 5446 eventos backlog real esperando procesamiento (descubierto en smoke post-deploy 2026-04-13).
- `staff_augmentation_placements.lastReactedAt: null` en perpetuidad — bandera roja sobre projection nunca consumida.

### Audit Phase 2 corrections (2026-04-13)

Las siguientes asunciones de la spec original quedaron corregidas tras Phase 1 discovery:

1. **Slice 1**: NO se "agrega SKIP LOCKED" — los helpers ya existen en `refresh-queue.ts`. El work real es REFACTORIZAR el consumer para llamarlos en lugar de iterar outbox manualmente.
2. **Slice 1 schema**: `outbox_events` NO necesita `locked_by/locked_at` (es append-only). `projection_refresh_queue` NO necesita `claimed_by/claimed_at` explicitos (la heuristica de `updated_at` staleness es suficiente para `claimOrphanedRefreshItems`).
3. **Slice 1 nueva tabla**: solo `projection_circuit_state` es nueva. La migracion es 1 CREATE TABLE, 0 ALTER en tablas existentes.
4. **Slice 3 baseline**: el Cloud Run NO esta en `max=1` como asumi — esta en `max=2 concurrency=1`. El cambio sigue siendo correcto (`max=5 concurrency=4`) pero el delta es menor.
5. **Slice 3 domain partition**: ya existe parcialmente (`getProjectionsForEvent(eventType, domain?)`, endpoint `/reactive/process-domain`). El work es agregar 5 cron jobs nuevos via `deploy.sh`, no construir el sistema desde cero.
6. **Schema versioning**: NO es preexistente en el Event Catalog. TASK-379 introduce `schemaVersion: 2` como patron nuevo, debe documentarse en V2 playbook.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Diagnostico y baseline (1 hora)

- Crear `docs/issues/open/ISSUE-045-reactive-backlog-fan-out-diagnostic.md` con el contexto del descubrimiento.
- Ejecutar 3 queries SQL read-only contra Postgres prod via `pnpm pg:connect:shell`:
  1. `SELECT COUNT(*), MIN(reacted_at), MAX(reacted_at), result FROM greenhouse_sync.outbox_reactive_log WHERE handler LIKE 'staff_augmentation_placements:%' GROUP BY result;`
  2. `SELECT MIN(occurred_at), MAX(occurred_at), COUNT(*) FROM greenhouse_sync.outbox_events WHERE event_type = 'provider.tooling_snapshot.materialized';`
  3. `SELECT date_trunc('day', occurred_at) AS day, COUNT(*) FROM greenhouse_sync.outbox_events WHERE event_type = 'provider.tooling_snapshot.materialized' AND status = 'published' GROUP BY 1 ORDER BY 1;`
- Medir baseline de throughput y latency: `SELECT r.handler, COUNT(*), AVG(EXTRACT(EPOCH FROM (r.reacted_at - e.occurred_at))) AS avg_lag_sec, PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (r.reacted_at - e.occurred_at))) AS p95_lag_sec FROM greenhouse_sync.outbox_reactive_log r JOIN greenhouse_sync.outbox_events e USING (event_id) WHERE r.reacted_at > NOW() - INTERVAL '7 days' GROUP BY r.handler;`
- Inventariar configuracion actual del Cloud Run ops-worker: `gcloud run services describe ops-worker --region us-east4`.
- Verificar estado de Cloud Scheduler jobs: `gcloud scheduler jobs list --location us-east4`.
- Documentar baseline cuantitativo en ISSUE-045 (throughput por projection, lag P95, instance count, scheduler health).

### Slice 1 — Consumer refactor (2-3 dias)

- Migrar `processReactiveEvents` para drenar desde `greenhouse_sync.refresh_queue` en lugar de iterar `outbox_events` directamente.
- Mantener el path actual de `enqueueRefresh` desde el publish (ya existe) y agregar enqueue desde el consumer cuando detecte eventos pendientes.
- Implementar **scope-level coalescing**: cuando el consumer drene un batch, agrupar entries por `(projection_name, entity_type, entity_id)` y ejecutar `refresh()` una sola vez por grupo, marcando todos los eventos asociados como reacted en una sola transaccion.
- Agregar **row-level locking** en `outbox_reactive_log` con `INSERT ... ON CONFLICT (event_id, handler) DO NOTHING RETURNING` para prevenir double-processing entre instancias.
- Agregar `SELECT ... FOR UPDATE SKIP LOCKED` en el query del refresh_queue para que multiples instancias del worker tomen entries distintos sin bloquearse.
- Implementar **circuit breaker por projection** en `src/lib/operations/reactive-circuit-breaker.ts`:
  - Tracking de last N runs (default 20) por projection en memoria + persistencia opcional en una nueva tabla `greenhouse_sync.projection_circuit_state`.
  - Si failure rate > 50% en ultimos N runs → projection en `open` state (saltea por X minutos).
  - Si projection lleva > 1 hora en `open` → `half-open`: prueba 1 evento. Si pasa, vuelve a `closed`.
- Structured logging por run: `{ runId, instanceId, eventsScanned, scopesCoalesced, projectionsTriggered, eventsAcknowledged, eventsFailed, deadLettered, durationMs, perProjection: {...} }` en formato JSON para Cloud Logging parsing.
- Tests de integracion contra Postgres real (no mocks) para validar:
  - Coalescing reduce N eventos al mismo scope a 1 refresh.
  - Locking previene double-processing bajo concurrency simulada.
  - Circuit breaker abre y recupera correctamente.

### Slice 2 — Publisher fan-out reduction (1-2 dias)

- Refactor `provider_tooling.refresh()` para publicar **1 solo** evento `provider.tooling_snapshot.period_materialized` con payload `{ periodId, schemaVersion: 2, snapshotCount, providerIds: [], _materializedAt }` en lugar de N eventos por snapshot.
- Repetir patron en `commercial_cost_attribution.refresh()` y `operational_pl.refresh()` para sus eventos `*.materialized`.
- Agregar helper compartido `publishPeriodMaterializedEvent({ aggregateType, periodId, snapshotCount, payload })` en `src/lib/sync/publish-event.ts` para que el patron sea consistente.
- Schema versioning: agregar `schemaVersion` a todos los payloads nuevos. Los consumers deben aceptar v1 (legacy) y v2 (nuevo) durante la transicion.
- Migration plan documentado: durante 1-2 semanas post-deploy ambos formatos coexisten. Despues se elimina el codigo de v1 publishing en una task de cleanup.
- Actualizar consumers downstream (`staff_augmentation_placements`, etc.) para leer detalle desde tabla materializada cuando reciben el evento v2 (que solo trae el periodId).

### Slice 3 — Infraestructura ops-worker scaling (1 dia)

- Actualizar `services/ops-worker/deploy.sh` con flags:
  - `--min-instances=0 --max-instances=5`
  - `--cpu=2 --memory=2Gi`
  - `--concurrency=4`
  - `--timeout=540`
  - `--set-env-vars=REACTIVE_BATCH_SIZE=100,REACTIVE_INSTANCE_ID=$CLOUD_RUN_REVISION`
- Reemplazar los 3 Cloud Scheduler jobs actuales por **un job por dominio**:
  - `ops-reactive-organization` (`*/5`)
  - `ops-reactive-finance` (`*/5`)
  - `ops-reactive-people` (`2-59/5`)
  - `ops-reactive-notifications` (`*/2`) — alta prioridad
  - `ops-reactive-delivery` (`*/5`)
  - `ops-reactive-cost-intelligence` (`*/10`)
  - `ops-reactive-recover` (`*/15`) — recovery global
- Cada job invoca `POST /reactive/process?domain=<x>` con su propio cupo de CPU/memoria.
- Agregar endpoint `GET /reactive/queue-depth?domain=<x>` que devuelve la profundidad por dominio (para alerting).

### Slice 4 — Observability y SLO (1 dia)

- Implementar emision de **custom metrics** a Cloud Monitoring desde el ops-worker:
  - `greenhouse/reactive/backlog_depth` (gauge, dimension: projection_name, domain)
  - `greenhouse/reactive/lag_seconds_p95` (distribution, dimension: projection_name, domain)
  - `greenhouse/reactive/throughput_events_per_minute` (gauge, dimension: projection_name, domain)
  - `greenhouse/reactive/error_rate` (gauge, dimension: projection_name, domain)
  - `greenhouse/reactive/circuit_breaker_state` (gauge: 0=closed, 1=half-open, 2=open, dimension: projection_name)
- Crear **alerting policies** en Cloud Monitoring (gestionadas por Terraform si el repo lo usa, o documentadas como gcloud commands):
  - Backlog total > 500 → Slack warning
  - Backlog total > 2000 → PagerDuty critical
  - Lag P95 > 900s (15 min) por projection → Slack warning
  - Circuit breaker `open` > 1 hora → Slack warning
  - Dead-letter count > 0 (cualquier valor) → Slack warning con detalle del evento
- **Dashboard upgrade** en `src/views/greenhouse/admin/ops-health/`: drill-down por projection, historico de lag, throughput trend, estado de circuit breaker visible.
- **SLO formal** en `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md`:
  - SLO 1 — Latency: 99% de eventos procesados en ≤ 5 minutos desde publicacion (rolling 7d window).
  - SLO 2 — Completeness: 99.9% de eventos eventualmente procesados (incluye retries, excluye dead-letters resueltos manualmente).
  - SLO 3 — Hygiene: 0 eventos en dead-letter por > 24 horas sin resolucion.
  - SLO 4 — Recovery: tiempo de drain de un backlog de 5000 eventos < 30 minutos.

### Slice 5 — Backfill, validacion y cierre (medio dia)

- Script `scripts/reactive-backfill.ts` que procesa el backlog actual en chunks controlados:
  - Lee eventos sin entrada en `outbox_reactive_log`.
  - Decide por tipo de evento si reprocesar o mass-ack como `skipped:legacy-pre-coalescing`.
  - Logs detallados por chunk.
  - Idempotente — puede correrse multiples veces sin dañar nada.
- **Load test sintetico**: script que publica 10000 eventos de prueba con un spike + steady state, mide tiempo de drain, latencia P95, y verifica que no se cruza ningun SLO.
- Validar metricas en Cloud Monitoring durante el load test.
- Documentar la nueva arquitectura en `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` — reemplaza V1.
- Archivar V1 en `docs/architecture/_archive/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`.

## Out of Scope

- Migrar el outbox a Pub/Sub (event-driven puro). Es una opcion arquitectonica valida pero requiere su propia task — esta task mejora el polling existente sin cambiar el transport.
- Reescribir las projections en otro lenguaje o framework. Mantienen TypeScript + esbuild + Cloud Run.
- Cambios en el modelo de datos de los publishers (tablas raiz). El refactor de fan-out es solo en el evento publicado, no en como se materializan los snapshots.
- Migracion de Cloud Run a GKE o Cloud Functions. Se queda en Cloud Run.
- Cambios al sistema de auth del worker (sigue siendo Cloud Scheduler con SA `greenhouse-portal`).
- Resolucion de ISSUE-044 (dashboard SSR streaming) — independiente.
- Optimizacion de las queries individuales que cada projection ejecuta. Si una projection es lenta intrinsecamente, se documenta como follow-up pero no se ataca aqui.

## Detailed Spec

### Modelo de coalescing por scope

El consumer V2 trabaja en estas fases por cada run:

1. **Drain**: `SELECT * FROM greenhouse_sync.refresh_queue WHERE projection_name IN (...) AND status = 'pending' AND retries < max_retries ORDER BY enqueued_at ASC LIMIT N FOR UPDATE SKIP LOCKED`. Las entries del queue ya estan deduplicadas por `(projection_name, entity_type, entity_id)`.
2. **Group**: en memoria, agrupar por `(projection_name, entity_type, entity_id)`. Cada grupo contiene 1+ eventos asociados via `triggered_by_event_id`.
3. **Execute**: para cada grupo, llamar `projection.refresh(scope, payload)` UNA vez. El payload es el del evento mas reciente del grupo (los anteriores son redundantes por scope).
4. **Acknowledge**: en una transaccion atomica:
   - Insertar entries en `outbox_reactive_log` para TODOS los eventos del grupo (cada uno con `result: 'coalesced'` o `'processed'`).
   - Actualizar `refresh_queue.status = 'completed'` para la entry.
   - Actualizar `circuit_breaker_state` con el resultado.

### Modelo de circuit breaker

Tabla nueva:

```sql
CREATE TABLE greenhouse_sync.projection_circuit_state (
  projection_name TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  total_runs_window INTEGER NOT NULL DEFAULT 0,
  failed_runs_window INTEGER NOT NULL DEFAULT 0,
  opened_at TIMESTAMPTZ,
  half_open_probe_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Logica:

- `closed` → procesa normal. Cada run actualiza `total_runs_window` y `failed_runs_window`. Si `failed_runs_window / total_runs_window > 0.5` con `total_runs_window >= 10` → transicion a `open`, set `opened_at = NOW()`.
- `open` → consumer SALTA esta projection en cada batch. A los 30 min (`opened_at + 30 min < NOW()`), transicion a `half_open`, set `half_open_probe_at = NOW()`.
- `half_open` → consumer procesa exactamente 1 evento. Si exito → `closed`, reset counters. Si falla → `open`, reset `opened_at`.

### Multi-instance locking pattern

```sql
-- Worker A claims a batch
WITH claimed AS (
  SELECT id FROM greenhouse_sync.refresh_queue
  WHERE status = 'pending'
    AND projection_name = ANY($1)
  ORDER BY enqueued_at ASC
  LIMIT $2
  FOR UPDATE SKIP LOCKED
)
UPDATE greenhouse_sync.refresh_queue q
SET status = 'processing', claimed_by = $3, claimed_at = NOW()
FROM claimed
WHERE q.id = claimed.id
RETURNING q.*;
```

`claimed_by` es el `instanceId` del Cloud Run revision. Si una instancia muere mid-process, un recovery job re-claim entries con `status = 'processing'` y `claimed_at < NOW() - INTERVAL '15 minutes'`.

### Pseudocode del consumer V2

```ts
async function processReactiveEvents(opts: { domain?: ProjectionDomain; batchSize?: number }) {
  const instanceId = process.env.REACTIVE_INSTANCE_ID || randomUUID()
  const projections = filterProjectionsByDomain(opts.domain)
  const allowedProjections = projections.filter(p => circuitBreaker.canRun(p.name))

  const claimed = await claimRefreshQueueBatch({
    projectionNames: allowedProjections.map(p => p.name),
    batchSize: opts.batchSize ?? 100,
    instanceId
  })

  const groupedByScope = groupBy(claimed, c => `${c.projection_name}:${c.entity_type}:${c.entity_id}`)

  const results = []
  for (const [groupKey, entries] of groupedByScope) {
    const projection = projections.find(p => p.name === entries[0].projection_name)
    const eventsForGroup = await loadEventsForQueueEntries(entries)
    const latestPayload = eventsForGroup[eventsForGroup.length - 1].payload_json

    try {
      const description = await projection.refresh(
        { entityType: entries[0].entity_type, entityId: entries[0].entity_id },
        latestPayload
      )
      await acknowledgeBatch(entries, eventsForGroup, 'coalesced', description)
      circuitBreaker.recordSuccess(projection.name)
      results.push({ groupKey, status: 'success', count: entries.length })
    } catch (error) {
      await markBatchFailed(entries, error)
      circuitBreaker.recordFailure(projection.name, error)
      results.push({ groupKey, status: 'failed', error: error.message })
    }
  }

  return { instanceId, results, durationMs: Date.now() - startMs }
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Consumer V2 drena desde `refresh_queue`, no del outbox directo.
- [ ] Scope-level coalescing reduce N eventos al mismo scope a 1 refresh efectivo (medible en logs estructurados).
- [ ] Multi-instance locking probado bajo concurrency simulada — 0 eventos double-processed en test.
- [ ] Circuit breaker abre tras 50% failure rate en 10 runs y recupera tras success en half-open.
- [ ] `provider_tooling`, `commercial_cost_attribution` y `operational_pl` publican 1 evento por periodo en lugar de N por entidad.
- [ ] Cloud Run ops-worker corre con `min=0/max=5/concurrency=4` confirmado en `gcloud run services describe`.
- [ ] 6 Cloud Scheduler jobs por dominio reemplazan los 3 actuales, todos activos.
- [ ] 5 metricas custom (`backlog_depth`, `lag_seconds_p95`, `throughput`, `error_rate`, `circuit_breaker_state`) emiten a Cloud Monitoring por projection_name.
- [ ] 5 alerting policies activas en Cloud Monitoring con Slack/PagerDuty wiring.
- [ ] SLO 1 (latency P99 < 5 min) cumplido durante load test sintetico de 10000 eventos.
- [ ] SLO 4 (drain time < 30 min) verificado bajo el load test.
- [ ] Backlog historico de 5446 eventos drenado completamente y verificado en metric.
- [ ] `staff_augmentation_placements.lastReactedAt` deja de ser null tras backfill.
- [ ] `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` publicado.
- [ ] `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md` publicado.
- [ ] V1 playbook movido a `docs/architecture/_archive/`.
- [ ] ISSUE-045 cerrado y movido a `docs/issues/resolved/`.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Tests de integracion contra Postgres real (no mocks):
  - `pnpm test src/lib/sync/reactive-consumer.integration.test.ts`
  - `pnpm test src/lib/operations/reactive-circuit-breaker.test.ts`
- `bash services/ops-worker/deploy.sh` ejecutado contra staging primero.
- Validacion manual del Ops Health dashboard post-deploy.
- Load test sintetico documentado y reproducible: `pnpm reactive:load-test`.
- Sentry sin nuevos issues post-deploy del worker V2.
- Slack alerts verificados con un evento sintetico que cruza umbral.

## Closing Protocol

- [ ] Cerrar ISSUE-045 (`docs/issues/open/ISSUE-045-reactive-backlog-fan-out-diagnostic.md` → `resolved/`).
- [ ] Cerrar ISSUE-044 si la coalescing del consumer ayuda al SSR streaming (probablemente no — son independientes).
- [ ] Mover este TASK a `docs/tasks/complete/`.
- [ ] Actualizar `docs/tasks/README.md`.
- [ ] Actualizar `Handoff.md` y `changelog.md`.
- [ ] Archivar V1 playbook.
- [ ] Notificar al equipo en Slack del nuevo SLO y de los dashboards updated.

## Follow-ups

- **Pub/Sub event bus** como reemplazo del polling de Cloud Scheduler. Es la siguiente evolucion arquitectonica natural; queda como TASK-380 propuesta tras cerrar esta.
- **Tracing distribuido** con OpenTelemetry para correlacionar eventos entre publishers y consumers.
- **Cleanup de codigo legacy** de los publishers v1 una vez la migracion v2 lleve 1-2 semanas estable.
- **Alerting de eventos huerfanos** (eventos publicados que no tienen ninguna projection registrada) — distinto del fix de PR #50 que solo los filtra del metric.
- Evaluar si vale la pena mover el backlog historico a una tabla `outbox_events_archive` post-procesamiento para reducir el tamaño de la tabla activa.

## Open Questions

- ¿La nueva tabla `projection_circuit_state` necesita HA con replicacion, o es OK que viva en la misma instancia Cloud SQL? (probable: misma instancia es suficiente)
- ¿Que threshold de `consecutive_failures` para abrir el breaker? Default propuesto: 5 fallas consecutivas con failure rate > 50% en 10 runs. Validar con el equipo antes de implementar.
- ¿El load test sintetico debe correr contra staging o contra una instancia ephemeral dedicada? Riesgo de contaminar metrics reales en staging.
- ¿Se rotan las metricas custom de Cloud Monitoring tras X dias para controlar costo? Costo de custom metrics no es despreciable a largo plazo.
- ¿El backfill del backlog historico se hace en horario de baja carga o en cualquier momento? Recomendacion: madrugada America/Santiago para no competir con cron jobs reales.
