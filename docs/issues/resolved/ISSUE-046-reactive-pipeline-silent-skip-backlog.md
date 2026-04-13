# ISSUE-046 — Reactive pipeline silent-skip backlog (~11k eventos)

> **Tipo:** Incidente operativo
> **Detectado:** 2026-04-13 durante smoke post-deploy + Slice 0 de TASK-379
> **Estado:** Resuelto — 2026-04-13 (mismo dia)
> **Severidad:** P0 (datos materializados stale en multiples superficies)
> **Ambiente:** Compartido (Cloud SQL `greenhouse-pg-dev` es single-instance dev+prod)
> **Resolucion:** TASK-379 implementacion completa (slices 0-5) + PR #54 audit-only sweep follow-up. Ver seccion `Resolucion` mas abajo.

## Sintoma observable

El metric `Ops Health > Reactive backlog` reporta `degraded` con `totalUnreacted = 5446`. Despues del fix de PR #50 que filtra eventos sin handler, el backlog visible se "limpio" pero el numero real es mayor (~11k eventos).

## Impacto

Modulos donde la frescura de datos depende del reactive pipeline ven snapshots stale desde el 2026-04-05:

- `serving_provider_tooling_snapshots` (provider/finance/AI tooling)
- `serving_staff_aug_placement_snapshots` (agency staff augmentation)
- `serving_commercial_cost_attribution` (executive cost intelligence)
- `serving_operational_pl` (finance P&L)
- `serving_account_balances` (treasury — parcialmente)
- Cualquier dashboard que consume estas tablas

## Diagnostico (Slice 0 de TASK-379)

### Worker esta vivo y corriendo

Cloud Run logs muestran ejecucion cada 5 min:

```
[ops-worker] POST /reactive/process — runId=...
[ops-worker] /reactive/process done — 50 processed, 0 failed, 0 projections, 700ms
```

`source_sync_runs` confirma 5205 runs `succeeded` desde 2026-04-05 hasta ahora.

### Pero 0 projections triggered

A pesar de procesar 50 eventos por run, **0 projections devuelven actionDescription no-null**. Esto significa que para los 50 eventos que entran al loop principal del consumer, las llamadas a `projection.refresh()` o bien (a) nunca ocurren porque `extractScope()` retorna null y se skip silenciosamente sin marcar nada en `outbox_reactive_log`, o bien (b) ocurren pero retornan null sin que se cree entry.

### Backlog real

Top event types sin entry en `outbox_reactive_log`:

| Event type | Cantidad | Tiene consumer? |
|---|---|---|
| `provider.tooling_snapshot.materialized` | 5040 | Si — `staff_augmentation_placements` |
| `finance.income.nubox_synced` | 1722 | No (audit-only, no en `getAllTriggerEventTypes()`) |
| `finance.expense.nubox_synced` | 1712 | No (audit-only) |
| `accounting.pl_snapshot.materialized` | 763 | No (audit-only) |
| `staff_aug.placement_snapshot.materialized` | 620 | No (audit-only) |
| `accounting.commercial_cost_attribution.materialized` | 296 | Si — `staff_augmentation_placements`, `operational_pl` |
| `finance.quote.synced` | 287 | No |
| `payroll.projected_period.refreshed` | 259 | No (audit-only documentado en Event Catalog V1) |
| `finance.quote_line_item.synced` | 236 | No |
| `finance.product.synced` | 216 | No |

**Backlog real con consumers activos: ~5400 eventos** (mayormente provider.tooling_snapshot.materialized).

### Comparacion payloads (backlog vs procesados)

Los payloads entre eventos del 2 abril (procesados) y 5 abril (backlog) son **estructuralmente identicos**. La unica diferencia es el periodId (2026-03 vs 2026-04). Esto descarta un cambio de schema breaking entre ambas fechas.

### `staff_augmentation_placements` history

La projection SI proceso eventos historicamente: 20 entries distintas en `outbox_reactive_log` con resultados como `materialized staff augmentation placement snapshots: 1 placements for 2026-03 via provider.tooling_snapshot.materialized | 300`. **Last reacted: 2026-04-05 19:48:57**. Despues de esa fecha no hay nuevos entries para esta projection.

### Cloud Run baseline

```yaml
maxScale: 2
containerConcurrency: 1
cpu: 1
memory: 1Gi
timeoutSeconds: 300
```

