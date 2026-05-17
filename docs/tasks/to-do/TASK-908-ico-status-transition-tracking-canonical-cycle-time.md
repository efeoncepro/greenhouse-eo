# TASK-908 — ICO Status Transition Tracking + Canonical Cycle Time + CT SLO% + status hygiene gaps

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|platform|reliability`
- Blocked by: `none` (Cycle Time decisions canonical ya canonizadas en sesión 2026-05-17)
- Branch: `task/TASK-908-ico-status-transition-tracking-canonical-cycle-time`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Paquete combinado de 5 entregables que comparten la misma capa de **status taxonomy + status transition capture** en el motor ICO: (1) infra nueva para capturar timestamps de transiciones de estado en Notion tasks (hoy NO existe), (2) helper canonical `calculateCycleTime()` con las 4 decisiones canonizadas en sesión 2026-05-17 (inicio = "En curso", fin = `Fecha de completado`, feedback time SÍ cuenta, Bloqueado NO cuenta), (3) nueva métrica canonical `CT SLO%` (% tareas con cycle_time ≤ threshold industria, separada de OTD%), (4) fix B.1 del Delta 2026-05-17 (excluir `Bloqueado`/`Detenido` del denominador de OTD/RpA/FTR), (5) fix B.2 del Delta 2026-05-17 (mapear estados Sky-specific `Tomado`/`Listo para revisión`/`En feedback`/`Aprobado` a CSC canonical). Plus housekeeping: actualizar `Greenhouse_ICO_Engine_v1.md` para reflejar la separación canonical OTD% (promise compliance) vs CT SLO% (competitive benchmark) y resolver drift documental detectado.

## Why This Task Exists

**Cycle Time canonical pendiente de implementación.** En sesión 2026-05-17 se canonizaron 4 decisiones sobre Cycle Time (Delta 2026-05-17 sección C en `Contrato_Metricas_ICO_v1.md`). El código actual (`src/lib/ico-engine/schema.ts:108-113`) usa decisiones implícitas diferentes (createdTime → completed_at, calendar puro sin descontar nada). Cerrar el gap requiere:

- Capturar timestamps de transiciones de estado Notion (`status → En curso`, `status → Bloqueado`, etc.) — hoy NO se capturan, solo tenemos `created_at`, `last_edited_time` (sobreescrito), `completed_at`.
- Cambiar fórmula `cycle_time_days` para usar timestamp de "En curso" como inicio + descontar tiempo en `Bloqueado`/`Detenido`.

**OTD% y CT SLO% mezclados conceptualmente.** Hoy el Engine spec doc `Greenhouse_ICO_Engine_v1.md` líneas 958-992 define OTD% como `cycle_time_days <= 14.2` (competitive benchmark vs industria) pero el código `src/lib/ico-engine/metric-registry.ts:202-206` define OTD% como `performance_indicator_code = 'on_time'` (per-task deadline compliance). Son métricas **conceptualmente distintas** que responden preguntas distintas. La decisión canonical 2026-05-17 (Delta sección D) es separarlas en 2 KPIs canonical:

- **OTD% (canonical, existente)**: promise compliance — % entregadas dentro de **su deadline individual** del brief
- **CT SLO% (canonical, NUEVA)**: competitive benchmark — % entregadas con `cycle_time ≤ threshold industria` (default 14.2 días)

Ambas son útiles. OTD% responde "¿cumplimos el deadline que prometimos?". CT SLO% responde "¿somos competitivos vs industria?". El doc debe actualizarse para reflejar la separación.

**Gaps implementacionales de status taxonomy (B.1 + B.2 del Delta 2026-05-17).** Detectados en deep-dive sesión 2026-05-17:

- **B.1**: `BLOCKED_STATUSES = ['Bloqueado', 'Detenido']` declarada en `metric-registry.ts:123` pero NO usada en `CANONICAL_OPEN_TASK_SQL` (líneas 133-136) → tareas en `Bloqueado` contaminan denominador OTD/RpA/FTR. Contradice la regla canonical A.4 del Delta 2026-05-17.
- **B.2**: Estados Sky-specific (`Tomado`, `Listo para revisión`, `En feedback`, `Aprobado`, `Bloqueado`) NO mapeados en `TASK_STATUS_TO_CSC` (líneas 103-115) → CSC distribution charts incorrectos para Sky (Person 360, Pulse, Sky scorecards).

Empaquetar los 5 entregables en una sola TASK porque **comparten la misma capa subyacente**: status taxonomy + status transition capture. Hacer 5 TASKs separadas duplicaría infra de tests, migrations y review cycles. Hacer 1 paquete combinado es ~1-2 semanas dev vs ~3-4 semanas si fragmentado.

## Goal

- **Infra canonical de status transition tracking**: nueva tabla `greenhouse_delivery.task_status_transitions` (append-only, capturado vía webhook Notion `page.properties_updated` filtrado por property `Estado 1`). Cada transición persiste `(task_id, from_status, to_status, transitioned_at, transitioned_by, source_event_id)`. Pattern reusa la infra de TASK-901 (webhook + outbox + consumer).
- **Helper canonical `calculateCycleTime()`** server-only en `src/lib/notion-metrics/calculate-cycle-time.ts` con las 4 decisiones canonizadas:
  - INICIO = primer timestamp donde status pasó a `En curso` (Efeonce) o `Tomado` (Sky). Fallback documentado a `created_at` cuando NO hay transition row (tareas pre-implementation).
  - FIN = `completed_at` (Notion `Fecha de completado`).
  - Tiempo en `En feedback`: SE INCLUYE.
  - Tiempo en `Bloqueado`/`Detenido`: SE EXCLUYE (descontado del CT).
- **Nueva métrica canonical `CT SLO%`** en `metric-registry.ts` con threshold configurable (default 14.2 días). Calibrable per tipo de pieza en futura iteración (Sección 7.2 del contrato).
- **Fix B.1**: `Bloqueado`/`Detenido` excluidos del denominador de OTD/RpA/FTR via nuevo `EXCLUDED_FROM_METRICS_STATUSES` que combina `EXCLUDED_STATUSES ∪ BLOCKED_STATUSES`.
- **Fix B.2**: Estados Sky `Tomado`, `Listo para revisión`, `En feedback`, `Aprobado` mapeados a CSC canonical en `TASK_STATUS_TO_CSC`. `Bloqueado` NO se mapea (queda excluded).
- **Housekeeping documental**: actualizar `Greenhouse_ICO_Engine_v1.md` líneas 887-992 para reflejar (a) fórmula canonical CT actualizada (status → En curso, descuento Bloqueado), (b) separación canonical OTD% (promise) vs CT SLO% (benchmark). Resuelve drift documental detectado en Delta 2026-05-17 sección D.
- **Tests anti-regresión** para verificar: paridad CT pre/post-implementation para tareas con/sin transition rows; signal de validación que el conteo de tareas excluidas crece monotónicamente post-fix B.1; smoke visual CSC charts para Sky pre/post fix B.2.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 sección C y D — **PRECONDICIÓN CANONICAL** (cierra las decisiones que esta TASK implementa)
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-992 — drift documental a resolver
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — pattern outbox + consumer
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — pattern webhook ingestion
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — pattern reliability signal
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — dual-store PG+BQ

Reglas obligatorias canonical:

- **NUNCA** recomputar Cycle Time inline en consumers — toda lectura pasa por `calculateCycleTime()` helper canonical o via `cycle_time_days` columna materializada en `v_tasks_enriched`.
- **NUNCA** modificar la columna `cycle_time_days` en `v_tasks_enriched` sin migration + backfill verificado contra snapshot pre-cambio. Esto afecta `metrics_by_*` downstream que ya están materializados.
- **NUNCA** mezclar OTD% y CT SLO% en la misma métrica. Son canonical separados desde Delta 2026-05-17 D.
- **NUNCA** calcular tiempo en Bloqueado sin captura formal de transitions (no inferir desde `last_edited_time` que se sobreescribe).
- **NUNCA** invocar `Sentry.captureException()` directo — usar `captureWithDomain(err, 'integrations.notion', { tags: { source: 'cycle_time_*' } })`.
- **SIEMPRE** que un consumer downstream necesite Cycle Time, leer desde `cycle_time_days` columna materializada (después del cambio canonical) — NO recomputar desde dates raw.

## Normative Docs

- **`docs/architecture/Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones C + D + B (gaps B.1 y B.2)** — PRECONDICIÓN canonical, la TASK implementa lo que ahí se canonizó
- `docs/tasks/to-do/TASK-901-canonical-notion-metric-compute-v1-rpa.md` — pattern fuente para infra webhook + outbox + consumer (esta TASK reusa el mismo skeleton)
- `docs/tasks/to-do/TASK-900-ico-materializer-merge-incremental-freshness-guard.md` — materializer hardening (complementario, no blocking)
- `src/lib/ico-engine/metric-registry.ts` líneas 103-115 (CSC mapping), 122-123 (BLOCKED_STATUSES), 133-136 (CANONICAL_OPEN_TASK_SQL), 202-206 (OTD%), 257-282 (cycle_time), 284-308 (cycle_time_variance)
- `src/lib/ico-engine/schema.ts` líneas 108-113 (cycle_time_days SQL canonical actual)
- `src/lib/ico-engine/rpa-policy.ts` — TASK-215 confidence policy (no afectada)

