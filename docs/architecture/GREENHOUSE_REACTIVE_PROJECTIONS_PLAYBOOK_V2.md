# Greenhouse Reactive Projections Playbook V2

> **Tipo de documento:** Playbook canonico de arquitectura
> **Version:** 2.0
> **Fecha:** 2026-04-13
> **Status:** active
> **Spec compliance:** TASK-379
> **Reemplaza a:** [GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](./GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md) (archivada)
> **Arquitectura tecnica:** [GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md](./GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md)

## Por que existe V2

V1 del pipeline reactivo funcionaba bien a baja carga pero revelo tres defectos estructurales cuando el backlog real crecio mas alla de algunas decenas de eventos:

1. **Silent skip**: cuando el consumer encontraba un evento cuyo `extractScope()` devolvia `null` o que no tenia handler registrado, simplemente lo saltaba (`continue`) sin marcarlo en `outbox_reactive_log`. El worker volvia a fetchar los mismos eventos indefinidamente sin progresar. Esto es la causa raiz de [ISSUE-046](../issues/open/ISSUE-046-reactive-pipeline-silent-skip-backlog.md), donde 5040 eventos `provider.tooling_snapshot.materialized` se acumularon porque `staff_augmentation_placements.lastReactedAt` quedo en `null` en perpetuidad.
2. **Fan-out explosion**: proyecciones como `provider_tooling.refresh()` publicaban N eventos por periodo (uno por snapshot/entidad materializada). Cada evento disparaba una re-materializacion completa del periodo en las proyecciones downstream, multiplicando trabajo redundante por N.
3. **Iteracion evento por evento sin coalescer**: aun cuando el consumer lograba avanzar, procesaba 500 eventos al mismo scope como 500 invocaciones de `refresh()` en lugar de 1.

V2 arregla los tres problemas a nivel de consumer y publisher sin tocar el transporte (Postgres + Cloud Run) y sin cambios incompatibles en el contrato de las proyecciones existentes.

## El contrato de una proyeccion

Una proyeccion se registra en `src/lib/sync/projection-registry.ts` como un `ProjectionDefinition`:

```typescript
export interface ProjectionDefinition {
  /** Nombre unico. Usado en logs, metricas y dedup del refresh queue. */
  name: string
  /** Descripcion humana. */
  description: string
  /** Dominio de particionado. Filtra cual cron job de Cloud Scheduler la activa. */
  domain: 'organization' | 'people' | 'finance' | 'notifications' | 'delivery' | 'cost_intelligence'
  /** Event types del outbox que disparan un refresh. */
  triggerEvents: string[]
  /**
   * Extrae el scope operativo del payload. Devolver `null` significa "este evento
   * no aplica a mi" — V2 lo acepta y lo acknowledgea como `no-op:no-scope`.
   * Nunca mas queda sin marcar.
   */
  extractScope: (payload: Record<string, unknown>) => { entityType: string; entityId: string } | null
  /**
   * Refresh idempotente. Debe ser seguro llamarlo N veces con el mismo scope.
   * Puede lanzar excepciones — el consumer V2 gestiona retries y dead-letters.
   * Retornar un string descriptivo (va al log y a `coalesced:<description>`)
   * o `null` cuando no hay nada que hacer.
   */
  refresh: (
    scope: { entityType: string; entityId: string },
    payload: Record<string, unknown>
  ) => Promise<string | null>
  /** Max retries antes de dead-letter. Default 2. */
  maxRetries?: number
}
```

**Contratos obligatorios que V2 refuerza:**

- `refresh()` **debe** ser idempotente. Dos instancias del worker pueden correr el mismo scope concurrentemente sin corromper estado.
- `extractScope()` **debe** ser puro. Si lanza excepcion, V2 marca el evento como `no-op:extract-scope-error` y sigue avanzando (no bloquea la cola).
- El payload recibido por `refresh()` es el del evento mas reciente del grupo coalescido. Las proyecciones v2-aware deben refetchar el estado materializado desde la fuente de verdad en vez de leer detalle del payload.