3 Cloud Scheduler jobs activos:
- `ops-reactive-process` (`*/5`, todos los dominios) — succeeds pero 0 projections
- `ops-reactive-process-delivery` (`2-59/5`, solo delivery) — succeeds y procesa daily ICO events
- `ops-reactive-recover` (`*/15`) — succeeds pero el queue ya esta drenado

### IAM SA `greenhouse-portal@efeonce-group`

- `roles/aiplatform.user`
- `roles/bigquery.dataViewer`
- `roles/bigquery.jobUser`
- `roles/cloudsql.client`
- `roles/run.invoker` (a nivel del servicio ops-worker)
- **FALTA**: `roles/monitoring.metricWriter` (necesario para Slice 4 de TASK-379)

### refresh_queue state

Solo 75 entries totales en `projection_refresh_queue`:
- 74 `completed` (ultima actividad 2026-04-12 10:22)
- 1 `failed` (2026-04-05 20:30)

El consumer **no esta usando `refresh_queue` para drenar** — solo lo usa para enqueue y mark completed. La logica de claim via `dequeueRefreshBatch()` (que ya tiene SKIP LOCKED) **no se invoca**.

## Causa raiz (hipotesis confirmada)

El consumer `processReactiveEvents` itera el outbox via offset/limit con `ORDER BY occurred_at ASC`. Esto lo hace susceptible a:

1. **Silent skip path no marcado**: cuando un projection devuelve `null` desde `extractScope()`, el consumer hace `continue` sin escribir nada en `outbox_reactive_log`. Esto significa que el evento queda "actionable" forever desde la perspectiva del consumer, y se re-fetcha en cada run.

2. **Bucle de los mismos 50 eventos**: si los primeros 50 eventos actionable de la cola caen en el silent skip path, el consumer los fetch, los "procesa" (silent skip), no marca nada, y en el proximo run fetch los mismos 50.

3. **Sin scope coalescing**: aunque el sistema tiene `refresh_queue` con dedup por `(projection, entity_type, entity_id)`, el consumer no la usa. Procesa cada evento individualmente.

## Solucion

**TASK-379 enterprise hardening** lo resuelve desde la raiz:

- Slice 1 — Consumer V2: drena desde `refresh_queue` (no del outbox), scope-level coalescing (500 eventos del mismo periodo = 1 refresh), elimina el silent skip path (todo evento procesado obtiene entry en log con `result='processed'`, `'no-op'`, `'skipped'`, o `'dead-letter'`).
- Slice 2 — Publisher fan-out reduction: `provider_tooling.refresh()` publica 1 evento por periodo, no N por snapshot. Reduce el ritmo de generacion del backlog.
- Slice 3 — Cloud Run scaling: `min=0/max=5/concurrency=4/timeout=540` para drenar backlogs grandes mas rapido.
- Slice 4 — Cloud Monitoring metrics + alerting: backlog > 500 alerta Slack, backlog > 2000 PagerDuty.
- Slice 5 — Backfill controlado del backlog historico + load test sintetico.

## Acciones inmediatas (mitigacion antes del fix completo)

Ninguna manual recomendada — el fix de TASK-379 esta en progreso y es el plan correcto. NO mass-ack manual del backlog: con Slice 1 desplegado, el consumer V2 limpia el backlog por construccion via scope coalescing.

## Resolucion (2026-04-13)

