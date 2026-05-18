# TASK-900 — ICO Materializer Hardening: MERGE incremental + freshness guard

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Shipped 2026-05-18 directo en develop (7 slices canonical, defaults flags OFF)`
- Rank: `TBD`
- Domain: `delivery|ico|reliability|platform`
- Blocked by: `none`
- Branch: `task/TASK-900-ico-materializer-merge-incremental-freshness-guard`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Reemplazar el patrón **DELETE-then-INSERT** del materializer ICO (`metrics_by_member` + 4 hermanos) por un patrón canónico **MERGE incremental + freshness guard** que (a) preserve data buena cuando upstream está degradado, (b) skipee corridas inseguras automáticamente si los reliability signals upstream detectan drift, (c) procese solo deltas vs full-table scan cada noche, y (d) sea cross-cutting reusable para los 5 materializers ICO existentes. Bug class fuente: incidente live 2026-05-14 → 2026-05-16 donde TASK-877 degradó el bridge Notion↔member y el materializer destruyó 2+ noches de data buena de Abril+Mayo sin emitir warning ni preservar nada.

## Why This Task Exists

Patrón actual del materializer ICO (verificable en `src/lib/ico-engine/materialize.ts:625-668` y siblings):

```sql
DELETE FROM ico_engine.metrics_by_member WHERE period_year = X AND period_month = Y;
INSERT INTO ico_engine.metrics_by_member SELECT ... FROM v_tasks_enriched
WHERE primary_owner_member_id IS NOT NULL GROUP BY member_id;
```

Cada noche a las 3:15 AM Santiago, el cron `ico-materialize-daily` ejecuta esto para los últimos 3 meses (default `monthsBack=3`). **Es destructivo y sin guardrails upstream**.

**4-Pillar score del patrón actual** (per `arch-architect` review post-incidente 2026-05-16):

| Pilar | Score | Notes |
|---|---|---|
| Eficiente | ⚠️ MEDIO | 3 min con 10 colaboradores × 3 meses. Escala lineal. A 50 colaboradores × 12 meses ya son ~30 min. Acceptable hoy. |
| Robusto | ⚠️ MEDIO | Idempotente ✓. PERO DELETE+INSERT no es atómico BQ — ventana ~30-60s donde la tabla está vacía. Consumer que lee en ese momento ve "no hay datos". |
| Seguro | ✅ ALTO | Datos primarios (`notion_ops.tareas`, `delivery_tasks`) intactos. Solo se gestiona proyección derivada. |
| Resiliente | ❌ BAJO | **No distingue "no llegaron datos nuevos" vs "los datos llegaron correctamente"**. Si upstream está degradado, destruye lo bueno. Sin freshness guard. |
| Escalable | ⚠️ MEDIO | Funciona a 10× growth (~30 min/run). 100× insostenible. |

**Live evidence (2026-05-14 → 2026-05-16, TASK-877 follow-up commit `4fc8c0c4`)**:

TASK-877 introdujo regresión silenciosa en el bridge Notion→member. El sync upstream empezó a producir `delivery_tasks.assignee_member_id = NULL` para ~95% de las tareas. Cada noche desde el 14 mayo, el materializer:

1. Borró rows correctos de Marzo + Abril + Mayo en `metrics_by_member`
2. Reinsertó vacío (0-2 rows por mes vs 5-9 esperados)
3. Sin emitir ningún warning, sin abortar, sin preservar lo bueno

Resultado visible al usuario: `/hr/payroll/projected?year=2026&month=4` mostró TODOS los colaboradores con OTD/RpA en $0 por ~2 días, aunque la nómina actual de Abril persistida en `payroll_entries` era correcta. La proyección recalcula live y leyó `metrics_by_member` vacío.

**Mitigación temporal ya en producción** (commit `4fc8c0c4` shipped 2026-05-16):

Reliability signal `identity.notion_bridge.coverage_drift` (subsystem Identity & Access). Si coverage < 60% → warning. Si < 40% → error. Operador detecta regresión en horas vs 2 días. **No previene el bug, solo lo expone**. Esta task cierra la causa raíz arquitectónica.

## Goal

- Helper canónico `runUpstreamFreshnessGate()` server-only que verifica reliability signals upstream antes de cualquier corrida destructiva del materializer ICO.
- `materializeMemberMetrics()` migrado a patrón **MERGE incremental** (idempotente, atomic, preserve historical buenos vs DELETE+INSERT actual).
- Patrón replicado a los 4 materializers hermanos: `metrics_by_project`, `metrics_by_sprint`, `metrics_by_organization`, `metrics_by_business_unit`.
- Tracking de `last_materialization_at` per (table, period) en tabla governance canonical para soportar incremental delta filter.
- Tests anti-regresión que simulan bug class TASK-877 (upstream bridge regression) y verifican que el materializer **aborta + preserva data previa** en lugar de destruirla.
- Patrón canonizado en CLAUDE.md (`ICO Materializer Hardening Pattern`) + ADR archivada para futuros materializers downstream (Frame.io, HubSpot, etc.).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PG-first / BQ analytical
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — patrón signal-then-gate
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — projections + recovery
- `docs/architecture/GREENHOUSE_ICO_ENGINE_*` `[verificar]` — si existe spec ICO

Reglas obligatorias canonical:

- **NUNCA** ejecutar un DELETE+INSERT sobre una tabla materializada de ICO sin freshness gate previo verificando coverage de los signals upstream (`identity.notion_bridge.coverage_drift` y siblings).
- **NUNCA** abortar silenciosamente el materializer: si el gate skipea, emitir `captureWithDomain(err, 'delivery', { source: 'materializer_aborted', reason })` y persistir el skip en `source_sync_runs` con `status='skipped_safety'`.
- **NUNCA** reescribir un materializer sin tests anti-regresión que simulen upstream degraded + verifiquen preservación de data previa.
- **SIEMPRE** que emerja un materializer nuevo (Frame.io, HubSpot, etc.), reusar el helper canónico `runUpstreamFreshnessGate()` + patrón MERGE incremental documentado en este task.

## Normative Docs

- `CLAUDE.md` § "Identity Bridge Cutover Protocol (TASK-877 follow-up, desde 2026-05-16)" — hard rule adyacente
- `src/lib/reliability/queries/identity-notion-bridge-coverage.ts` — signal canónico fuente
- `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md` — 7-layer defense pattern (freshness gate = Capa 1)
- `docs/tasks/complete/TASK-571-income-settlement-reconciliation.md` `[verificar]` — VIEW + helper + signal pattern
- `docs/tasks/complete/TASK-766-finance-clp-currency-reader-contract.md` — canonical reader pattern

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/materialize.ts:625-668` — `materializeMemberMetrics()` actual (refactor target)
- `src/lib/ico-engine/materialize.ts` siblings: `materializeProjectMetrics`, `materializeSprintMetrics`, `materializeOrganizationMetrics`, `materializeBusinessUnitMetrics` `[verificar nombres exactos]`
- `src/lib/reliability/queries/identity-notion-bridge-coverage.ts` — signal canónico ya shipped (commit `4fc8c0c4`)
- `services/ico-batch/server.ts` `[verificar path]` — endpoint `/ico/materialize` que invoca los materializers
- Cloud Scheduler job `ico-materialize-daily` (us-east4, `efeonce-group`) — no requiere cambios de config
- BigQuery `ico_engine.metrics_by_*` tablas + `v_tasks_enriched` VIEW

