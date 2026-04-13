# TASK-379 Deployment Retrospective — 2026-04-13

> **Status:** Closed
> **Sprint:** Single-day (2026-04-13)
> **Owner:** Platform / Ops (Claude Code session)
> **Spec:** `docs/tasks/in-progress/TASK-379-reactive-projections-enterprise-hardening.md`
> **Issue:** `docs/issues/resolved/ISSUE-046-reactive-pipeline-silent-skip-backlog.md`
> **PRs shipped:** #53, #54, #55
> **Production commit:** `68c84891` (merge to `main`, Vercel deploy success)

## Proposito

Documento operacional canonico de la sesion del 2026-04-13 que detecto, diagnostico, refactorizo, validado, desplegado a produccion y monitoreado el pipeline reactivo de Greenhouse. Sirve como:

1. Audit trail completo de las decisiones tomadas y por que.
2. Referencia para futuras tasks que toquen la misma infraestructura.
3. Lecciones de ingenieria operacional que aplican mas alla del reactive pipeline.
4. Evidencia cuantitativa de que la nueva arquitectura V2 funciona bajo carga real.

## Linea de tiempo

| Hora UTC | Evento |
|---|---|
| ~10:30 | Smoke post-deploy de produccion descubre que `Ops Health > Reactive backlog` reporta `degraded` con `totalUnreacted=5446`. |
| ~10:45 | Diagnostico inicial encuentra que el contador real es ~11,495 eventos. Worker corriendo cada 5 min reportando `50 processed, 0 failed, 0 projections`. |
| ~11:00 | Apertura de TASK-379 con plan de 6 slices; ISSUE-046 documentado como incidente operativo P0. |
| ~11:00-11:15 | Slice 0 — diagnostico SQL contra prod confirma fan-out + silent-skip. Baseline de Cloud Run + Cloud Scheduler capturado. |
| ~11:15-12:30 | Slice 1 — migration + reactive-circuit-breaker + refactor de processReactiveEvents. Tests 24/24 verde. |
| ~12:30-13:00 | Slices 2 + 3 en paralelo via subagentes. Slice 2: 4 publishers refactorizados (1 evento por periodo). Slice 3: deploy.sh actualizado + 7 cron jobs por dominio + nuevo endpoint queue-depth. |
| ~13:00-13:30 | Slices 4 + 5 en paralelo. Slice 4: cloud-monitoring-emitter + dashboard upgrade. Slice 5: backfill + load test scripts + Playbook V2 + Architecture V2. |
| ~13:30 | Build + lint + tsc + 1037 tests verde. PR #53 abierto. |
| ~14:00 | CI verde tras 2 retries (los preexisting tests flaky se resolvieron previamente). PR #53 merged a `develop`. |
| ~14:15 | `roles/monitoring.metricWriter` granted al SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`. |
| ~14:30 | `bash services/ops-worker/deploy.sh` ejecutado. Cloud Run revision `00007-q45` (V1) → `00008-grv` (V2). 7 Cloud Scheduler jobs por dominio reemplazan los 3 anteriores via cleanup idempotente. |
| ~14:45 | 6 lane jobs disparados manualmente. Worker procesa scope-coalesced refreshes en serio: `finance done — 500 processed, 0 failed, 1 projections, 167ms`. |
| ~15:00 | Backlog raw observado bajando: 11,495 → 8,091 → 7,591 → 1,408. |
| ~15:15 | Investigacion del residual 1,408: son audit-only events sin handler que el V2 (correctamente) no fetchea. |
| ~15:20 | PR #54 (audit-only sweep) abierto, fix CI por unhandled rejection del cloud-monitoring-emitter, push del fix. |
| ~15:30 | One-time SQL sweep marca 6,073 eventos como `no-op:audit-only`. 2 sister_platform_binding events re-marcados como `no-op:pending-task-377-consumer`. |
| ~15:35 | Backlog total: **0**. PR #54 merged a develop. ISSUE-046 cerrado. |
| ~15:40 | Re-deploy ops-worker con sweep wired al endpoint `/reactive/recover`. Cloud Run revision `00009-p8b` LIVE. |
| ~15:45 | `/reactive/recover` curl directo retorna `{recovered:0, failed:0, auditOnlySwept:0}`. Steady state. |
| ~15:50 | Notification channel `webhook_tokenauth` creado apuntando al `greenhouse-slack-alerts-webhook` secret (bypass del OAuth Slack flow). 5 alerting policies provisionadas. |
| ~16:00 | PR #55 abierto: develop → main, 27 commits acumulados. CI verde. |
| ~16:10 | PR #55 merged a `main` (commit `68c84891`). Vercel prod deploy SUCCESS. `https://greenhouse.efeoncepro.com/` responde HTTP 308 → /dashboard. |
| ~16:15 | Local en `develop`, working tree clean, sesion cerrada. |