## El flujo del consumer V2

Archivo: `src/lib/sync/reactive-consumer.ts`.

```
┌──────────────────────────────────────────────────────────────┐
│ processReactiveEvents({ batchSize, domain })                  │
└──────────────────────────────────────────────────────────────┘
  │
  │ Phase A — Fetch
  │   SELECT ... FROM outbox_events
  │    WHERE status = 'published' AND event_type = ANY(trigger_types)
  │      AND NOT EXISTS (log entry for any (event_id, handler))
  │    ORDER BY occurred_at ASC LIMIT batchSize
  │
  │ Phase B — Categorize
  │   Para cada evento:
  │     - payload malformado → noOpAcks('no-op:malformed-payload')
  │     - sin handler        → noOpAcks('no-op:no-handler')
  │     - extractScope throw → noOpAcks('no-op:extract-scope-error')
  │     - scope null         → noOpAcks('no-op:no-scope')
  │     - scope valido       → scopeGroups.set(key, group)
  │   bulkAcknowledgeEvents(noOpAcks)   ← silent-skip killed here
  │
  │ Phase C — Execute por grupo
  │   Para cada scopeGroup:
  │     - evaluateCircuit(projection) → si open: skip (re-fetch proximo run)
  │     - enqueueRefresh(...)
  │     - refresh(scope, latestPayload)      ← 1 sola llamada por grupo
  │     - exito:
  │         bulkAcknowledgeEvents(group.events, 'coalesced:<desc>')
  │         markRefreshCompleted(queueId)
  │         recordCircuitSuccess(name)
  │     - fallo:
  │         markRefreshFailed(queueId, error)
  │         per-event retry tracking → 'retry' o 'dead-letter'
  │         recordCircuitFailure(name, error)
  │
  └──> { runId, eventsFetched, eventsAcknowledged, scopesCoalesced,
        projectionsTriggered, scopeGroupsFailed, scopeGroupsBreakerSkipped,
        perProjection: { [name]: { successes, failures, ... } },
        durationMs }
```

### Diferencias clave vs V1

| Aspecto | V1 | V2 |
|---------|----|----|
| Iteracion | Por evento en el outbox | Por `(projection, scope)` coalescido |
| Silent skip | `if (!scope) continue` → evento queda sin marcar | Marcado como `no-op:no-scope` en bulk acknowledgement |
| Fan-out | N eventos × N consumers → explosion | 1 evento `period_materialized` → 1 refresh por scope |
| Acknowledgement | 1 INSERT por evento | 1 INSERT multi-row por grupo (hasta 10k filas) |
| Circuit breaker | No existia | Estado persistido en `projection_circuit_state` |
| Retries | Contador per-handler en `outbox_reactive_log` | Igual — preservado por compatibilidad |

## Schema versioning

**Convencion nueva introducida por TASK-379 y documentada en V2:**

- `schemaVersion: 2` → payloads period-level. Una sola publicacion por corrida de materializacion, payload `{ periodId, snapshotCount, _materializedAt, ...contexto }`. Los consumers deben refetchar detalle desde la tabla materializada.
- Sin `schemaVersion` (v1 legacy) → payloads entity-level. Cada entidad emite su propio evento. Los consumers v1-aware leen todo el detalle del payload.

Durante el rollout, los consumers v2-aware aceptan ambas versiones. V2 del consumer NO discrimina por `schemaVersion` — eso es responsabilidad de `extractScope` y de `refresh` en cada proyeccion.

Helper canonico para publicar v2: `publishPeriodMaterializedEvent()` en `src/lib/sync/publish-event.ts`. Nunca construir payloads v2 a mano — pasar por el helper garantiza el envelope consistente.

## Multi-instance safety

V2 **no** implementa locking estricto a nivel de `outbox_events` — esa tabla sigue siendo append-only y no tiene columnas `claimed_by/claimed_at`. La seguridad multi-instance viene de tres invariantes:

1. **Idempotencia en `outbox_reactive_log`**: `INSERT ... ON CONFLICT (event_id, handler) DO UPDATE` colapsa duplicados. Dos workers que procesen el mismo evento no corrompen nada; el segundo gana el `reacted_at` y ambos avanzan.
2. **Idempotencia en `refresh()`**: contrato obligatorio de cada proyeccion. Re-materializar `staff_augmentation_placements` para el mismo periodo dos veces produce el mismo resultado.
3. **`FOR UPDATE SKIP LOCKED` en `projection_refresh_queue`**: el queue persistente ya usa SKIP LOCKED en `dequeueRefreshBatch()` y `claimOrphanedRefreshItems()` (`src/lib/sync/refresh-queue.ts`). El queue es el unico lugar donde multiples workers compiten por un scope y ahi ya hay locking atomico.

**Cuando escalar a V3 con locking en outbox:** si la redundancia (2 workers procesando el mismo scope) se vuelve el cuello de botella por costo de compute, la proxima evolucion introduce columnas `claimed_by/claimed_at` en `outbox_events` y usa SKIP LOCKED en Phase A. No es necesario hasta que el trafico real justifique el costo del cambio — V2 ya tolera 2-5 instancias en paralelo sin corromper estado.

## Observabilidad

- **Endpoint de salud**: `GET /api/internal/projections` — stats por proyeccion en 24h, estado del queue, health boolean, circuit breaker state.
- **Endpoint de profundidad del queue**: `GET /reactive/queue-depth?domain=<x>` en el ops-worker — usado por alerting Slack/PagerDuty.
- **Logs estructurados**: cada run del consumer emite un objeto JSON con `{ runId, instanceId, eventsFetched, scopesCoalesced, projectionsTriggered, durationMs, perProjection }` parseable por Cloud Logging.
- **Dashboard operativo**: `src/views/greenhouse/admin/ops-health/*` — drill-down por proyeccion, lag historico, estado del circuit breaker.
- **Metricas custom en Cloud Monitoring**: ver Slice 4 de TASK-379 y [GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1](./GREENHOUSE_REACTIVE_PROJECTIONS_SLO_V1.md) (pendiente de creacion cuando Slice 4 se cierre).

## Runbook operativo

### Como verificar que el worker esta sano

1. `gcloud run services describe ops-worker --region us-east4` → revisar revision activa y config (`max=5 concurrency=4 cpu=2 mem=2Gi timeout=540`).
2. `gcloud scheduler jobs describe ops-reactive-finance --location us-central1` → ultima ejecucion y status.
3. `curl -s -H "x-vercel-protection-bypass: ..." .../api/internal/projections | jq '.health'` → health boolean + per-projection summary.
4. `curl -s -H "x-vercel-protection-bypass: ..." .../api/internal/projections | jq '.projections[] | select(.deadLetters > 0)'` → proyecciones con dead-letters sin resolver.

### Como drenar un backlog grande

1. Verificar la salud del worker (paso anterior).
2. Dry-run del script para confirmar que V2 procesa el backlog correctamente:
   ```bash
   pnpm reactive:backfill --dry-run
   ```
3. Si el dry-run luce bien, drenar:
   ```bash
   pnpm reactive:backfill                   # drain completo
   pnpm reactive:backfill --domain=finance  # un dominio a la vez (mas predecible)
   ```
4. Monitorear `/api/internal/projections` mientras corre — el contador de pending en el queue debe bajar.

El script vive en `scripts/reactive-backfill.ts`. Corre contra el Cloud SQL Proxy local en puerto 15432 (mismas credenciales que `pnpm migrate:up`).

### Una proyeccion esta en dead-letter — que hago

1. Identificar los eventos muertos:
   ```sql
   SELECT event_id, handler, last_error, retries, reacted_at
     FROM greenhouse_sync.outbox_reactive_log
    WHERE result = 'dead-letter'
      AND handler LIKE '<projection_name>:%'
    ORDER BY reacted_at DESC;
   ```