### Blocks / Impacts

- Futuros materializers downstream (Frame.io ingestion, HubSpot ICO, etc.) deberían reusar el patrón canónico que produce esta task.
- Eventual canonization de "ICO Materializer Hardening Pattern" en CLAUDE.md como hard rule.
- Posible follow-up: lint rule `greenhouse/no-destructive-materializer-without-freshness-gate` (out of scope V1, queda como TASK derivada post-replicación).

### Files owned

- `src/lib/ico-engine/materialize-guards.ts` — NEW: helper canónico `runUpstreamFreshnessGate()`.
- `src/lib/ico-engine/materialize-guards.test.ts` — NEW: tests del helper.
- `src/lib/ico-engine/materialize.ts` — refactor de los 5 materializers a MERGE incremental.
- `src/lib/ico-engine/materialize.test.ts` `[verificar si existe]` — extender / crear.
- `src/lib/ico-engine/materialize-incremental.live.test.ts` — NEW: tests anti-regresión que simulan upstream degraded.
- `migrations/<timestamp>_ico-materializer-last-materialization-tracking.sql` — NEW: tabla governance `greenhouse_sync.ico_materialization_runs` con `(table_name, period_year, period_month, last_materialization_at, last_run_status)`.
- `src/types/db.d.ts` — regenerated post-migration.
- `CLAUDE.md` — agregar hard rule "ICO Materializer Hardening Pattern".
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — Delta entry referenciando este task.

## Current Repo State

### Already exists

- `src/lib/ico-engine/materialize.ts` con los 5 materializers DELETE+INSERT.
- `src/lib/reliability/queries/identity-notion-bridge-coverage.ts` — signal canónico Notion bridge (shipped 4fc8c0c4).
- `migrations/20260516234743277_backfill-notion-bridge-greenhouse-staff.sql` — backfill canónico (shipped 4fc8c0c4).
- CLAUDE.md § "Identity Bridge Cutover Protocol" — hard rule adyacente que documenta el bug class fuente.
- `services/ico-batch/` Cloud Run service con cron diario `ico-materialize-daily` (3:15 AM Santiago, `monthsBack=3`).
- `getReliabilityOverview` wire-up canónico para signals (`src/lib/reliability/get-reliability-overview.ts`).
- Pattern reference `runNotionConformedRecovery` (`src/lib/cron-orchestrators/index.ts:422-451`) — shape de "cron orchestrator con guard pre-ejecución".