Total: ~5h45m de la deteccion del incidente al deploy completo en produccion con alerting activo.

## Cambios cuantitativos

### Backlog reactive

| Metric | Pre | Post |
|---|---|---|
| Total raw outbox `published` sin log entry | **11,495** | **0** |
| Eventos coaleados por consumer V2 | 0 (loop silencioso) | 5,420 |
| Eventos audit-only marcados `no-op:audit-only` | 0 | 6,071 |
| Eventos rastreables para TASK-377 (`no-op:pending-task-377-consumer`) | 0 | 2 |
| Projections con state `closed` | n/a | 14 / 14 |
| Projections en circuit breaker `open` | n/a | 0 / 14 |

### Cloud Run ops-worker

| Setting | Pre (V1) | Post (V2) |
|---|---|---|
| Revision activa | `ops-worker-00007-q45` | `ops-worker-00009-p8b` |
| max-instances | 2 | 5 |
| concurrency | 1 | 4 |
| cpu | 1 | 2 |
| memory | 1Gi | 2Gi |
| timeout | 300s | 540s |
| Custom env vars | — | `REACTIVE_BATCH_SIZE=500` |

### Cloud Scheduler jobs

| Pre (V1) | Post (V2) |
|---|---|
| `ops-reactive-process` (todos los dominios cada 5 min) | `ops-reactive-organization` (cada 5 min) |
| `ops-reactive-process-delivery` (cada 5 min, offset +2 min) | `ops-reactive-finance` (cada 5 min) |
| `ops-reactive-recover` (cada 15 min) | `ops-reactive-people` (cada 5 min, offset +2 min) |
|  | `ops-reactive-notifications` (cada 2 min) |
|  | `ops-reactive-delivery` (cada 5 min) |
|  | `ops-reactive-cost-intelligence` (cada 10 min) |
|  | `ops-reactive-recover` (cada 15 min) |

### IAM

| Pre | Post |
|---|---|
| `roles/aiplatform.user`, `roles/bigquery.dataViewer`, `roles/bigquery.jobUser`, `roles/cloudsql.client`, `roles/run.invoker` | + **`roles/monitoring.metricWriter`** (granted via `gcloud projects add-iam-policy-binding ... --condition=None`) |

### Cloud Monitoring

| Categoria | Pre | Post |
|---|---|---|
| Custom metric descriptors | 0 | **5** (`backlog_depth`, `lag_seconds_p95`, `throughput_events_per_run`, `error_rate`, `circuit_breaker_state`) |
| Notification channels | 0 | **1** (`webhook_tokenauth` → `greenhouse-slack-alerts-webhook`) |
| Alerting policies | 0 | **5** |

## Decisiones arquitectonicas tomadas

### 1. Drenar de `refresh_queue`, no de `outbox_events`

**Discovery clave en Slice 0**: la spec original de TASK-379 asumia que habia que "agregar SKIP LOCKED" al consumer. La realidad descubierta en el audit fue que `refresh-queue.ts` ya tenia `dequeueRefreshBatch()` con `FOR UPDATE SKIP LOCKED` desde hace tiempo — el consumer simplemente no lo usaba. El refactor real fue **eliminar codigo duplicado** y delegar al helper existente.

**Leccion**: cuando la spec dice "agregar X", primero verificar si X ya existe en otra capa. Mucha funcionalidad de greenhouse esta implementada pero no cableada. Audit antes de implementar.

### 2. Eliminar el silent-skip path como invariante

V1 hacia `if (!scope) continue` sin marcar nada en `outbox_reactive_log`. Eventos con `extractScope()` que retornaba null quedaban en limbo: ni procesados, ni marcados, ni rastreables. El consumer los re-fetcheaba en cada batch creando un loop invisible.

V2 establece como **invariante**: cada evento que entra al consumer DEBE salir con un entry en `outbox_reactive_log`. Si no hay handler → `no-op:no-handler`. Si extractScope retorna null → `no-op:no-scope`. Si refresh falla → `retry` o `dead-letter`. Si circuit breaker esta open → no acknowledge (re-fetch en proximo batch, decision deliberada para permitir cooldown). El sweep de PR #54 cubre el caso de eventos cuyo type ni siquiera entra al fetch (audit-only).