## Dependencies & Impact

### Depends on

- Notion internal integration token canonical (compartido con TASK-901 o nuevo dedicated `notion-integration-token-greenhouse-status-transitions`)
- HMAC webhook signing secret (compartido con TASK-901 o nuevo)
- `services/ops-worker/server.ts` + `wrapCronHandler` (TASK-844)
- `src/lib/observability/capture.ts` (`captureWithDomain`)
- `src/lib/sync/outbox-consumer.ts` (`publishOutboxEvent`)
- `src/lib/postgres/client.ts` (`runGreenhousePostgresQuery`, `withTransaction`)
- 2 Notion Task DBs target (Sky `23039c2f-efe7-81f8-af2d-000b67594d18`, Efeonce `5126d7d8-bf3f-454c-80f4-be31d1ca38d4`)
- Decisión canonical 2026-05-17 ya en `Contrato_Metricas_ICO_v1.md` Delta sección C + D (cerradas)

### Blocks / Impacts

- **`metrics_by_*` materialized**: cambio en `cycle_time_days` fórmula causa cambio en aggregados downstream (`cycle_time_avg_days`, `cycle_time_p50_days`, `cycle_time_variance`). Recovery requiere full re-materialization post-cambio.
- **Person 360 + Pulse + ICO scorecards**: CSC distribution charts mejoran para Sky tras fix B.2.
- **OTD% / RpA / FTR**: denominadores cambian post-fix B.1 (excluyendo Bloqueado). Tareas previamente contaminadas dejan de contar → métricas SUBEN ligeramente (efecto esperado, no bug).
- **TASK-901 (RpA writeback)**: complementario. Esta TASK y TASK-901 comparten infra de webhook ingestion + outbox + consumer. Idealmente shippean en orden: TASK-901 Discovery + Slice 0 + 1 primero (foundation común), después TASK-908 extiende reusing.
- **TASK-902/903/904 (OTD/FTR/Cumplimiento writebacks futuros)**: si emergen, beneficiados por la infra de status transition ya canonizada acá.