### Gap

- No existe helper canónico `runUpstreamFreshnessGate()` — cada materializer escribe SQL inline sin verificar nada upstream.
- No existe tracking persistente de `last_materialization_at` per (table, period) — el cron asume "borrar y reinsertar todo" cada noche.
- No existen tests anti-regresión que simulen upstream degraded + verifiquen preservación de data previa.
- No existe signal específico `delivery.ico_materializer.skipped_safety_count` para visibilizar cuántas veces el gate aborta (governance de "el sistema está protegiéndose").
- No hay convención canonical declarada en CLAUDE.md sobre cómo escribir materializers safe — el patrón actual se hereda por copy-paste entre los 5 archivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Freshness gate helper canónico

- Crear `src/lib/ico-engine/materialize-guards.ts` con helper `runUpstreamFreshnessGate({ requireSignals?: ReliabilitySignalId[] }) → Promise<{ safe: boolean; reason?: string; blockingSignals: ReliabilitySignal[] }>`.
- Default `requireSignals`: `['identity.notion_bridge.coverage_drift']` + cualquier signal nuevo que emerja durante esta task (e.g. `delivery.conformed_sync.freshness` si se crea como follow-up).
- Tests pure mockeando signals: gate retorna `safe=true` cuando todos `ok`, `safe=false` cuando cualquiera `error`, `safe=true` con warning (no bloqueante por default).
- Exponer constante `BLOCKING_SEVERITY_DEFAULT: ['error']` configurable per-callsite.
- Cero side effects en este slice — solo helper + tests + barrel export.

### Slice 2 — MERGE incremental para `materializeMemberMetrics`

- Convertir `materializeMemberMetrics()` (líneas 625-668 de `src/lib/ico-engine/materialize.ts`) a MERGE pattern.
- Pre-MERGE: invocar `runUpstreamFreshnessGate()`. Si `safe=false`, persistir skip en `source_sync_runs` con `status='skipped_safety'` + `notes=blockingSignals`. Emitir `captureWithDomain(err, 'delivery', { source: 'ico_materializer_skipped_safety', table: 'metrics_by_member' })`. Return sin ejecutar.
- MERGE statement BQ:
  - `WHEN MATCHED THEN UPDATE` recompute todas las métricas.
  - `WHEN NOT MATCHED THEN INSERT` rows nuevas.
  - **NO** `WHEN NOT MATCHED BY SOURCE THEN DELETE` — preserve historical buenos.
- Tests E2E comparando estado final post-MERGE vs estado final post-DELETE+INSERT en el mismo dataset (assertion: mismo resultado funcional cuando upstream sano).
- Tests anti-regresión simulando upstream degraded (mock signal en error) + assertion: tabla queda intacta vs estado previo.
- Slice no toca los 4 hermanos todavía — solo `metrics_by_member`. Replicación a siblings va en Slice 4.

### Slice 3 — Last materialization tracking (tabla governance)

