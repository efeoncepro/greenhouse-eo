# GREENHOUSE REACTIVE PROJECTIONS SLO V1

> **Status:** Canonical
> **Owner:** Platform / Ops
> **Version:** 1.0
> **Created:** 2026-04-13 (TASK-379 Slice 4)
> **Related specs:**
> - `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md`
> - `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (a ser reemplazado por V2)
> - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

## Proposito

Este documento define los **4 SLOs formales** del pipeline reactivo V2 de Greenhouse. Los SLOs describen el contrato de disponibilidad y calidad que la plataforma compromete a sus consumidores internos (modulos de payroll, finance, delivery, etc.) y establecen los error budgets que gobiernan las decisiones operativas.

Los SLOs estan alineados con las metricas custom emitidas por el consumer V2 y con las alerting policies documentadas en `GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md`.

## Modelo SRE aplicado

- **SLI (Service Level Indicator):** una metrica cuantitativa observable.
- **SLO (Service Level Objective):** el umbral que el SLI debe mantener durante una ventana de medicion.
- **Error budget:** `100% - SLO%` — el margen de fallo tolerado antes de detener despliegues y entrar en modo remediacion.

Ventana estandar de medicion: **7 dias rolling** salvo que el SLO especifique lo contrario. Ventanas mas cortas se usan para alerting y escalamiento (ver ALERTING_V1).

---

## SLO 1 — Latencia de procesamiento

### Definicion (en espanol simple)

**El 99% de los eventos reactivos deben procesarse en 5 minutos o menos desde que fueron publicados al outbox, medido sobre una ventana rolling de 7 dias.**

### SLI

Tiempo transcurrido entre `outbox_events.occurred_at` y el `outbox_reactive_log.reacted_at` del primer handler que lo proceso con exito (`result` que empieza con `coalesced:`).

### Fuente de medicion

Query canonica (Postgres):

```sql
WITH handler_lag AS (
  SELECT
    e.event_id,
    e.occurred_at,
    r.reacted_at,
    EXTRACT(EPOCH FROM (r.reacted_at - e.occurred_at)) AS lag_seconds
  FROM greenhouse_sync.outbox_events e
  JOIN greenhouse_sync.outbox_reactive_log r USING (event_id)
  WHERE r.result LIKE 'coalesced:%'
    AND r.reacted_at > NOW() - INTERVAL '7 days'
)
SELECT
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE lag_seconds <= 300) AS within_slo,
  ROUND(100.0 * COUNT(*) FILTER (WHERE lag_seconds <= 300) / NULLIF(COUNT(*), 0), 3) AS slo_percent,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY lag_seconds) AS p99_lag_seconds
FROM handler_lag;
```

En Cloud Monitoring, la metrica `custom.googleapis.com/greenhouse/reactive/lag_seconds_p95` aproxima el SLI en tiempo casi real (sampling por-proyeccion por run, agregado via Monitoring aggregation).

### Objetivo

`slo_percent >= 99.0%` sobre 7 dias rolling.

### Error budget

- **Total:** 1% de eventos = hasta `0.01 * N` eventos fuera de SLO por semana
- **Burn rate critico:** si en 1 hora se consume > 5% del budget semanal → pager

### Alerting

Monitoreado por **Policy 3** (`reactive_lag_p95_warning`) en `ALERTING_V1.md`. El threshold operativo (15 minutos) es deliberadamente mas permisivo que el SLO (5 minutos) para dar espacio al ops-worker a drenar spikes antes de escalar.

### Accion cuando se rompe

1. Revisar `/admin/ops-health` y identificar la proyeccion con mas lag.
2. Verificar si el backlog total esta creciendo (Policy 1/2).
3. Si es un hotspot puntual, evaluar coalescing mas agresivo o rate limiting del publisher.
4. Si es sistemico, escalar `max-instances` del Cloud Run ops-worker y documentar en `changelog.md`.

---

## SLO 2 — Completitud

### Definicion

**El 99.9% de los eventos reactivos publicados al outbox deben ser procesados exitosamente dentro del ciclo de vida del evento, incluyendo reintentos automaticos. Los dead-letters resueltos manualmente no cuentan contra el SLO.**

### SLI

Porcentaje de eventos en `outbox_events` (con `status = 'published'`) que tienen al menos una entrada en `outbox_reactive_log` con `result` empezando por `coalesced:` o `no-op:` dentro de las 24 horas posteriores a `occurred_at`.

### Fuente de medicion

Query canonica:

```sql
WITH event_eligibility AS (
  SELECT e.event_id, e.occurred_at
  FROM greenhouse_sync.outbox_events e
  WHERE e.status = 'published'
    AND e.occurred_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '24 hours'
),
processed_events AS (
  SELECT DISTINCT ee.event_id
  FROM event_eligibility ee
  JOIN greenhouse_sync.outbox_reactive_log r
    ON r.event_id = ee.event_id
   AND (r.result LIKE 'coalesced:%' OR r.result LIKE 'no-op:%')
   AND r.reacted_at <= ee.occurred_at + INTERVAL '24 hours'
)
SELECT
  (SELECT COUNT(*) FROM event_eligibility) AS total_eligible,
  (SELECT COUNT(*) FROM processed_events) AS successfully_processed,
  ROUND(100.0 * (SELECT COUNT(*) FROM processed_events) / NULLIF((SELECT COUNT(*) FROM event_eligibility), 0), 4) AS slo_percent;