### Files owned

- `src/lib/notion-metrics/calculate-cycle-time.ts` — NEW: helper canonical `calculateCycleTime()` pure + tests
- `src/lib/notion-metrics/calculate-cycle-time.test.ts` — NEW: tests pure (12+ paths)
- `src/lib/notion-metrics/cycle-time-types.ts` — NEW: `TaskInputsForCycleTime`, `CycleTimeResult` types
- `src/lib/notion-metrics/cycle-time-slo-config.ts` — NEW: threshold configuration (default 14.2, calibrable per tipo de pieza)
- `src/lib/webhooks/handlers/notion-status-transitions.ts` — NEW: webhook handler para `Estado 1` property changes
- `src/app/api/webhooks/notion-status-transitions/route.ts` — NEW: Vercel route handler thin wrapper (puede share con TASK-901 endpoint si emerge canonical decision)
- `src/lib/sync/projections/notion-status-transition-capture.ts` — NEW: reactive consumer registration
- `services/ops-worker/server.ts` — MODIFY: add endpoint `/notion-status-transitions/process` via `wrapCronHandler`
- `migrations/<timestamp>_task-status-transitions-capture-and-ct-slo.sql` — NEW: tabla `greenhouse_delivery.task_status_transitions` + extensión `metric-registry.ts` config para CT SLO threshold + DO guard
- `src/types/db.d.ts` — regenerated post-migration
- `src/lib/ico-engine/schema.ts` — MODIFY: actualizar fórmula `cycle_time_days` para usar status transition start + descontar Bloqueado (mantener fallback a `created_at` para tareas pre-transition-capture)
- `src/lib/ico-engine/metric-registry.ts` — MODIFY: agregar métrica `cycle_time_slo_pct`, fix B.1 (combinar EXCLUDED + BLOCKED), fix B.2 (mapear estados Sky)
- `src/lib/reliability/queries/cycle-time-canonical-paridad.ts` — NEW: signal shadow mode pre-cutover
- `src/lib/reliability/queries/notion-status-transitions-ingestion-lag.ts` — NEW
- `src/lib/reliability/queries/ico-blocked-tasks-exclusion-coverage.ts` — NEW (signal fix B.1)
- `src/lib/reliability/queries/ico-sky-csc-mapping-coverage.ts` — NEW (signal fix B.2)
- `src/lib/reliability/get-reliability-overview.ts` — MODIFY: wire signals
- `docs/architecture/Greenhouse_ICO_Engine_v1.md` — MODIFY: actualizar líneas 887-992 con CT canonical + OTD/SLO separation (resolve drift)
- `docs/architecture/Contrato_Metricas_ICO_v1.md` — MODIFY: agregar Delta de cierre cuando TASK shipea (link a esta TASK)
- `CLAUDE.md` — MODIFY: agregar sección "ICO Status Transition Capture Pattern (TASK-908, desde [fecha])"
- `scripts/notion-metrics/backfill-status-transitions-from-notion-history.ts` — NEW: one-shot backfill para tareas existentes con history disponible en Notion
- `tests/e2e/smoke/ico-csc-distribution-sky.spec.ts` — NEW: smoke visual CSC chart para Sky pre/post fix B.2

## Current Repo State

### Already exists