2. Investigar la causa raiz. Leer el payload original en `outbox_events` por `event_id` y reproducir el error localmente.
3. Arreglar el bug en la proyeccion o en los datos upstream.
4. Replay manual via re-enqueue:
   ```typescript
   await enqueueRefresh({
     projectionName: '<name>',
     entityType: '...',
     entityId: '...',
     triggeredByEventId: '<event_id>'
   })
   ```
   y dejar que el proximo run del consumer lo recoja. O cerrar directo con un `UPDATE outbox_reactive_log SET result = 'resolved-manual' WHERE ...` si el replay no aplica.

### Como agregar una proyeccion nueva

1. Crear `src/lib/sync/projections/mi-proyeccion.ts` exportando un `ProjectionDefinition`.
2. Registrar en `src/lib/sync/projections/index.ts` via `registerProjection(miProyeccion)`.
3. Declarar `domain`, `triggerEvents`, `extractScope`, `refresh`, `maxRetries`.
4. Hacer la proyeccion idempotente — probarla corriendo 2 veces con el mismo scope y verificar el estado resultante.
5. Deploy. No hay que tocar el consumer ni los cron jobs — el registry es leido al bootstrap y el scheduler del dominio correspondiente la recoge en el siguiente tick.

## Migracion desde V1

**Cambios backward-compatible:**

- Los payloads v1 legacy (sin `schemaVersion`) siguen siendo procesados por el consumer V2 sin cambios.
- Las proyecciones v1 siguen funcionando sin modificaciones — el consumer respeta el contrato original.
- El endpoint `/api/cron/outbox-react-*` (fallback manual via Vercel) sigue disponible para troubleshooting.

**Deprecado en V2:**

- El "silent skip" path. Cualquier proyeccion que dependa de que `extractScope: () => null` deje eventos sin marcar debe revisarse — V2 los acknowledgea como `no-op:no-scope` y no vuelven a fetchearse.
- Publicar 1 evento por entidad en publishers period-level. Migrar a `publishPeriodMaterializedEvent()` durante el rollout.

**Cleanup post-rollout** (follow-up task, no bloquea V2):

- Eliminar codigo legacy de `provider_tooling`, `commercial_cost_attribution`, `operational_pl` que todavia publica por entidad cuando la feature flag este 100% rollout.
- Archivar V1 del playbook en `docs/architecture/_archive/`.

## Referencias

- **TASK canonica:** [TASK-379 — Reactive Projections Enterprise Hardening](../tasks/in-progress/TASK-379-reactive-projections-enterprise-hardening.md)
- **Issue que detona V2:** [ISSUE-046 — Silent-skip backlog](../issues/open/ISSUE-046-reactive-pipeline-silent-skip-backlog.md)
- **Arquitectura tecnica:** [GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md](./GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md)
- **Playbook V1 archivado:** [GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md](./GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md)
- **Event catalog:** [GREENHOUSE_EVENT_CATALOG_V1.md](./GREENHOUSE_EVENT_CATALOG_V1.md)
- **Cloud infrastructure:** [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](./GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) §4.9 y §5
- **Database tooling:** [GREENHOUSE_DATABASE_TOOLING_V1.md](./GREENHOUSE_DATABASE_TOOLING_V1.md)
- **Codigo:**
  - Consumer V2: `src/lib/sync/reactive-consumer.ts`
  - Circuit breaker: `src/lib/operations/reactive-circuit-breaker.ts`
  - Refresh queue: `src/lib/sync/refresh-queue.ts`
  - Publisher helper: `src/lib/sync/publish-event.ts`
  - Projections: `src/lib/sync/projections/*.ts`
  - Registry: `src/lib/sync/projection-registry.ts`
  - Ops worker: `services/ops-worker/server.ts`
  - Migration del circuit breaker: `migrations/20260413105218813_reactive-pipeline-v2-circuit-breaker.sql`
  - Backfill script: `scripts/reactive-backfill.ts`
  - Load test script: `scripts/reactive-load-test.ts`