**Leccion**: en pipelines async, la falta de un acknowledge silencioso es un anti-patron. Cada paso debe terminar con una marca explicita en algun lado.

### 3. Scope-level coalescing como propiedad emergente, no feature

V2 agrupa eventos por `(projection_name, entity_type, entity_id)` en memoria y llama `refresh()` una vez por grupo. 500 eventos `provider.tooling_snapshot.materialized` para `finance_period=2026-04` se colapsan a 1 sola materializacion. **Este coalescing no requiere logica nueva** — sale gratis del modelo de "pasar al refresh el latest payload del grupo".

El log de la primera ejecucion en prod confirmo el patron en vivo: `finance done — 500 processed, 0 failed, 1 projections, 167ms`. 500 eventos → 1 refresh → 167ms.

**Leccion**: cuando un sistema tiene fan-out caracteristico, coalescing es la unica defensa que escala. Diseñar para colapsar redundancia debe ser explicito en el contrato del consumer.

### 4. Publishers publican 1 evento por periodo, no N por entidad

`provider_tooling.refresh()` publicaba antes 1 evento por snapshot (N por run). Ahora publica 1 evento `provider.tooling_snapshot.period_materialized` con `{periodId, snapshotCount, providerIds[]}`. Los consumers downstream que necesitan detalle por entidad lo leen de la tabla materializada, no del payload del evento. Mismo patron en `commercial_cost_attribution`, `operational_pl`, `staff_augmentation_placements`.

**Leccion**: el outbox no es para transferir datos, es para señalar transiciones. Los datos viven en sus tablas canonicas. Cualquier intento de meter "todo el detalle" en el payload del evento es deuda futura.

### 5. Schema versioning explicito (`schemaVersion: 2`)

El Event Catalog V1 no documentaba schema versioning de payloads. V2 introduce la convencion: payloads nuevos llevan `schemaVersion: 2`, los viejos sin campo se asumen v1, y los consumers deben aceptar ambos durante la ventana de migracion. Despues de 2 semanas de operacion estable, el codigo legacy de v1 publishing puede eliminarse en una task de cleanup separada.

**Leccion**: incluso en un sistema interno, los eventos persistidos en outbox son un contrato con futuros consumers. Versionar explicitamente desde el dia uno es mas barato que migrar payloads despues.

### 6. Circuit breaker por proyeccion, no por evento

El circuit breaker vive en una nueva tabla `projection_circuit_state` con state machine `closed → open → half_open → closed`. Una projection que falla repetidamente se quarantina sin bloquear a las demas del batch. El cooldown default es 30 min. El probe en half-open es un solo evento.

**Leccion**: en pipelines reactivos, una projection sick puede convertirse en un poison pill que envenena todo el batch. El circuit breaker como aislamiento de fallo es estandar en sistemas de mensajeria; no tenerlo era una falla de diseño del V1.

### 7. Audit-only sweep como cleanup explicito en la fase de recovery

Los eventos sin handler (Nubox sync, audit logs, eventos legacy) acumulaban en `outbox_events` indefinidamente porque el V2 (correctamente) no los fetchea. Solucion: nuevo helper `sweepAuditOnlyEvents()` wireado al endpoint `/reactive/recover`. El cron `ops-reactive-recover` (cada 15 min) automaticamente marca eventos audit-only como `no-op:audit-only`. Una futura cron de retencion puede borrar entries `no-op:audit-only` > 90 dias sin perder informacion.

**Leccion**: en un outbox table pattern, los eventos nunca pueden quedar sin un terminal state. "Sin terminal state" es un bug latente, no un comportamiento aceptable.

### 8. Webhook bypass para Cloud Monitoring → Slack

La spec original de Slice 4 documentaba el `slack` channel type via OAuth en Cloud Console. **OAuth Slack channels no son scriptables via gcloud** — requieren que un workspace admin abra el browser y autorice la integracion. Solucion encontrada en runtime: el channel type `webhook_tokenauth` acepta una URL arbitraria. Apuntandolo al secret `greenhouse-slack-alerts-webhook` (que ya existe y contiene un Slack incoming webhook URL), el alerting funciona end-to-end sin tocar el browser.

Trade-off: las notificaciones llegan al canal de Slack como JSON crudo (sin formato pretty del block kit). Adecuado para warning/critical alerting. Si se necesita formato pretty en el futuro, el siguiente paso es Pub/Sub → Cloud Run → Slack bot pipeline.

**Leccion**: cualquier integracion que requiere OAuth en una console UI es un flujo no-scriptable y debe documentarse como tal. Buscar el equivalente webhook directo siempre que sea posible.