- `src/lib/ico-engine/schema.ts:108-113` — fórmula actual `cycle_time_days` (createdTime → completed_at, calendar puro)
- `src/lib/ico-engine/metric-registry.ts:257-282` — métrica `cycle_time` actual (lee `cycle_time_days`)
- `src/lib/ico-engine/metric-registry.ts:202-206` — métrica `otd_pct` actual (correcta canonical, no se toca)
- `src/lib/ico-engine/metric-registry.ts:103-115` — `TASK_STATUS_TO_CSC` mapping incompleto para Sky
- `src/lib/ico-engine/metric-registry.ts:122-123` — `BLOCKED_STATUSES` declarada pero no usada
- Notion DBs Sky + Efeonce con property `Estado 1` (status type) — fuente de transitions
- `notion_ops.tareas` BQ raw + `greenhouse_conformed.delivery_tasks` BQ conformed + `greenhouse_delivery.tasks` PG
- Infra webhook + outbox + consumer pattern (TASK-706 HubSpot reference, TASK-773 outbox, TASK-844 wrapCronHandler) — reusable
- TASK-901 (en flight) introduce infra webhook Notion + outbox + Cloud Tasks — esta TASK potencialmente comparte infra

### Gap

- No existe tabla `greenhouse_delivery.task_status_transitions` ni equivalente para audit de cambios de estado
- No existe helper canonical `calculateCycleTime()` — fórmula vive inline en `schema.ts` SQL
- No existe métrica `cycle_time_slo_pct` (separación OTD% vs SLO no implementada)
- No existe webhook handler `notion-status-transitions` ni endpoint en ops-worker
- `BLOCKED_STATUSES` declarada pero no excluida del denominador de métricas (B.1)
- Estados Sky-specific no mapeados en CSC (B.2)
- `Greenhouse_ICO_Engine_v1.md` líneas 887-992 desactualizado (drift documental vs código actual)
- No existen reliability signals para cycle time canonical paridad ni para coverage de fixes B.1/B.2

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Foundation: migration + capability + types

