# GREENHOUSE ICO Materializer Hardening V1

> **Status**: Accepted — shipped 2026-05-18 (TASK-900)
> **Owners**: Delivery (`moduleKey='delivery'`)
> **Cross-refs**: `CLAUDE.md` § "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)", `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`, `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## 1 — Context

Los 5 materializers ICO de `src/lib/ico-engine/materialize.ts` corren cada noche a las 3:15 AM Santiago via Cloud Scheduler `ico-materialize-daily` → Cloud Run `ico-batch-worker` → `POST /ico/materialize` con `monthsBack=3`. Antes de TASK-900, el patrón era **DELETE current period + INSERT new aggregate** — destructivo y sin guardrails upstream.

Bug class motivador (live 2026-05-14 → 2026-05-16, post TASK-877 follow-up commit `4fc8c0c4`):

1. TASK-877 introdujo regresión silenciosa en el bridge `Notion → member`. Sync upstream empezó a producir `delivery_tasks.assignee_member_id = NULL` para ~95% de las tareas.
2. Cada noche desde el 14 mayo, el materializer:
   - Borró rows correctos de Marzo + Abril + Mayo en `metrics_by_member`
   - Reinsertó vacío (0-2 rows por mes vs 5-9 esperados)
   - Sin emitir ningún warning, sin abortar, sin preservar lo bueno
3. Operador vio TODOS los colaboradores con OTD/RpA proyectado en $0 por ~2 días aunque la nómina actual de Abril persistida en `payroll_entries` era correcta.

Mitigación temporal shipped 2026-05-16 (reliability signal `identity.notion_bridge.coverage_drift`) detecta el síntoma en horas vs 2 días — **pero no previene el bug, solo lo expone**. Esta ADR cierra la causa raíz arquitectónica.

## 2 — Decision

Reemplazar DELETE+INSERT por **MERGE incremental + freshness gate + tracking persistente + delta filter**. Aplicar simétricamente a los 5 materializers ICO (`metrics_by_{member,project,sprint,organization,business_unit}`) vía orchestrator canonical + builders SQL declarativos.

Pattern reusable para futuros materializers downstream (Frame.io ingestion, HubSpot deals/services snapshots, Nubox financial materialization).

## 3 — Architecture

### 3.1 Pipeline canonical

```text
Cloud Scheduler ico-materialize-daily (3:15 AM, monthsBack=3)
  → POST /ico/materialize (Cloud Run ico-batch-worker)
  → materializeMonthlySnapshots() invoca per entity:
     runIcoMaterializerCycle({tableName, periodYear, periodMonth, runLegacy, runMerge, ...}):
       Capa 1: runUpstreamFreshnessGate() [flag-gated]
         ├─ safe=false → skipIcoMaterializationRun + captureWithDomain warning + return 0
         └─ safe=true → procede
       Capa 2: beginIcoMaterializationRun (status='running') si useMerge
       Capa 2b: getLastSuccessfulMaterializationAt → deltaCutoffIso si useIncrementalDelta
       Capa 3: ejecutar runMerge(deltaCutoffIso) o runLegacyDeleteInsert
         ├─ throw → failIcoMaterializationRun + captureWithDomain error + re-throw
         └─ rowCount → continúa
       Capa 4: completeIcoMaterializationRun (status='succeeded' + rows_merged + notes)