- Migration `migrations/<timestamp>_ico-materializer-last-materialization-tracking.sql`:
  - Tabla `greenhouse_sync.ico_materialization_runs`:
    - `materialization_id UUID PK DEFAULT gen_random_uuid()`
    - `table_name TEXT NOT NULL` (`metrics_by_member` / `metrics_by_project` / etc.)
    - `period_year INT NOT NULL`
    - `period_month INT NOT NULL`
    - `started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
    - `completed_at TIMESTAMPTZ NULL`
    - `status TEXT NOT NULL CHECK (status IN ('running','succeeded','skipped_safety','failed'))`
    - `rows_merged INT NULL`
    - `rows_inserted INT NULL`
    - `blocking_signals JSONB NULL` (cuando `status='skipped_safety'`)
    - `notes TEXT NULL`
  - INDEX `(table_name, period_year, period_month, started_at DESC)` para lookup "última corrida exitosa".
  - GRANT canonical owner `greenhouse_ops` + write a `greenhouse_runtime`.
  - Anti pre-up-marker DO block verificando tabla creada.
- Helper TS `recordIcoMaterializationRun({ tableName, periodYear, periodMonth, status, blockingSignals?, rowsMerged?, rowsInserted? })` en `src/lib/ico-engine/materialize-tracking.ts`.
- Helper TS `getLastSuccessfulMaterializationAt({ tableName, periodYear, periodMonth }) → Promise<Date | null>` para soportar incremental delta filter en Slice 4.

### Slice 4 — Incremental delta filter (filter por `last_edited_time`)

- En `materializeMemberMetrics()`: post-gate, llamar `getLastSuccessfulMaterializationAt(...)`. Si retorna timestamp `T`, agregar `WHERE v_tasks_enriched.last_edited_time >= T - INTERVAL '1 hour'` al MERGE source. Si retorna `null` (primera corrida), procesar full period.
- 1-hour overlap window es defensa contra races (tareas editadas entre `T` y el momento de la query).
- Edge case: si el MERGE source devuelve 0 rows (nada cambió desde la última materialización), skipear gracefully sin error.
- Tests E2E: simular 2 corridas consecutivas, verificar que la 2da procesa solo deltas.

### Slice 5 — Replicar pattern a los 4 materializers hermanos

- Aplicar mismo refactor (MERGE + gate + tracking + delta filter) a:
  - `materializeProjectMetrics` → `metrics_by_project`
  - `materializeSprintMetrics` → `metrics_by_sprint`
  - `materializeOrganizationMetrics` → `metrics_by_organization`
  - `materializeBusinessUnitMetrics` → `metrics_by_business_unit`
- Cada uno consume el mismo `runUpstreamFreshnessGate()` con su set de signals relevantes (e.g. project metrics consume también signals upstream de `commercial.service_engagement.*` si aplica — open question).
- Tests E2E per sibling siguiendo template del Slice 2.

### Slice 6 — Reliability signal `delivery.ico_materializer.skipped_safety`

- Reader `src/lib/reliability/queries/ico-materializer-skipped-safety.ts`:
  - Cuenta filas en `greenhouse_sync.ico_materialization_runs` con `status='skipped_safety'` en última ventana 24h.
  - Severity:
    - count = 0 → `ok` (steady state — gate confía en upstream).
    - count > 0 → `warning` (gate detectó upstream degraded y protegió data).
    - count > 5 en 24h → `error` (sostenido — upstream necesita atención humana, signals fuente no se están resolviendo).
  - Subsystem rollup: `Identity & Access` (porque la causa raíz típicamente vive ahí) `[verificar — puede ir a un subsystem nuevo "Delivery Materialization Health"]`.
- Wire-up en `getReliabilityOverview`.
- Tests análogos a `identity-notion-bridge-coverage.test.ts`.

### Slice 7 — Docs canonical + CLAUDE.md hard rule + ADR

- Agregar a CLAUDE.md la sección "ICO Materializer Hardening Pattern (TASK-900, desde [fecha shipping])":
  - Patrón canónico declarado: MERGE incremental + freshness gate + tracking.
  - Hard rules: nunca DELETE+INSERT sin gate, nunca abortar silenciosamente, etc.
  - Pointers a helpers canónicos (`runUpstreamFreshnessGate`, `recordIcoMaterializationRun`).
  - Caso fuente: bug class 2026-05-14 → 2026-05-16.
- Delta en `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` referenciando este task.
- ADR opcional `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_PATTERN_V1.md` `[verificar si el repo prefiere V1 specs o ADR separados — leer DECISIONS_INDEX.md]`.
- Update `docs/tasks/README.md` + `Handoff.md` + `changelog.md` per Closing Protocol.

## Out of Scope

- Refactor del Notion conformed sync (`runNotionSyncOrchestration`) — TASK-877 ya canonizó esa cutover post-recovery.
- Cambios al schema de `notion_ops.tareas` o `greenhouse_conformed.delivery_tasks`.
- Refactor del bridge resolver `loadNotionMemberMapPostgresFirst` — canónico post-incident.
- ESLint rules sobre el pattern — queda para follow-up post-replicación completa a los 5 materializers (TASK derivada).
- Migración a Dataform / dbt — discusión de tooling out of scope; este task se contiene al pattern actual TypeScript+BQ.
- Extensión del pattern a materializers fuera de ICO (HubSpot, Frame.io futuras integraciones) — quedan como follow-ups que reusarán el helper canónico.
- Cambios al cron schedule (`ico-materialize-daily`) — sigue 3:15 AM Santiago, sigue `monthsBack=3`.

## Detailed Spec

### Diseño técnico canónico — MERGE pattern

```sql
-- Pseudo (Slice 2 — materializeMemberMetrics post-refactor)
MERGE INTO `efeonce-group.ico_engine.metrics_by_member` AS t
USING (
  SELECT
    te.primary_owner_member_id AS member_id,
    @periodYear AS period_year,
    @periodMonth AS period_month,
    -- ... todas las métricas computadas via buildMetricSelectSQL()
    CURRENT_TIMESTAMP() AS materialized_at
  FROM `${projectId}.${ICO_DATASET}.v_tasks_enriched` te
  WHERE te.primary_owner_member_id IS NOT NULL
    AND te.primary_owner_member_id != ''
    AND te.period_year = @periodYear
    AND te.period_month = @periodMonth
    -- Slice 4 — incremental delta filter:
    AND te.last_edited_time >= @lastMaterializationAt
  GROUP BY member_id
) AS s
ON (t.member_id = s.member_id
    AND t.period_year = s.period_year
    AND t.period_month = s.period_month)
WHEN MATCHED THEN UPDATE SET
  rpa_avg = s.rpa_avg,
  otd_pct = s.otd_pct,
  -- ... todas las columnas
  materialized_at = s.materialized_at