- Migration `migrations/<timestamp>_task-status-transitions-capture-and-ct-slo.sql`:
  - Tabla `greenhouse_delivery.task_status_transitions` (append-only):
    - `transition_id UUID PK DEFAULT gen_random_uuid()`
    - `task_source_id TEXT NOT NULL` (Notion page ID)
    - `assignee_member_id TEXT NULL` (snapshot al momento de la transition)
    - `space_id TEXT NULL` (snapshot)
    - `from_status TEXT NULL` (NULL si es primer transition)
    - `to_status TEXT NOT NULL`
    - `transitioned_at TIMESTAMPTZ NOT NULL`
    - `transitioned_by TEXT NULL` (Notion user ID que hizo el cambio si está en payload)
    - `source_event_id TEXT NULL` (Notion webhook event_id para dedup)
    - `received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - INDEX `(task_source_id, transitioned_at ASC)` para reconstruir history per task
  - INDEX `(to_status, transitioned_at DESC)` para queries "tareas en X estado en período"
  - Anti-UPDATE trigger sobre identity fields (append-only)
  - Capabilities seed `cycle_time.compute.execute` (read, all, EFEONCE_ADMIN + DEVOPS_OPERATOR)
- Tipos TS `TaskInputsForCycleTime` + `CycleTimeResult` en `src/lib/notion-metrics/cycle-time-types.ts`
- Helper de configuración `cycle-time-slo-config.ts` (threshold default 14.2 + map per tipo de pieza)
- Capability grants en `runtime.ts`
- Anti pre-up-marker DO guard

### Slice 1 — Canonical helpers + tests

- `src/lib/notion-metrics/calculate-cycle-time.ts`:
  ```typescript
  type TaskInputsForCycleTime = {
    enCursoStartedAt: Date | null   // de task_status_transitions
    completedAt: Date | null
    blockedIntervals: Array<{ entered: Date; exited: Date | null }>  // de task_status_transitions
    createdAt: Date                  // fallback cuando enCursoStartedAt es null
  }

  type CycleTimeResult = {
    cycleTimeDays: number | null
    sourceMode: 'canonical' | 'fallback_created_at' | 'unavailable'
    blockedDaysExcluded: number
  }

  calculateCycleTime(inputs: TaskInputsForCycleTime): CycleTimeResult
  // Logica canonical Delta 2026-05-17:
  // - start = enCursoStartedAt ?? createdAt (fallback documentado)
  // - end = completedAt (null → unavailable)
  // - rawDays = (end - start) in days
  // - blockedDays = sum of (exit - enter) for blockedIntervals where enter >= start AND exit <= end
  // - cycleTimeDays = rawDays - blockedDays
  ```
- Tests pure mínimo 12 paths: happy + null inicio + null fin + bloqueado overlap + fallback createdAt + multiple bloqueado intervals + bloqueado pre-start (no descuenta) + bloqueado post-end (no descuenta) + bloqueado abierto (sin exit, usa CURRENT) + cycle 0 días + cycle negativo (defensive)
- Lint rule `greenhouse/no-inline-cycle-time-calculation` modo `warn` durante migración

### Slice 2 — Webhook ingestion para status transitions

- Crear `src/lib/webhooks/handlers/notion-status-transitions.ts`:
  - HMAC validation (mismo pattern TASK-901)
  - Filter: solo procesar events donde `updated_properties` incluye `Estado 1`
  - Echo-loop filter: si event author == nuestro integration user, ACK + drop
  - Inbox dedup vía `notion_webhook_inbox` (compartido con TASK-901 si shippea primero, o crear separado)
  - Para cada transition detectada: emit outbox event `notion.task.status_transitioned v1` con `{taskSourceId, fromStatus, toStatus, transitionedAt, transitionedBy}`
- Route handler `src/app/api/webhooks/notion-status-transitions/route.ts` (puede consolidarse con `/api/webhooks/notion-tasks` de TASK-901 si emerge decisión canonical de "1 webhook endpoint para todos los events Notion")
- Tests: signature valid/invalid, echo-loop drop, filter por property, dedup conflict, outbox emit
- Reliability signal `notion-status-transitions-ingestion-lag.ts` (lag entre webhook recibido y outbox emitido > 5s)

### Slice 3 — Reactive consumer para persist transitions

- `src/lib/sync/projections/notion-status-transition-capture.ts`:
  - `triggerEvents: ['notion.task.status_transitioned']`
  - `extractScope: (event) => ({ taskSourceId })`
  - `refresh: persistStatusTransition`
- Helper `persistStatusTransition({taskSourceId, fromStatus, toStatus, transitionedAt, transitionedBy, sourceEventId})`:
  - INSERT row en `greenhouse_delivery.task_status_transitions`
  - Idempotency: UNIQUE constraint `(task_source_id, source_event_id)` o equivalent
- Wire-up en ops-worker reactive processor

### Slice 4 — Actualizar fórmula `cycle_time_days` en BQ view

- Modificar `src/lib/ico-engine/schema.ts:108-113` para que `cycle_time_days` use:
  - INICIO: `COALESCE((SELECT MIN(transitioned_at) FROM transitions WHERE task_source_id = dt.task_source_id AND to_status IN ('En curso', 'Tomado')), dt.created_at)`
  - FIN: `COALESCE(DATE(dt.completed_at), CURRENT_DATE())`
  - DESCUENTO BLOQUEADO: subtract sum of (exit - enter) for transitions where to_status IN ('Bloqueado', 'Detenido')
- **IMPORTANTE**: la tabla `task_status_transitions` vive en PG, pero `cycle_time_days` vive en BQ. Hay 2 opciones:
  - **A) Sync periodically PG transitions → BQ** mediante materialization daily (reuse pattern de TASK-900 MERGE incremental).
  - **B) Compute cycle_time_days post-BQ** en consumer cuando se lee — fallback complejo.
  - Recomendado: **A**. Crear tabla BQ `greenhouse_conformed.task_status_transitions` materializada desde PG via outbox consumer.
- Tests E2E comparando paridad pre/post-cambio (assertion: tareas SIN transition rows → mismo cycle_time_days que ahora; tareas CON transitions → cycle_time_days ajustado per fórmula nueva)

### Slice 5 — Nueva métrica `cycle_time_slo_pct`

- Agregar a `metric-registry.ts`:
  ```typescript
  {
    id: 'cycle_time_slo_pct',
    code: 'cycle_time_slo_pct',
    label: '% dentro de SLO de ciclo',
    shortName: 'CT SLO%',
    description: '% de tareas completadas con cycle_time_days ≤ threshold (default 14.2 días, calibrable per tipo de pieza)',
    unit: '%',
    granularities: ['monthly', 'weekly'],
    formula: { kind: 'percentage', numeratorCondition: `(cycle_time_days <= ${getSLOThreshold()})`, denominatorCondition: CANONICAL_COMPLETED_TASK_SQL },
    thresholds: { optimal: { min: 89, max: 100 }, attention: { min: 75, max: 89 }, critical: { min: 0, max: 75 } },
    higherIsBetter: true,
    icon: 'tabler-gauge',
    color: 'success',
    benchmark: { type: 'external', label: 'Benchmark industria LATAM', source: 'Greenhouse_ICO_Engine_v1.md §A.5.5' },
    trust: { sampleBasis: 'completed_tasks', healthyMinSampleSize: 10 }
  }
  ```
- Helper `getSLOThreshold(taskType?)` que retorna threshold per tipo de pieza si está calibrado, sino default 14.2
- Tests anti-regresión: simular dataset de tareas con CTs variados, verificar CT SLO% correcto per threshold

### Slice 6 — Fix B.1: Bloqueado excluded del denominador

- Modificar `metric-registry.ts:122-136`:
  ```typescript
  export const EXCLUDED_FROM_METRICS_STATUSES = [...EXCLUDED_STATUSES, ...BLOCKED_STATUSES] as const
  const EXCLUDED_FROM_METRICS_SQL = EXCLUDED_FROM_METRICS_STATUSES.map(s => `'${s}'`).join(',')

  const CANONICAL_OPEN_TASK_SQL = `(
    completed_at IS NULL
    AND (task_status IS NULL OR task_status NOT IN (${EXCLUDED_FROM_METRICS_SQL}))
  )`
  ```
- Reliability signal `ico-blocked-tasks-exclusion-coverage.ts` (count de tareas Bloqueado que dejaron de contar — monotónicamente creciente post-fix)
- Tests anti-regresión: verificar que tareas previamente archivadas/canceladas siguen excluidas (sin cambio), y que tareas bloqueadas ahora SE excluyen (cambio)

### Slice 7 — Fix B.2: Estados Sky mapeados a CSC

- Modificar `metric-registry.ts:103-115` `TASK_STATUS_TO_CSC`:
  ```typescript
  {
    // ... existentes ...
    'Tomado': 'briefing',              // Sky-side initial state
    'Listo para revisión': 'entrega',  // antes de enviar al cliente
    'En feedback': 'cambios_cliente',  // = "Cambios Solicitados" en otros DBs
    'Aprobado': 'entrega',             // estado terminal Sky-side
    // 'Bloqueado' NO se mapea — está en EXCLUDED_FROM_METRICS_STATUSES
  }
  ```
- Reliability signal `ico-sky-csc-mapping-coverage.ts` (count de tareas Sky con `fase_csc IN ('otros', NULL)` — debe bajar a 0 post-fix)
- Smoke test E2E visual: comparar CSC distribution chart Sky pre/post fix (Person 360 + Pulse)

### Slice 8 — Housekeeping documental Engine spec doc

- Actualizar `docs/architecture/Greenhouse_ICO_Engine_v1.md` líneas 887-992:
  - Sección `cycle_time`: reflejar fórmula canonical actualizada (status → En curso start + descuento Bloqueado), referenciar Delta 2026-05-17 Contrato_Metricas_ICO_v1.md
  - Sección `cycle_time_variance`: sin cambios conceptuales, pero referenciar nueva fórmula CT
  - Sección `otd_pct`: actualizar para reflejar canonical (promise compliance) — remover la línea `cycle_time_days <= 14.2`
  - Sección NUEVA `cycle_time_slo_pct`: documentar la métrica nueva, referenciar Delta 2026-05-17 sección D
- Update inline doc references (descriptions, source comments) para coherencia con código actualizado

### Slice 9 — Backfill histórico opcional + reliability signals + docs canonical

- Script `scripts/notion-metrics/backfill-status-transitions-from-notion-history.ts`:
  - Para cada tarea en Notion (Sky + Efeonce), fetch page history via Notion API
  - Reconstruir transition events para `Estado 1` property changes
  - Insert en `task_status_transitions` table batched + throttled
  - Idempotente (UNIQUE constraint)
  - Tareas sin history disponible quedan con `enCursoStartedAt = null` → CT helper usa fallback `createdAt`
- Reliability signal `cycle-time-canonical-paridad.ts` (shadow mode signal: compara CT canonical vs CT legacy pre-cutover)
- Agregar a CLAUDE.md sección "ICO Status Transition Capture Pattern (TASK-908)":
  - Hard rules: NUNCA modificar `cycle_time_days` sin migration + backfill verified
  - Hard rules: NUNCA recomputar CT inline en consumers
  - Pointers a helpers canonical
- Update `docs/tasks/README.md` + `Handoff.md` + `changelog.md`

## Out of Scope

- **OTD/FTR/Cumplimiento writebacks** — son TASK-902/903/904 separadas (referenciadas en TASK-901 follow-ups). Esta TASK solo toca status transitions + Cycle Time + status taxonomy hygiene.
- **Calibración detallada de CT SLO threshold per tipo de pieza** — V1 usa default universal 14.2. V2 (TASK derivada) implementa per-task-type calibration.
- **`time_to_client_approval` métrica nueva** (mencionada en Delta sección C.2 como complementaria) — out of scope V1, queda como follow-up.
- **Cambios al UI dashboards** — esta TASK actualiza el motor + materializer. UI consume los nuevos valores automáticamente. Solo si emerge necesidad UX-side cambia, se hace en TASK separada.
- **Migración de TASK-900 patterns** — TASK-900 (materializer MERGE+freshness) ataja un problema independiente. Esta TASK puede shippear ANTES o DESPUÉS de TASK-900 — no blocking.
- **Notion Workers / External Agents** — descartados en TASK-901 research por mismas razones (out of scope para todo el writeback architecture).

## Detailed Spec

(Detalles técnicos canonical están distribuidos en los Slices arriba. Ver `Contrato_Metricas_ICO_v1.md` Delta 2026-05-17 secciones C + D + B para la decisión canonical de cada componente.)

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Discovery (verificación de overlap con TASK-901 infra)** PRIMERO si TASK-901 está en flight — decidir si compartimos webhook endpoint + inbox o creamos separados.
- **Slice 0 + 1 (foundation + helper)** ANTES que cualquier otro slice — additive sin runtime impact.
- **Slice 2 + 3 (webhook + consumer)** ANTES que Slice 4 (necesitamos transitions persistidas antes de actualizar `cycle_time_days` fórmula).
- **Slice 4 (cycle_time_days actualización)** requiere 7 días shadow mode con paridad signal verde ANTES de cutover.
- **Slice 5 (CT SLO%)** después de Slice 4 (depende de cycle_time_days canonical).
- **Slice 6 (fix B.1) y Slice 7 (fix B.2)** pueden shippear en paralelo, ambos independientes.
- **Slice 8 (housekeeping doc)** al final, refleja estado post-cutover.
- **Slice 9 (backfill + signals + CLAUDE.md)** opcional, después de Slice 4 verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cambio en `cycle_time_days` afecta `metrics_by_*` aggregados (cycle_time_avg, variance) downstream | ICO read path + dashboards | high | Shadow mode 7d con paridad signal + full re-materialization post-cutover + snapshot pre-cambio en BQ (`ico_engine_backup`) | `cycle_time_canonical_paridad` (drift > threshold) |
| Backfill histórico no puede reconstruir transitions para tareas viejas | Cycle time accuracy histórica | medium | Fallback documentado: tareas sin transition rows usan `createdAt` → CT calculado idéntico al legacy → no regresión, solo "no mejora retroactiva" | `cycle_time_fallback_usage_rate` |
| Webhook ingestion duplica con TASK-901 si shipean independientes | Notion API rate + ops-worker capacity | medium | Discovery slice decide: compartir endpoint `/api/webhooks/notion-tasks` (canonical recomendado) vs separar | Per-endpoint webhook rate signal |
| Fix B.1 cambia OTD/RpA/FTR values de tareas en producción | Operator expectations | medium | Comunicar al equipo pre-cutover: "OTD/RpA/FTR pueden subir ligeramente porque tareas bloqueadas dejan de contaminar". Snapshot BQ pre-cambio para audit | `ico-blocked-tasks-exclusion-coverage` |
| Fix B.2 cambia CSC distribution charts para Sky | Sky scorecard UI | low | Smoke test E2E visual pre/post + comunicar al equipo Sky | `ico-sky-csc-mapping-coverage` |
| Threshold SLO 14.2 días no aplica a todos tipos de pieza (video toma más) | CT SLO% engañoso para algunos task types | medium | V1 usa default universal; V2 calibra per task type (out of scope V1, documentar limitación) | Distribution analysis post-shadow |
| Status transition events lost (Notion webhook 0.1% loss) | Audit completeness | low | Cron nightly backfill from Notion page history (Slice 9 opcional puede convertirse en recurring) | `notion-status-transitions-ingestion-lag` |
| Migration agrega tabla nueva sin afectar production | PG + BQ | low | Migration idempotente, DO guard verify, no requiere downtime | Migration verification post-apply |

### Feature flags / cutover

- **`CT_CANONICAL_HELPER_ENABLED`** (default `false`, Slice 1): controla si consumers leen `calculateCycleTime()` helper vs `cycle_time_days` columna actual. Flag OFF default = legacy behavior bit-for-bit.
- **`NOTION_STATUS_TRANSITION_CAPTURE_ENABLED`** (default `false`, Slices 2-3): controla si webhook handler procesa events. OFF = events ignorados.
- **`CT_DAYS_CANONICAL_FORMULA_ENABLED`** (default `false`, Slice 4): controla si `v_tasks_enriched.cycle_time_days` usa fórmula canonical nueva vs legacy. **CRITICAL CUTOVER** — flip requiere full re-materialization downstream.
- **`CT_SLO_PCT_METRIC_ENABLED`** (default `false`, Slice 5): controla si métrica CT SLO% se computa + persiste en `metrics_by_*`.
- **`ICO_BLOCKED_EXCLUSION_ENABLED`** (default `false`, Slice 6): controla si CANONICAL_OPEN_TASK_SQL usa EXCLUDED_FROM_METRICS_STATUSES vs solo EXCLUDED_STATUSES.
- **`ICO_SKY_CSC_MAPPING_EXTENDED_ENABLED`** (default `false`, Slice 7): controla si TASK_STATUS_TO_CSC incluye mapeos Sky.

Cada flag revert <5min via `gcloud run services update-env-vars` + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| S0 | Down migration drop table — helpers sin callers no impactan | <5min | Sí |
| S1 | Revert PR helpers | <5min | Sí |
| S2 | Flag `NOTION_STATUS_TRANSITION_CAPTURE_ENABLED=false` | <5min | Sí |
| S3 | Mismo flag + revert consumer | <5min | Sí |
| S4 | Flag `CT_DAYS_CANONICAL_FORMULA_ENABLED=false` + full re-materialization legacy | <10min flag + ~30min re-mat | Sí |
| S5 | Flag `CT_SLO_PCT_METRIC_ENABLED=false` | <5min | Sí |
| S6 | Flag `ICO_BLOCKED_EXCLUSION_ENABLED=false` | <5min | Sí |
| S7 | Flag `ICO_SKY_CSC_MAPPING_EXTENDED_ENABLED=false` | <5min | Sí |
| S8 | Revert PR docs | <5min | Sí |
| S9 | Backfill ya escrito = idempotente, no requiere rollback. Signals revertibles via revert PR | <5min | Parcial |

### Production verification sequence

1. Discovery + S0 staging: migration + tables creadas, capabilities granted.
2. S1 staging: helpers tested, no callers todavía.
3. S2 + S3 staging: webhook activo, consumer persistiendo transitions. Verify 24h ingestion en tabla.
4. S4 staging shadow: flag `CT_DAYS_CANONICAL_FORMULA_ENABLED=true` PARALELO al legacy. Compare signal `cycle_time_canonical_paridad` durante 7d. Verify cambio esperado (tareas con transitions → CT distinto; sin transitions → mismo CT).
5. S4 staging cutover: flip flag, full re-materialization, monitor downstream.
6. S5 + S6 + S7 staging: cada uno con su flag, observation 3d antes de prod.
7. **Production rollout staged** post-staging ≥14d total: cooldown 48h entre cada slice.
8. Comunicar al equipo pre-S4 prod (OTD/RpA/FTR pueden cambiar ligeramente) y pre-S6 (mismo motivo).

### Out-of-band coordination required

- **Comunicación al equipo pre-S4 prod**: "cycle time va a cambiar — tareas con transitions tracked tendrán CT más bajo (descontando Bloqueado, startando en `En curso`); tareas viejas sin transition history mantienen CT legacy".
- **Comunicación pre-S6**: "OTD/RpA/FTR pueden subir ligeramente porque tareas bloqueadas dejan de contaminar denominador".
- **GCP Secret Manager**: si comparten infra con TASK-901, reusar secrets. Sino, crear nuevos.
- **Notion webhook subscription**: registrar subscription nueva para `Estado 1` property changes (puede compartir con TASK-901 subscription si emerge canonical decision).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migration `task-status-transitions-capture-and-ct-slo.sql` aplica idempotente + DO guard verifica
- [ ] `src/lib/notion-metrics/calculate-cycle-time.ts` con tests pure ≥12 paths verde
- [ ] Webhook handler procesa `Estado 1` property changes + persiste en `task_status_transitions`
- [ ] Reactive consumer registrado en ops-worker
- [ ] `cycle_time_days` SQL actualizada en `v_tasks_enriched` con fallback documentado (gated por flag)
- [ ] Métrica `cycle_time_slo_pct` registrada + computed + visible en dashboards (gated)
- [ ] Fix B.1 verificado: tareas Bloqueado fuera del denominador (signal monotónicamente creciente)
- [ ] Fix B.2 verificado: estados Sky mapeados a CSC, charts pre/post visualmente correctos
- [ ] `Greenhouse_ICO_Engine_v1.md` líneas 887-992 actualizadas reflejando canonical post-decisión 2026-05-17
- [ ] 4 reliability signals wired-up en `getReliabilityOverview` subsystem `Integrations · Notion`
- [ ] 6 feature flags graduados documentados en runbook
- [ ] Backfill opcional ejecutado (o documentado por qué se difiere a V1.1)
- [ ] CLAUDE.md sección "ICO Status Transition Capture Pattern" mergeada
- [ ] Contrato_Metricas_ICO_v1.md Delta de cierre agregada cuando TASK ship

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/notion-metrics/calculate-cycle-time`
- `pnpm test src/lib/webhooks/handlers/notion-status-transitions`
- `pnpm test src/lib/reliability/queries/cycle-time-canonical-paridad`
- `pnpm migrate:up` staging
- Manual: Notion webhook synthetic test
- Manual: monitor 14d post-S9 dashboard `/admin/operations`