```

Nota: se excluyen eventos publicados en las ultimas 24 horas para dar tiempo al sistema de procesarlos dentro del periodo permitido (evita contar eventos "en vuelo" como fallos).

### Objetivo

`slo_percent >= 99.9%` sobre 7 dias rolling.

### Error budget

- **Total:** 0.1% de eventos = hasta `0.001 * N` eventos sin procesar por semana
- Dead-letters resueltos manualmente (mass-ack con auditoria en `changelog.md`) no cuentan contra el budget.

### Alerting

Monitoreado indirectamente por:
- **Policy 4** (`reactive_circuit_open_warning`) — un breaker en open por mas de 1 hora indica que una proyeccion esta fallando sistematicamente, poniendo en riesgo la completitud
- **Policy 5** (`reactive_dead_letter_warning`) — cualquier dead-letter visible senala que el event lifecycle no se cerro correctamente

### Accion cuando se rompe

1. Identificar los `event_id` faltantes con la query inversa (eventos elegibles sin `processed_events`).
2. Agruparlos por `event_type` y `projection_name` para detectar patrones.
3. Si son fallos transitorios, re-ejecutar `POST /reactive/recover` para drenar la cola de refresh.
4. Si son dead-letters legitimos, abrir ISSUE-### con detalles, fix, replay, y documentar.

---

## SLO 3 — Higiene de dead-letter

### Definicion

**0 eventos deben permanecer en estado `dead-letter` por mas de 24 horas sin resolucion.**

### SLI

Cantidad maxima de eventos con `outbox_reactive_log.result = 'dead-letter'` cuyo `reacted_at` es mas antiguo que `NOW() - INTERVAL '24 hours'`.

### Fuente de medicion

Query canonica:

```sql
SELECT
  COUNT(*) AS unresolved_dead_letters,
  MIN(reacted_at) AS oldest_unresolved,
  ARRAY_AGG(DISTINCT SPLIT_PART(handler, ':', 1)) AS affected_projections
FROM greenhouse_sync.outbox_reactive_log
WHERE result = 'dead-letter'
  AND reacted_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1
    FROM greenhouse_sync.outbox_reactive_log r2
    WHERE r2.event_id = outbox_reactive_log.event_id
      AND r2.handler = outbox_reactive_log.handler
      AND r2.result LIKE 'coalesced:%'
      AND r2.reacted_at > outbox_reactive_log.reacted_at
  );