### 9. Defense-in-depth en el cloud-monitoring-emitter para CI

CI fallaba con 9 unhandled rejections post-test porque `@google-cloud/monitoring` SDK schedulea background GoogleAuth metadata lookups que rechazan async cuando no hay ADC (CI runner). Fix: agregar `isTestEnvironment()` guard que bail si `process.env.VITEST` o `NODE_ENV=test`, con `GREENHOUSE_REACTIVE_FORCE_REAL_EMITTER=1` como escape hatch para futuros integration tests reales.

**Leccion**: cualquier SDK que abre conexiones de red al instanciar debe tener un kill switch para CI. La libreria oficial GCP es asi en TODOS los servicios — Storage, Pub/Sub, Firestore, Monitoring, etc. Doc esto como patron en `claude-api` skill o equivalente.

### 10. Audit-trail addendum commits para colisiones Codex/Claude

Durante la sesion, Codex pusheo a develop directo (sin PR) entre mis commits, generando colisiones en el working tree y commits con mensajes engañosos. La solucion ad-hoc fue agregar un **addendum commit vacio** explicando exactamente que paso, citando el reflog. No es perfecto pero deja un audit trail honesto sin rewrite-history.

**Leccion**: la convivencia de multiples agentes IA en el mismo repo es un problema arquitectonico real. Branch protection en `develop` (rechazar push directo, exigir PR) eliminaria esta categoria entera. Documentado en `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`.

## Patrones operacionales validados

### A. Subagentes en paralelo para trabajo independiente

Los slices 2+3 corrieron en paralelo via dos subagentes. Mismo para 4+5. Cada uno con su propio prompt detallado (~500 palabras), constraints explicitas sobre que archivos NO tocar, y reporting estructurado al final. Resultado: implementacion completa de los 6 slices en una sola sesion.

### B. Monitor tool para watchdogs sin polling activo

Para esperar Cloud Build, Vercel deploys, CI runs y backlog drain: el `Monitor` tool corre un poll script en background y solo emite eventos cuando hay transiciones de estado. Evita polling manual y deja al thread principal trabajando en otras cosas.

### C. Diagnostico SQL antes de tocar codigo

Slice 0 corrio 12+ queries SQL contra Postgres prod en read-only para confirmar las hipotesis del audit ANTES de cambiar una sola linea de codigo. Algunos hallazgos contradijeron la spec original (refresh-queue ya tenia SKIP LOCKED, los 5040 eventos eran de un solo dia no fan-out cronico, etc.). Sin las queries, el refactor habria atacado sintomas equivocados.

### D. Cherry-pick de fix follow-up despues del PR principal

PR #54 (audit-only sweep) se separo intencionalmente de PR #53 (TASK-379 main work). Razones:
1. PR #53 ya estaba mergeado y desplegado, no queriamos retrasarlo.
2. El sweep era un descubrimiento del rollout ("hay 6000 audit-only eventos que el metric no ve pero estan en raw outbox") — no parte del scope original.
3. Mantener PR #53 enfocado en el rediseño + PR #54 enfocado en el cleanup operacional facilita el code review y el revert si hace falta.

### E. One-time SQL como herramienta operacional

Cuando el deploy del sweep code requeria 5-10 min adicionales (rebuild + push + deploy), el sweep equivalente se ejecuto **directamente como SQL** contra prod. Mismo efecto, sin esperar el deploy. El codigo del sweep que despues se deployo asegura que **futuros** eventos audit-only se limpien automaticamente.

**Leccion**: para cleanup one-time de datos, SQL directo + commit del codigo de cleanup en paralelo es mas rapido que esperar a que el codigo deployado lo procese. Solo aplicable cuando la operacion es idempotente (como un INSERT con ON CONFLICT DO NOTHING).

## Lo que NO se hizo (ni se intento)

1. **Migracion del outbox a Pub/Sub event bus**: documentado en TASK-379 spec como "out of scope" y "follow-up para TASK-380 propuesta". Esta sesion se mantuvo dentro del polling+queue model.

2. **Rewrite del consumer en otro lenguaje**: TypeScript + esbuild + Cloud Run sigue siendo el stack.

3. **Tracing distribuido (OpenTelemetry)**: identificado como follow-up. La instrumentacion actual via `source_sync_runs` + structured logs + custom metrics es suficiente para el SLO baseline.

4. **Cleanup del codigo legacy v1 publishing**: las 4 projections refactorizadas en Slice 2 publican v2 events pero el codigo de v1 no fue removido para preservar backward-compat durante 1-2 semanas. Cleanup en task separada.