WHEN NOT MATCHED THEN INSERT (
  member_id, period_year, period_month, rpa_avg, otd_pct, /* ... */ materialized_at
) VALUES (
  s.member_id, s.period_year, s.period_month, s.rpa_avg, s.otd_pct, /* ... */ s.materialized_at
)
-- CRÍTICO: NO incluir WHEN NOT MATCHED BY SOURCE THEN DELETE
-- Preserve historical buenos cuando upstream parcial.
```

### Diseño técnico canónico — Freshness gate

```typescript
// src/lib/ico-engine/materialize-guards.ts
import 'server-only'

import { getIdentityNotionBridgeCoverageSignal } from '@/lib/reliability/queries/identity-notion-bridge-coverage'
import type { ReliabilitySignal } from '@/types/reliability'

type FreshnessGateResult =
  | { safe: true; blockingSignals: [] }
  | { safe: false; reason: string; blockingSignals: ReliabilitySignal[] }

const DEFAULT_BLOCKING_SEVERITY: ReliabilitySignal['severity'][] = ['error']

export const runUpstreamFreshnessGate = async (options?: {
  requireSignals?: Array<() => Promise<ReliabilitySignal>>
  blockingSeverity?: ReliabilitySignal['severity'][]
}): Promise<FreshnessGateResult> => {
  const fetchers = options?.requireSignals ?? [getIdentityNotionBridgeCoverageSignal]
  const blockingSeverity = options?.blockingSeverity ?? DEFAULT_BLOCKING_SEVERITY

  const signals = await Promise.all(fetchers.map(fn => fn().catch(() => null)))
  const validSignals = signals.filter((s): s is ReliabilitySignal => s !== null)

  const blocking = validSignals.filter(s => blockingSeverity.includes(s.severity))

  if (blocking.length > 0) {
    return {
      safe: false,
      reason: blocking.map(s => `${s.signalId}=${s.severity}`).join(', '),
      blockingSignals: blocking
    }
  }

  return { safe: true, blockingSignals: [] }
}
```

### Diseño técnico canónico — Wire-up del gate en materializer

```typescript
// src/lib/ico-engine/materialize.ts (Slice 2 — refactored materializeMemberMetrics)
import { runUpstreamFreshnessGate } from './materialize-guards'
import {
  recordIcoMaterializationRun,
  getLastSuccessfulMaterializationAt
} from './materialize-tracking'
import { captureWithDomain } from '@/lib/observability/capture'

const materializeMemberMetrics = async (
  projectId: string,
  periodYear: number,
  periodMonth: number
): Promise<number> => {
  // Capa 1 — Freshness gate (TASK-900)
  const gate = await runUpstreamFreshnessGate()
  if (!gate.safe) {
    await recordIcoMaterializationRun({
      tableName: 'metrics_by_member',
      periodYear,
      periodMonth,
      status: 'skipped_safety',
      blockingSignals: gate.blockingSignals.map(s => ({ id: s.signalId, severity: s.severity }))
    })
    captureWithDomain(
      new Error(`ico_materializer_skipped_safety: ${gate.reason}`),
      'delivery',
      {
        tags: { source: 'ico_materializer_skipped_safety', table: 'metrics_by_member' },
        extra: { periodYear, periodMonth, blockingSignals: gate.blockingSignals }
      }
    )
    return 0
  }

  // Capa 2 — Incremental delta filter (TASK-900 Slice 4)
  const lastMaterializedAt = await getLastSuccessfulMaterializationAt({
    tableName: 'metrics_by_member',
    periodYear,
    periodMonth
  })

  // Capa 3 — MERGE incremental (no DELETE)
  const startedAt = new Date()
  await runIcoEngineQuery(/* MERGE statement con WHEN MATCHED + WHEN NOT MATCHED */)

  // Capa 4 — Tracking persistente
  const countRows = await runIcoEngineQuery<{ cnt: unknown }>(/* COUNT post-merge */)
  const rowCount = toNumber(countRows[0]?.cnt)

  await recordIcoMaterializationRun({
    tableName: 'metrics_by_member',
    periodYear,
    periodMonth,
    status: 'succeeded',
    rowsMerged: rowCount,
    notes: lastMaterializedAt ? `incremental from ${lastMaterializedAt.toISOString()}` : 'full period (first run)'
  })

  return rowCount
}
```

### Schema migration

```sql
-- migrations/<timestamp>_ico-materializer-last-materialization-tracking.sql

-- Up Migration