```

La subquery con `NOT EXISTS` excluye eventos que fueron resueltos posteriormente via replay.

### Objetivo

`unresolved_dead_letters = 0` en todo momento.

### Error budget

Cero. No hay budget — cualquier dead-letter no resuelto por mas de 24 horas activa remediacion inmediata.

### Alerting

Monitoreado por **Policy 5** (`reactive_dead_letter_warning`) en `ALERTING_V1.md`.

### Accion cuando se rompe

1. Ejecutar la query SLI para identificar los eventos exactos.
2. Para cada proyeccion afectada, decidir:
   - **Fix + replay:** si es un bug conocido, aplicar fix, redesplegar, y ejecutar replay controlado del event_id.
   - **Mass-ack con auditoria:** si los eventos son obsoletos (tipo de evento ya no existe, proyeccion deprecada, etc.), crear un registro en `changelog.md` y ejecutar `UPDATE outbox_reactive_log SET result = 'skipped:legacy' WHERE event_id IN (...)`.
3. Abrir ISSUE-### documentando causa raiz y prevencion futura.

---

## SLO 4 — Tiempo de recuperacion (Recovery Time Objective)

### Definicion

**El tiempo necesario para drenar un backlog de 5000 eventos reactivos debe ser menor a 30 minutos.**

### SLI

Tiempo transcurrido entre el momento en que `reactive/backlog_depth` cruza por primera vez 5000 y el momento en que vuelve a cruzar 100 hacia abajo.

### Fuente de medicion

No se mide continuamente — se valida via **load test sintetico** reproducible:

```bash
# Paso 1: publicar 5000 eventos sinteticos (cuando exista)
pnpm reactive:load-test --events 5000 --type synthetic.load_test

# Paso 2: medir el tiempo de drenado desde Cloud Monitoring
gcloud monitoring time-series list \
  --filter='metric.type="custom.googleapis.com/greenhouse/reactive/backlog_depth"' \
  --interval=1h \
  --format='value(points.value.doubleValue, points.interval.endTime)'

# Paso 3: validar drain_time < 30 minutos
```

### Objetivo

`drain_time < 1800 segundos` (30 minutos) bajo la configuracion canonica del ops-worker (`max-instances=5`, `concurrency=4`).

### Error budget

- Si el drain time supera 30 minutos bajo el load test oficial → el ops-worker necesita re-tuning antes de cerrar la task TASK-379
- Si supera 45 minutos → bloquea el release de V2 hasta remediacion

### Alerting

No hay alerting continuo en produccion — este SLO se valida en el load test pre-release y se re-valida cada 3 meses (o despues de cualquier cambio mayor en el ops-worker).

Durante operaciones normales, el proxy de alerting es **Policy 2** (`reactive_backlog_total_critical`): si el backlog cruza 2000 en produccion, el RTO de 30 minutos para 5000 eventos ya no se cumpliria.

### Accion cuando se rompe

1. Documentar los resultados del load test en `Handoff.md` y `changelog.md`.
2. Escalar `max-instances` del ops-worker o incrementar `REACTIVE_BATCH_SIZE`.
3. Re-ejecutar el load test para validar el fix.
4. Si no es posible alcanzar RTO con configuracion economicamente viable, abrir discusion sobre migracion a Pub/Sub event bus.

---

## Ventanas de medicion

| SLO | Ventana | Cadencia de reporte |
| --- | --- | --- |
| SLO 1 — Latencia | 7 dias rolling | Dashboard + snapshot semanal en `/admin/ops-health` |
| SLO 2 — Completitud | 7 dias rolling | Dashboard + snapshot semanal |
| SLO 3 — Dead-letter | Continuo | Alerta en tiempo real (Policy 5) |
| SLO 4 — RTO | Load test reproducible | Pre-release + revision trimestral |

## Governance

- Cualquier cambio en los SLOs (subir o bajar umbrales) requiere update de este documento + bump de version.
- Los SLOs se revisan en cada retrospectiva de ops (cadencia: mensual).
- Los error budgets consumidos se documentan en `changelog.md` de cada release.
- Si un SLO se rompe en 2 semanas consecutivas, se escala a discusion arquitectonica y se bloquean features nuevos hasta remediar.

## Referencias

- `src/lib/operations/cloud-monitoring-emitter.ts` — fuente de los metrics custom
- `src/lib/sync/reactive-consumer.ts` — fuente de los eventos procesados
- `src/lib/operations/reactive-backlog.ts` — lectura del backlog para el dashboard
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ALERTING_V1.md` — alerting wiring
- SRE Workbook de Google: https://sre.google/workbook/implementing-slos/