TASK-379 implementacion completa (slices 0-5, PR #53) + audit-only sweep follow-up (PR #54) resuelven el incidente el mismo dia que se detecto.

### Que se hizo

1. **Consumer V2 (PR #53 Slice 1)**: refactor de `processReactiveEvents` con scope-level coalescing, eliminacion del silent-skip path (todo evento fetcheado obtiene entry en `outbox_reactive_log`), circuit breaker por projection, bulk acknowledgement. Migration nueva: `projection_circuit_state` table.
2. **Publisher fan-out reduction (PR #53 Slice 2)**: 4 projections (`provider_tooling`, `commercial_cost_attribution`, `operational_pl`, `staff_augmentation_placements`) ahora publican 1 evento por periodo en lugar de N por entidad. Schema versioning v1/v2 coexisten.
3. **Cloud Run scaling (PR #53 Slice 3)**: ops-worker pasa de `max=2 concurrency=1` a `max=5 concurrency=4 cpu=2 mem=2Gi timeout=540`. 7 Cloud Scheduler jobs por dominio reemplazan los 3 anteriores. Nuevo endpoint `GET /reactive/queue-depth?domain=<x>`.
4. **Observability + SLO (PR #53 Slice 4)**: 5 custom metrics emitidas a Cloud Monitoring desde el consumer V2. Dashboard de Ops Health upgraded con drill-down per-projection + circuit breaker badges. SLO formal documentado en `GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md`.
5. **Backfill + load test + V2 docs (PR #53 Slice 5)**: scripts `pnpm reactive:backfill` y `pnpm reactive:load-test`. Playbook V2 + arquitectura V2 publicados.
6. **Audit-only sweep (PR #54 follow-up)**: nuevo `sweepAuditOnlyEvents()` helper en el consumer + wire-up en `/reactive/recover` para que el cron de 15 min limpie automaticamente eventos cuyo event_type no tiene handler. Entries `no-op:audit-only` preservan audit trail; futura cron de retencion puede borrarlos seguro.
7. **`monitoring.metricWriter` IAM role** otorgado al SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` para que las custom metrics emitan correctamente.

### Verificacion cuantitativa

| Metric | Pre-fix | Post-fix |
|---|---|---|
| Total raw outbox `published` sin log entry | **11,495** | **0** |
| Eventos con consumer real procesados | 0 (loop silencioso) | 5,420 colapsados via coalescing |
| Eventos audit-only marcados `no-op:audit-only` | 0 | 6,071 |
| Eventos rastreables para TASK-377 (`no-op:pending-task-377-consumer`) | n/a | 2 |
| Projections en circuit breaker `closed` | n/a | 14 / 14 |
| Worker logs antes (`50 processed, 0 projections`) | confirmado | reemplazado por `Y processed, N projections` reales |
| Cloud Run revision | `00007-q45` (V1) | `00008-grv` (V2) + redeploy post-PR-#54 |

### Lo que NO se silencio

Los 6071 eventos marcados `no-op:audit-only` corresponden, sin excepcion, a notificaciones post-hoc de trabajo que ya esta en su tabla canonica:

- `*.nubox_synced` (3434): rows en `fin_income/fin_expenses` ya importadas por el sync pipeline.
- `accounting.pl_snapshot.materialized` (763) y `staff_aug.placement_snapshot.materialized` (620): snapshots ya en `serving_*` tables (legacy V1 fan-out).
- `payroll.projected_period.refreshed` (260): explicitamente `AUDIT-ONLY DEPRECATED` en Event Catalog V1.
- `auth.login.*`, `role.*`, `responsibility.*`, `access.*`, `asset.*`, `reporting_hierarchy.*`: audit trail de identity/seguridad por diseno (ver TASK-247).

Los 2 eventos `sister_platform_binding.*` se marcaron como `no-op:pending-task-377-consumer` (handler distinto) para que TASK-377 los pueda recuperar y replayear cuando se implemente el consumer real. TASK-377 actualizado con instrucciones SQL de replay.

### Acciones operativas pendientes (no bloquean cierre)

- [ ] Provisionar las 5 alerting policies de Cloud Monitoring documentadas en `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` — bloqueado por crear Slack notification channel via OAuth en Cloud Console (unica accion que requiere browser, no scriptable).
- [ ] Promover el deploy a `main` (Vercel production) cuando el equipo confirme operacion estable en staging.
- [ ] Implementar TASK-377 (Kortex bridge) y replayear los 2 sister_platform_binding events.
- [ ] Futura cron de retencion que purgue `outbox_events` con entries `no-op:audit-only` > 90 dias.

## Referencias

- Task: `docs/tasks/in-progress/TASK-379-reactive-projections-enterprise-hardening.md` (a mover a `complete/` cuando todas las acciones operativas pendientes esten cerradas)
- PR previo relacionado (filtro de metric): #50
- PRs de fix: **#53** (TASK-379 V2 implementation, merged commit `62f6dfeb`), **#54** (audit-only sweep follow-up, merged commit `8d90f15f`)
- Codigo afectado: `src/lib/sync/reactive-consumer.ts`, `src/lib/sync/refresh-queue.ts`, `src/lib/sync/projections/{provider-tooling,commercial-cost-attribution,operational-pl,staff-augmentation}.ts`, `src/lib/operations/reactive-circuit-breaker.ts`, `src/lib/operations/cloud-monitoring-emitter.ts`, `services/ops-worker/{server.ts,deploy.sh,reactive-queue-depth.ts}`
- Docs nuevos: `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md`
- Migration: `migrations/20260413105218813_reactive-pipeline-v2-circuit-breaker.sql`