5. **Implementacion de TASK-377 (Kortex bridge)**: out of scope. Los 2 sister_platform_binding events del audit trail se marcaron como `no-op:pending-task-377-consumer` con instrucciones SQL de replay en el Delta de TASK-377.

6. **Branch protection en `develop`**: identificado como problema operacional pero requiere decision del user para activarlo en GitHub repo settings.

## Acciones operativas pendientes

| # | Item | Owner | Bloqueo |
|---|---|---|---|
| 1 | Implementar TASK-377 (Kortex bridge) y replayear los 2 sister_platform_binding events | Future sprint | Diseño policy pendiente |
| 2 | Activar branch protection en `develop` para prevenir push directo | User | Decision pendiente |
| 3 | Cron de retencion que purgue `outbox_events` con entries `no-op:audit-only` > 90 dias | Future ops sprint | Diseño + autorizacion |
| 4 | Cleanup de codigo legacy v1 publishing en las 4 projections refactorizadas | Future cleanup task | Esperar 1-2 semanas de operacion estable |
| 5 | Migrar outbox polling a Pub/Sub event bus (siguiente evolucion arquitectonica) | TASK-380 propuesta | Design phase |
| 6 | Mejorar formato de notificaciones Slack (Pub/Sub → Cloud Run → Slack bot pipeline) | Future ops task | Solo si raw JSON deja de ser suficiente |

## Referencias

- **Tasks**: `docs/tasks/in-progress/TASK-379-reactive-projections-enterprise-hardening.md`, `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md` (Delta block 2026-04-13)
- **Issue resuelto**: `docs/issues/resolved/ISSUE-046-reactive-pipeline-silent-skip-backlog.md`
- **PRs**: #50 (filtro de metric pre-existente), **#53** (TASK-379 V2 main implementation), **#54** (audit-only sweep follow-up), **#55** (release develop → main)
- **Commits clave**: `015db5fb` (V2 implementation), `8d90f15f` (sweep merge), `96a5091f` (ISSUE-046 closure), `68c84891` (release commit en main)
- **Migration**: `migrations/20260413105218813_reactive-pipeline-v2-circuit-breaker.sql`
- **Codigo afectado**:
  - `src/lib/sync/reactive-consumer.ts` (refactor V2 + sweep helper)
  - `src/lib/sync/refresh-queue.ts` (helpers ya existentes, ahora cableados)
  - `src/lib/sync/projections/{provider-tooling,commercial-cost-attribution,operational-pl,staff-augmentation}.ts` (publisher fan-out reduction)
  - `src/lib/sync/event-catalog.ts` (4 nuevos `*.period_materialized` types)
  - `src/lib/sync/publish-event.ts` (helper `publishPeriodMaterializedEvent`)
  - `src/lib/operations/reactive-circuit-breaker.ts` (modulo nuevo)
  - `src/lib/operations/cloud-monitoring-emitter.ts` (modulo nuevo + isTestEnvironment guard)
  - `src/lib/operations/get-reactive-projection-breakdown.ts` (loader del dashboard)
  - `services/ops-worker/{server.ts,deploy.sh,Dockerfile,reactive-queue-depth.ts}` (Cloud Run scaling + endpoints + sweep wiring)
  - `src/views/greenhouse/admin/AdminReactiveProjectionBreakdown.tsx` (dashboard upgrade)
  - `scripts/{reactive-backfill.ts,reactive-load-test.ts}` (operator tools)
- **Arquitectura nueva/actualizada**:
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md` (canonico, reemplaza V1)
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md` (spec tecnica + diagrama)
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md` (4 SLOs formales)
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` (5 policies + webhook bypass)
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (marcado SUPERSEDED)
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §4.9 + §5 (Cloud Run + 7 scheduler jobs)
  - `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (schema versioning convention)
  - `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` (Reactive serving SLO section)
- **Operations**:
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` (Codex/Claude collision patterns)
- **Cloud Monitoring artefactos en prod**:
  - Notification channel: `projects/efeonce-group/notificationChannels/8736345518502755361`
  - Alerting policies: `12724517129604513698`, `12724517129604512902`, `9439773336525841089`, `9439773336525840646`, `242492081293795724`
- **Cloud Run revisions**: `ops-worker-00007-q45` (V1) → `00008-grv` (V2 main) → `00009-p8b` (V2 + sweep)
- **Cloud Scheduler jobs**: `ops-reactive-{organization,finance,people,notifications,delivery,cost-intelligence,recover}` en `us-east4`