```

### 3.2 Module topology

```text
src/lib/ico-engine/
├── materialize.ts                    # Thin wrappers (5 materializers + monthly orchestration)
├── materialize-flags.ts              # 3 flags graduados + assertMaterializerFlagCoherence
├── materialize-guards.ts             # runUpstreamFreshnessGate canonical
├── materialize-tracking.ts           # PG CRUD audit append-only
├── materialize-orchestrator.ts       # runIcoMaterializerCycle (4 capas)
└── materialize-sql-builders.ts       # buildLegacyDeleteInsertSql + buildMergeSql + buildPostCountSql
```

### 3.3 Tracking table canonical

`greenhouse_sync.ico_materialization_runs` (migration `20260518141020881`):

| Column | Type | Notes |
|---|---|---|
| `materialization_id` | UUID PK | `gen_random_uuid()` |
| `table_name` | TEXT NOT NULL | CHECK IN 5 valores cerrados |
| `period_year` | INT NOT NULL | CHECK 2020-2100 |
| `period_month` | INT NOT NULL | CHECK 1-12 |
| `started_at` | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |
| `completed_at` | TIMESTAMPTZ NULL | NOT NULL cuando status terminal |
| `status` | TEXT NOT NULL | CHECK IN ('running','succeeded','skipped_safety','failed') |
| `rows_merged` | INT NULL | CHECK >= 0 |
| `rows_inserted` | INT NULL | CHECK >= 0 |
| `blocking_signals` | JSONB NULL | NOT NULL cuando status='skipped_safety' |
| `notes` | TEXT NULL | Free-form (e.g. "incremental from <ISO>") |
| `created_at` | TIMESTAMPTZ NOT NULL | DEFAULT NOW() |

INDEXES:
- `(table_name, period_year, period_month, started_at DESC)` para lookup `getLastSuccessfulMaterializationAt`
- Partial `(started_at DESC) WHERE status='skipped_safety'` para reliability signal

Triggers:
- `*_guard_update_trigger` — solo permite transición `running → terminal`; identity cols immutables
- `*_guard_delete_trigger` — unconditionally rejected

Ownership: `greenhouse_ops` + GRANT SELECT/INSERT a `greenhouse_runtime`.

### 3.4 MERGE pattern canonical

```sql
MERGE INTO `<project>.ico_engine.<table>` AS t
USING (
  SELECT <key_cols>, period_year, period_month, <metric_cols>, materialized_at
  FROM (
    SELECT
      <key_select_sql>,
      @periodYear AS period_year,
      @periodMonth AS period_month,
      ${buildMetricSelectSQL()},
      MAX(te.last_edited_time) AS entity_last_edited,
      CURRENT_TIMESTAMP() AS materialized_at
    FROM ${buildDeliveryPeriodSourceSql(projectId)} te
    WHERE <where_clause_sql>
    GROUP BY <group_by_sql>
  )
  WHERE entity_last_edited >= TIMESTAMP(@deltaCutoff)   -- opcional, si delta enabled
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY <partition_by_sql>
    ORDER BY materialized_at DESC
  ) = 1
) AS s
ON t.<key> = s.<key> AND t.period_year = s.period_year AND t.period_month = s.period_month
WHEN MATCHED THEN UPDATE SET <metrics> = s.<metrics>, materialized_at = s.materialized_at
WHEN NOT MATCHED THEN INSERT (...) VALUES (...)
-- CRÍTICO: NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`
```

Críticos del MERGE:

- **QUALIFY ROW_NUMBER** cinturón anti-duplicate (arch-architect rec #1). Sin él, MERGE BQ falla con "more than one source row" si emergen duplicates upstream.
- **NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`** — preserva data buena cuando source incompleto.
- **Delta filter a nivel BUCKET** (`MAX(te.last_edited_time) AS entity_last_edited` + outer WHERE), NO a nivel TASK. Filtrar tasks individualmente corrompe aggregates.
- **1-hour overlap** (`new Date(lastMaterializedAt.getTime() - 3600000)`) defensa contra races entre `started_at` y el momento de la query.

## 4 — Feature flags

3 flags graduados default OFF (cutover progresivo):

| Flag | Default | Efecto cuando true |
|---|---|---|
| `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` | `false` | invoca `runUpstreamFreshnessGate`; skipea cuando upstream signal bloquea |
| `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED` | `false` | usa MERGE atomic vs legacy DELETE+INSERT |
| `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED` | `false` | filter `entity_last_edited >= deltaCutoff` (REQUIRES MERGE) |

`assertMaterializerFlagCoherence` throw runtime cuando `INCREMENTAL_DELTA=true` && `MERGE_PATTERN=false`. Mirror pattern TASK-893 `LEAVE_PARTICIPATION_AWARE_ENABLED` requiring parents ON.

Cutover sequence per `production verification`:

1. Slice 1 staging → helper sin callers, verify tests.
2. Slice 3 staging → migrate:up + verify table + triggers + indexes via `information_schema`.
3. Slices 2+4 staging behind 3 flags OFF → cron sigue legacy, tracking table vacía.
4. `MERGE_PATTERN_ENABLED=true` staging shadow 7d → comparar `metrics_by_member` coverage diario.
5. `INCREMENTAL_DELTA_ENABLED=true` staging shadow 7d → verify bytes scanned reduce + final state mismo.
6. `FRESHNESS_GATE_ENABLED=true` staging shadow 14d → inyectar bug class artificial + verify skip.
7. Production rollout secuencial post staging >=21d total → flip los 3 flags con cooldown >=48h entre cada uno.

## 5 — Reliability signals

`delivery.ico_materializer.skipped_safety` (kind=`drift`, moduleKey='delivery'):

| Severity | Condición |
|---|---|
| `ok` | count=0 sustained (steady state — gate confía en upstream) |
| `warning` | 1 ≤ count ≤ 5 en 24h (gate protegió data; resolver signal fuente) |
| `error` | count > 5 en 24h (upstream NO resolviéndose; intervención humana) |
| `unknown` | query throws + captureWithDomain('delivery', ...) |

Complementario a `identity.notion_bridge.coverage_drift` — cuando el gate alerta es buena noticia (detectó problema upstream antes de destruir downstream).

Subsystem rollup: `delivery` module (`incidentDomainTag='delivery'`). NO subsystem nuevo.

## 6 — 4-Pillar Score

### Safety

- **What can go wrong**: bug class TASK-877 follow-up donde upstream degraded destruye data buena downstream.
- **Gates**: freshness gate flag-controlled bloqueando severity `['error']`; materializer skipea con persistence en `ico_materialization_runs` + captureWithDomain warning.
- **Blast radius if wrong**: cron-scope (1 invocación / 5 tablas × 3 períodos). Falso positivo del gate → payroll/projected muestra metrics_by_member stale del último materialization. Falso negativo → legacy behavior bit-for-bit (sin daño added).
- **Verified by**: 16 tests anti-regresión (member_merge.test.ts × 11 + builders × 13 + signal × 8) cubriendo todas las combinaciones de flag + simulación bug class TASK-877.
- **Residual risk**: gate solo lee `identity.notion_bridge.coverage_drift`. Si emerge regression upstream de otro signal (e.g. delivery_tasks empty por sync caído), gate no detecta. Mitigación: arquitectura `requireSignals` array — V1.1 agrega signals adicionales sin refactor.

### Robustness

- **Idempotency**: MERGE BQ idempotente por construcción (key `(entity_id, period_year, period_month)`). `ico_materialization_runs` INSERT-only con audit row per run.
- **Atomicity**: MERGE BQ single-statement atomic. Tracking row INSERT post-MERGE (separate PG tx). Si tracking falla, materializer succeeded pero tracking pierde row → siguiente run procesa full period (graceful degradation).
- **Race protection**: Cloud Run concurrency=1 (`services/ico-batch/deploy.sh:CONCURRENCY="1"`). Para concurrent ad-hoc invocations futuras (admin endpoint V1.2), agregar advisory lock.
- **Constraint coverage**: CHECK `status IN (...)` cerrado; CHECK `skipped_safety REQUIERE blocking_signals NOT NULL`; CHECK rangos period_year/month; INDEX cubre lookup.
- **Verified by**: builder tests verifican shape canonical; orchestrator tests cubren los 8 failure paths (gate fail, tracking fail, merge fail, lookup fail, etc.).

### Resilience

- **Retry policy**: Cloud Scheduler retry no configurado. Si falla, signal alerta + operador re-trigger manual via `gcloud scheduler jobs run`. Aceptable porque cron diario corre 3:15 AM y un día stale es tolerable.
- **Dead letter**: `ico_materialization_runs.status='failed'` o `'skipped_safety'`. Operador ve via signal `delivery.ico_materializer.skipped_safety`.
- **Reliability signal**: `delivery.ico_materializer.skipped_safety` steady=0, severity warning>0 / error>5/24h.
- **Audit trail**: `ico_materialization_runs` append-only enforced por triggers PG (anti-UPDATE / anti-DELETE).
- **Recovery procedure**: env var `<FLAG>_ENABLED=false` + redeploy ico-batch <5min vuelve a legacy DELETE+INSERT.

### Scalability

- **Hot path Big-O**: MERGE source aggregate ~few thousand tasks per cliente × 3 meses. CLUSTER BY entity key en target. Lookup `getLastSuccessfulMaterializationAt` O(log n) con composite INDEX.
- **Index coverage**: PG tracking INDEX cubre lookup canonical. BQ tables ya `CLUSTER BY` merge key.
- **Async paths**: cron diario async fuera de request path. ✓
- **Cost at 10x**: BQ MERGE bytes scanned ≈ DELETE+INSERT today. Delta filter (Slice 4) reduce ~80% post-stable. PG tracking ~450 inserts/mes → 4.5k a 10x = trivial.

## 7 — Trade-offs explícitos

- **Safety vs Resilience**: gate hard sin force-bypass V1. Si falso positivo durante incidente, operador revierte env var (~5 min) en lugar de "force" individual. Aceptable.
- **Robustness vs Scalability**: tracking row separate PG tx vs MERGE BQ (no distributed tx posible). Optamos: MERGE BQ first (atomic) → INSERT tracking second (best-effort). Si tracking falla, signal `unknown` siguiente día detecta. Mejor que perder atomicidad del MERGE.

## 8 — Hard rules (anti-regression)

Ver CLAUDE.md § "ICO Materializer Hardening Pattern (TASK-900, desde 2026-05-18)" para lista canonical.

## 9 — Follow-ups

- **TASK derivada V1.1**: lint rule `greenhouse/no-destructive-materializer-without-freshness-gate` detectando `DELETE FROM ... WHERE period_year` seguido de `INSERT INTO` en archivos `src/lib/*/materialize*.ts`. Modo `warn` durante 30d, promover a `error` post replicación completa.
- **TASK derivada V1.1**: extender el patrón canonical a futuros materializers downstream (Frame.io ingestion, HubSpot deals/services snapshots, Nubox financial materialization).
- **TASK derivada V1.1**: cleanup automático opt-in de huérfanos (rows en `metrics_by_*` cuyas tareas Notion fueron archivadas) via flag `ICO_MATERIALIZER_CLEANUP_ORPHANS_ENABLED`.
- **TASK derivada V1.2**: admin endpoint `POST /api/admin/ico/materialize-force` con capability granular `ico.materializer.force_bypass_gate` (EFEONCE_ADMIN-only, audit + reason >= 20 chars) para emergencias.
- **TASK exploratoria**: evaluar migración a Dataform / dbt para todos los materializers ICO — out of scope V1 pero el pattern canonical facilita.

## 10 — Histórico

### Delta 2026-05-18 — V1 Accepted

Diseño + implementación shipped:

- Slice 1: `runUpstreamFreshnessGate` canonical helper + 12 tests
- Slice 3: migration `ico_materialization_runs` + 14 tests helper TS + live PG smoke verde
- Slice 2: `materializeMemberMetrics` refactor MERGE + 8 tests anti-regresión
- Slice 4: incremental delta filter + 3 tests adicionales
- Slice 5: extract orchestrator + builders + replicate a 4 siblings (project/sprint/organization/business_unit) + 13 builder tests
- Slice 6: `delivery.ico_materializer.skipped_safety` signal + wire-up + 8 tests
- Slice 7 (esta ADR + CLAUDE.md hard rule)

ICO test suite: 20 archivos / 141 tests verde. Cero regresión cross-file. Defaults flags OFF garantizan zero behavioral change post-merge.