## Closing Protocol

- [ ] Lifecycle sincronizado, archivo en carpeta correcta
- [ ] README.md sincronizado
- [ ] Handoff.md actualizado con aprendizajes (especialmente cycle time paridad findings + backfill coverage)
- [ ] changelog.md actualizado
- [ ] Chequeo de impacto cruzado: TASK-901 (compartir infra) + TASK-900 (materializer hardening) + TASK-902/903/904 (futuros writebacks)
- [ ] CLAUDE.md sección mergeada y referenciada
- [ ] Delta de cierre en Contrato_Metricas_ICO_v1.md

## Follow-ups

- TASK derivada V1.1: calibrar CT SLO threshold per tipo de pieza (config + UI admin)
- TASK derivada V1.2: métrica complementaria `time_to_client_approval` (`Fecha de completado` → `Aprobado` cliente)
- TASK derivada V2: integrar con TASK-901 si emerge necesidad de writeback de CT a Notion (operadores ven `[GH] Cycle Time` live)
- TASK derivada housekeeping: revisar otros docs arquitectónicos que mencionen CT/OTD para resolver drift residual

## Open Questions

1. **Infra compartida vs separada con TASK-901**: si TASK-901 shipea primero, esta TASK reusa endpoint webhook `/api/webhooks/notion-tasks` + inbox `notion_webhook_inbox` extendiendo por event type. Decisión en Discovery slice.
2. **Backfill scope**: ¿reconstruir transitions para TODAS las tareas históricas vía Notion API (~3,500+ Sky + Efeonce) o solo desde fecha cutoff (e.g. último mes)? Trade-off: completeness vs Notion API rate limits.
3. **CT SLO threshold calibration**: V1 default 14.2 universal vs ya implementar per-task-type? Default V1 simpler, V2 más correcto.
4. **Cycle time per tipo de pieza**: ¿cómo agregar la dimensión `Tipo de pieza` al threshold lookup sin explotar matriz?