CREATE TABLE IF NOT EXISTS greenhouse_sync.ico_materialization_runs (
  materialization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','skipped_safety','failed')),
  rows_merged INT NULL,
  rows_inserted INT NULL,
  blocking_signals JSONB NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ico_materialization_runs_lookup_idx
  ON greenhouse_sync.ico_materialization_runs (table_name, period_year, period_month, started_at DESC);

CREATE INDEX IF NOT EXISTS ico_materialization_runs_status_recent_idx
  ON greenhouse_sync.ico_materialization_runs (status, started_at DESC)
  WHERE status = 'skipped_safety';

ALTER TABLE greenhouse_sync.ico_materialization_runs OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE ON greenhouse_sync.ico_materialization_runs TO greenhouse_runtime;

-- Anti pre-up-marker guard
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_sync' AND table_name = 'ico_materialization_runs'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'TASK-900 anti pre-up-marker: ico_materialization_runs NOT created. Migration markers may be inverted.';
  END IF;
END $$;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.ico_materialization_runs;
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Orden estricto del grafo de dependencias:

- **Slice 1 (freshness gate helper) DEBE shippear PRIMERO** — los siguientes slices lo consumen como dependencia atómica.
- **Slice 3 (migration tracking table) DEBE shippear ANTES que Slice 4 (incremental delta filter)** — sin la tabla, el filter no tiene de dónde leer `last_materialization_at`.
- **Slice 2 (MERGE refactor metrics_by_member) DEBE shippear ANTES que Slice 5 (replicar a siblings)** — Slice 2 es el reference implementation; Slice 5 es batch.
- **Slice 6 (signal skipped_safety) puede correr en paralelo con Slice 5** una vez que Slice 2 cerró (el signal lee de la tabla creada en Slice 3, que no depende de los siblings).
- **Slice 7 (docs + CLAUDE.md) ship al final** — documenta el patrón ya estable.

Cualquier agente que ejecute slices fuera de este orden viola el contract de la task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| MERGE incremental deja huérfanos (rows en metrics_by_X cuyas tareas Notion fueron archivadas) | ICO read path | medium | Cleanup periódico opt-in via flag `ICO_MATERIALIZER_CLEANUP_ORPHANS_ENABLED` (default `false`); fallback documentado: full re-materialization manual via admin endpoint | `delivery.metrics_by_member.orphan_count` (signal nuevo opt-in) |
| Freshness gate falsa positiva aborta materializer correcto | ICO downstream (payroll proyectada, /admin/operations) | medium | Default `blockingSeverity=['error']` (NO bloquea con `warning`); operator override via flag `ICO_MATERIALIZER_FORCE_BYPASS_GATE` (audit + reason >= 20 chars) | `delivery.ico_materializer.skipped_safety` (Slice 6) |
| Migration de tabla tracking falla en staging | ICO batch worker startup | low | Migration idempotente (`IF NOT EXISTS`) + anti pre-up-marker DO guard + verificación post-`migrate:up` via information_schema | Migration explicit RAISE EXCEPTION |
| MERGE BQ falla por límite de bytes scanned (incremental delta filter no aplicado correctamente) | BQ cost + cron latency | low | Tests E2E verifican incremental scan reduce bytes vs full scan (assertion en bytes processed) | Cloud Logging bytes_scanned metric |
| Replicación a siblings (Slice 5) introduce bug que afecta /agency/pulse o /agency/operations | Delivery UI surfaces | medium | Slice 5 ships incremental: 1 sibling por commit + smoke test agency surfaces per commit | Sentry domain=delivery |
| `last_materialization_at` lookup contention con many materializers running concurrent | PG `greenhouse_sync.ico_materialization_runs` writes | low | INSERT-only writes (cada run es row nuevo, no UPDATE); INDEX `(table_name, period_year, period_month, started_at DESC)` cubre lookup | PG slow query log |
| Anti-regresión test para upstream degraded no captura todos los failure modes | Resilience claim | medium | Combinar 3 tipos de tests: signal mock en error + signal lookup throws + signal returns unknown. Documentar exhaustive en `materialize-incremental.live.test.ts` | Test coverage report |

### Feature flags / cutover

3 feature flags graduados (default `false` los 3, flip secuencial post-staging verde):

- **`ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED`** (default `false`)
  - Controla si `materializeMemberMetrics()` invoca `runUpstreamFreshnessGate()` o salta directo al MERGE.
  - Flag OFF default V1: legacy behavior bit-for-bit (sin gate, MERGE pero sin abortar nunca).
  - Flag ON post-staging shadow ≥7d con 0 abortos espurios: gate activo.
  - Revert: env var a `false` + redeploy Cloud Run ico-batch worker. Tiempo de revert: <5 min.

- **`ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED`** (default `false`)
  - Controla si el MERGE source query agrega `WHERE last_edited_time >= @lastMaterializationAt`.
  - Flag OFF default V1: MERGE procesa full period (mismo costo BQ que DELETE+INSERT actual, pero idempotente).
  - Flag ON post comparación E2E con full period (assertion: mismo final state): incremental activo.
  - Revert: env var a `false` + redeploy.

- **`ICO_MATERIALIZER_MERGE_PATTERN_ENABLED`** (default `false`)
  - Master switch: controla si los materializers usan MERGE (nuevo) o DELETE+INSERT (legacy).
  - Flag OFF default V1 hasta que tests E2E Slice 2 confirmen idempotencia + preservación de data buena.
  - Flag ON post staging ≥14d sin discrepancia: patrón canónico activo.
  - Revert: env var a `false` + redeploy → legacy DELETE+INSERT inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (gate helper) | Revert PR — helper sin callers no impacta production | <5 min | Sí (sin estado) |
| Slice 2 (MERGE para member) | Env var `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=false` + redeploy ico-batch worker — vuelve a DELETE+INSERT | <5 min | Sí (flag-controlled) |
| Slice 3 (migration tracking) | Down migration drop table (datos perdidos: histórico de runs — aceptable porque es governance no-source-of-truth) | <2 min | Sí (DROP TABLE idempotente) |
| Slice 4 (incremental delta) | Env var `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=false` + redeploy — MERGE procesa full period | <5 min | Sí (flag-controlled) |
| Slice 5 (replicar a siblings) | Revert commit del sibling específico afectado — sin perder los siblings ya estables | <10 min por sibling | Sí (commit-granular) |
| Slice 6 (signal skipped_safety) | Revert reader file + wire-up — signal desaparece de /admin/operations sin afectar runtime | <5 min | Sí (read-only) |
| Slice 7 (docs + CLAUDE.md) | Revert commits docs — no afecta runtime | <2 min | Sí |

### Production verification sequence

1. **Slice 1 staging**: deploy helper sin callers. Verify `pnpm test src/lib/ico-engine/materialize-guards.test.ts` verde. Verify TypeScript clean en consumers futuros.
2. **Slice 3 staging**: `pnpm migrate:up` en staging + verify tabla existe vía `information_schema.tables` + verify INDEX visible vía `pg_indexes`. Smoke insert manual con `psql` para confirmar grants.
3. **Slice 2 + Slice 4 staging behind 3 flags OFF**: deploy code con flags `false`. Verify `ico-materialize-daily` cron sigue corriendo igual (legacy DELETE+INSERT). Verify `getLastSuccessfulMaterializationAt` retorna `null` (sin runs registradas todavía, tabla vacía).
4. **Slice 2 flag ON staging shadow 7d**: flip `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED=true` en staging Cloud Run env. Verify durante 7 días que `metrics_by_member` mantiene mismo coverage diario (sin caídas anómalas). Comparar contra produccion via BQ query side-by-side.
5. **Slice 4 flag ON staging shadow 7d**: flip `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED=true`. Verify cron latency baja (delta filter reduce bytes scanned). Verify final state mismo que sin delta filter.
6. **Slice 1 flag ON staging shadow 14d**: flip `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED=true`. Crear bug class artificial inyectando `identity.notion_bridge.coverage_drift = error` manualmente (e.g. via test row temporal en members) y verify cron skipea con `status='skipped_safety'`. Revertir inyección.
7. **Production rollout secuencial post staging ≥21d total**: flip los 3 flags en producción con cooldown ≥48h entre cada uno. Monitor signals durante 14d post-prod.
8. **Replicar Slice 5 sibling por sibling** post staging del Slice 2 verde: 1 commit/sibling, smoke agency surface afectada per merge.

### Out-of-band coordination required

N/A — repo-only change. No requiere coordinación con sistemas externos (Notion API, HubSpot, GCP infra) más allá del deploy normal del Cloud Run ico-batch worker via GitHub Actions.

Sí requiere comunicación al operador (vía `Handoff.md` y `changelog.md`) cuando los flags graduados se vayan activando, para que entiendan que `/admin/operations` puede mostrar warnings nuevos legítimos por el gate.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/ico-engine/materialize-guards.ts` exporta `runUpstreamFreshnessGate()` con tests verde (mínimo: ok / warning / error / unknown / signal throws / blocking severity override).
- [ ] `materializeMemberMetrics()` usa MERGE pattern + invoca freshness gate + escribe a `ico_materialization_runs` tracking table.
- [ ] Tests E2E demuestran que con upstream sano, MERGE produce **mismo estado final** que DELETE+INSERT legacy.
- [ ] Tests anti-regresión demuestran que con upstream degraded (signal `identity.notion_bridge.coverage_drift = error`), materializer **NO destruye data previa** y persiste `status='skipped_safety'` en tracking table.
- [ ] Migration `<timestamp>_ico-materializer-last-materialization-tracking.sql` aplica idempotente + DO guard verifica tabla post-INSERT.
- [ ] Los 5 materializers (member + project + sprint + organization + business_unit) consumen el mismo helper + tracking + delta filter.
- [ ] Signal `delivery.ico_materializer.skipped_safety` (o nombre canonical decidido) wired-up en `getReliabilityOverview` + visible en `/admin/operations`.
- [ ] CLAUDE.md tiene sección "ICO Materializer Hardening Pattern (TASK-900, desde [fecha])" con hard rules documentadas.
- [ ] 3 feature flags (`ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED`, `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED`, `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED`) declarados con default `false` y documentados en `.env.example` `[verificar path]`.
- [ ] Production rollout sequence ejecutado per § "Production verification sequence" con staging ≥21d total antes de prod.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/ico-engine/`
- `pnpm test src/lib/reliability/queries/ico-materializer-skipped-safety.test.ts`
- `pnpm migrate:up` staging + verify `information_schema.tables`
- Validación manual: `gcloud scheduler jobs run ico-materialize-daily --location=us-east4` post-deploy y monitor logs Cloud Run ico-batch-worker para confirmar gate + MERGE + tracking flow.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] Archivo vive en carpeta correcta (`to-do/` / `in-progress/` / `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con aprendizajes (especialmente: edge cases del MERGE que emerjan durante implementación)
- [ ] `changelog.md` actualizado (cambio de pattern materializer es protocol-visible)
- [ ] Chequeo de impacto cruzado sobre otras tasks afectadas (TASK-877 follow-up — confirmar que la mitigación temporal sigue activa como defense complementaria, no se elimina)
- [ ] CLAUDE.md sección "ICO Materializer Hardening Pattern" mergeada y referenciada desde `DECISIONS_INDEX.md` si emerge ADR
- [ ] Reliability dashboard `/admin/operations` muestra signal nuevo `delivery.ico_materializer.skipped_safety` en estado `ok` post-rollout
- [ ] 3 feature flags documentados en runbook de operaciones `[verificar si existe runbook canónico para ico-batch worker]`

## Follow-ups

- **TASK derivada**: lint rule `greenhouse/no-destructive-materializer-without-freshness-gate` que detecta `DELETE FROM ... WHERE period_year` seguido de `INSERT INTO` en archivos materialize-like (`src/lib/*/materialize*.ts`). Modo `warn` durante 30d, promover a `error` post-replicación completa.
- **TASK derivada**: extender el patrón canónico (`runUpstreamFreshnessGate` + MERGE + tracking) a futuros materializers de:
  - Frame.io ingestion (cuando emerja)
  - HubSpot deals/services snapshots
  - Nubox financial materialization
- **TASK derivada V1.1**: cleanup automático de huérfanos opt-in via flag `ICO_MATERIALIZER_CLEANUP_ORPHANS_ENABLED` — rows en `metrics_by_member` cuyas tareas Notion fueron archivadas/eliminadas downstream.
- **TASK derivada V1.2**: admin endpoint `POST /api/admin/ico/materialize-force` con capability granular `ico.materializer.force_bypass_gate` (EFEONCE_ADMIN-only, audit + reason >= 20 chars) para emergencias donde operador necesita saltarse el gate.
- **TASK derivada exploratoria**: evaluar migración a Dataform / dbt para todos los materializers ICO — out of scope V1 pero el pattern canonical de esta task lo facilita.

## Open Questions

1. ¿El patrón MERGE incremental se aplica a TODOS los materializers (project, sprint, member, org, business_unit) o hay alguno donde DELETE+INSERT es semánticamente requerido (e.g. windowing functions, ranking que requieren tabla full-state)? Verificar al iniciar Slice 5.
2. ¿El freshness gate consume signals existentes (cross-domain dependency en `identity.*`) o crea su propio detector más cercano (`delivery.conformed_sync.freshness`, `delivery.tasks.coverage_drift`)? Trade-off: reuso vs aislamiento de dominio. Recomendación inicial: reusar `identity.notion_bridge.coverage_drift` en V1 + agregar signals propios delivery en V1.1 cuando emerja necesidad.
3. ¿`last_materialization_at` se persiste en una tabla governance separada (`greenhouse_sync.ico_materialization_runs`) o como column en cada tabla materialized? Recomendación inicial: tabla separada (governance pattern canónico) por audit trail + ease of cross-table querying.
4. ¿Cuándo aborta el gate, debe haber un fallback "force materialization" para que el operador pueda saltarse el gate explícitamente (e.g. emergencia donde upstream signal es falso positivo)? Recomendación inicial: NO en V1 (mantener gate hard). Si emerge necesidad, V1.2 con capability granular `ico.materializer.force_bypass_gate` (EFEONCE_ADMIN-only + reason >= 20 chars + audit).
5. ¿El signal nuevo `delivery.ico_materializer.skipped_safety` rolls up a `Identity & Access` (porque causa raíz upstream típica es identity) o a un subsystem nuevo "Delivery Materialization Health"? Decisión durante Slice 6 — depende de cómo se rollup mejor en `/admin/operations`.
6. ¿Subsystem rollup canonical para signal `delivery.ico_materializer.skipped_safety`: `Identity & Access` o nuevo `Delivery Materialization Health`? Verificar con `arch-architect` Greenhouse overlay durante Slice 6 design.
