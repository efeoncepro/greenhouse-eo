# Greenhouse Portal — Motor ICO (Inteligencia de Delivery)

> Versión: 2.1
> Fecha: 2026-04-02

---

## Visión general

El ICO Engine es el motor de inteligencia de delivery de Greenhouse. Materializa métricas operativas a partir de datos de Notion conformados en BigQuery y las expone vía API para dashboards, reportes y alertas. Opera sobre BigQuery con materialización periódica (cada 6 horas) y proporciona vistas cuasi-reales para toma de decisiones operativa.

**Lib**: `src/lib/ico-engine/`
**API**: `/api/ico-engine/*`
**Cron**: `/api/cron/ico-materialize` (cada 6 horas)
**Fuente de datos**: BigQuery (`greenhouse_conformed.delivery_tasks` → `greenhouse_ico`) y PostgreSQL para validación de gobernanza
**Version del Motor**: `v1.0.0`

---

## Arquitectura

```
greenhouse_conformed.delivery_tasks
        │
        ▼
v_tasks_enriched (vista derivada, BigQuery)
  + fase_csc, cycle_time_days, hours_since_update, is_stuck, delivery_signal
        │
        ▼ (materialización periódica)
┌─────────────────────────────────────────────────────────────┐
│ metric_snapshots_monthly  (por espacio + mes)              │
│ stuck_assets_detail       (refresh diario, 72h+ estancadas)│
│ rpa_trend                 (últimos 12 meses)               │
│ metrics_by_project        (por proyecto + mes)             │
│ metrics_by_member         (por miembro + mes)              │
│ ai_metric_scores          (scoring IA de tareas)           │
│ status_phase_config       (mapeo status → fase CSC)        │
│ v_metric_latest           (convenience view)               │
└─────────────────────────────────────────────────────────────┘
        │
        ▼ (API routes)
  /api/ico-engine/health
  /api/ico-engine/metrics
  /api/ico-engine/stuck-assets
  /api/ico-engine/rpa-trend
  /api/ico-engine/metrics-by-project
  /api/ico-engine/metrics-by-member
  /api/ico-engine/ai-scores
  /api/ico-engine/materialize (manual trigger)
```

---

## Módulos de Lib

### `schema.ts`
Define el DDL de BigQuery completo para `greenhouse_ico`:
- Tabla base `metric_snapshots_monthly`
- Tabla `stuck_assets_detail`
- Tabla `rpa_trend`
- Tabla `metrics_by_project` y `metrics_by_member`
- Tabla `ai_metric_scores`
- Tabla `status_phase_config`
- Vista `v_tasks_enriched`
- Vista `v_metric_latest`
- ENGINE_VERSION: `v1.0.0`

### `materialize.ts`
Materializan métricas ICO e snapshots:
- `materializeSpaceMetrics(spaceId, year, month)` — Calcula y almacena métricas mensuales de un espacio
- `materializeAgencyMetrics(year, month)` — Rollup de todos los espacios
- `materializeStuckAssets()` — Identifica tareas con 72h+ sin movimiento
- `materializeRpaTrend()` — Últimos 12 meses agregados
- `materializeProjectMetrics(spaceId, year, month)` — Agrupación por proyecto
- `materializeMemberMetrics(spaceId, year, month)` — Agrupación por miembro
- Idempotencia garantizada: remplaza snapshots existentes sin duplicación

### `read-metrics.ts`
Consulta métricas desde BigQuery:
- `readSpaceMetrics(spaceId, year, month)` → `SpaceMetricSnapshot`
- `readLatestSpaceMetrics(spaceId)` → Último snapshot disponible
- `readAgencyMetrics(year, month)` → Array de snapshots todos los espacios
- `readProjectMetrics(spaceId, year, month)` → `ProjectMetricSnapshot[]`
- `readMemberMetrics(memberId, year, month)` → `IcoMetricSnapshot`
- `readMemberMetricsBatch(memberIds[], year, month)` → `Map<memberId, snapshot>`
- `readLatestMetricsSummary(spaceId)` → Resumen sintético
- `readStuckAssets(spaceId)` → Lista de tareas estancadas
- `readRpaTrend(spaceId, months)` → Serie temporal 12 meses

### `performance-report.ts`
Genera reportes de performance ICO:
- `generatePerformanceReport(spaceId, year, month)` → `PerformanceReportData`
- Estructura: métricas de zona (optimal/attention/critical), tendencias, narrativa ejecutiva
- Integración con `space-notion-publish()` para publicar en Notion

### `historical-reconciliation.ts`
Reconcilia datos históricos de ICO:
- `reconcileIcoHistory(spaceId, yearRange)` — Valida integridad de snapshots históricos
- `recomputeHistoricalMetrics(spaceId, year)` — Recalcula mes completo si hay cambios en source data
- Detecta y reporta gaps o inconsistencias

### `metric-registry.ts`
Registry centralizado de 8 métricas con umbrales de zona y metadata:
- **rpa** — Rounds per Approval
- **otd_pct** — On-Time Delivery %
- **ftr_pct** — First-Time-Right %
- **cycle_time** — Cycle Time (días)
- **cycle_time_variance** — Varianza
- **throughput** — Tasks completadas
- **pipeline_velocity** — Velocity ratio
- **stuck_assets** — Assets estancados

Cada métrica define: ID, nombre, kind (average/percentage/duration/count/ratio/distribution), campo source en v_tasks_enriched, y tres zonas (Optimal/Attention/Critical) con umbrales numéricos.

### `shared.ts`
Utilidades compartidas:
- Helpers de normalización de dimensiones (space, project, member)
- Funciones de validación de período (year/month válidos)
- Builders de contexto (SpaceContext, ProjectContext, MemberContext)
- Type guards y conversiones

---

## Integración con Gobernanza Notion

### `space-notion-governance.ts`
Validación de schema contra `CORE_KPI_CONTRACT`:

**Bases de datos requeridas por tipo:**
- **Projects** — Campos obligatorios: name, status, owner, due_date
- **Tasks** — Campos obligatorios: title, status, owner, assigned_date, client_change_round
- **Sprints** — Campos obligatorios: name, start_date, end_date

**Bases de datos opcionales:**
- **Reviews** — Feedback loops y cycles

### `space-notion-governance-contract.ts`
Define `CORE_KPI_CONTRACT` y `REQUIRED_NOTION_DATABASE_KINDS`:
- Mapeo de "kind" (Projects, Tasks, Sprints, Reviews) a esquemas esperados
- Validación de required fields per DB kind
- Scoring de readiness (% fields presentes vs esperados)

### `notion-performance-report-publication.ts`
Publica reportes de performance ICO hacia Notion:
- Crea o actualiza página de reporte en workspace de governance
- Estructura: resumen ejecutivo, tablas de métricas por zona, gráficos de tendencia
- Genera alertas (red/yellow) si hay métricas en zona Critical/Attention

---

## Schema BigQuery (`greenhouse_ico`)

### `metric_snapshots_monthly`
Métricas agregadas por espacio y período mensual.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `snapshot_id` | STRING | PK |
| `space_id` | STRING | FK → espacio |
| `client_id` | STRING | FK → cliente (legacy bridge) |
| `organization_id` | STRING | FK → organización (Account 360) |
| `period_year` / `period_month` | INT | Período YYYY / MM |
| `rpa_avg` | FLOAT | RPA promedio (rounds) |
| `otd_pct` | FLOAT | On-Time Delivery % |
| `ftr_pct` | FLOAT | First-Time-Right % |
| `cycle_time_avg_days` / `cycle_time_p50_days` / `cycle_time_p95_days` | FLOAT | Cycle time: media / mediana / p95 |
| `cycle_time_variance` | FLOAT | Varianza (desviación estándar) |
| `throughput_count` | INT | Tasks completadas en período |
| `pipeline_velocity` | FLOAT | Velocity ratio (tasks completadas / tasks en flight) |
| `stuck_asset_count` / `stuck_asset_pct` | INT / FLOAT | Assets estancados (72h+) y % del total |
| `csc_distribution` | JSON | Distribución por fase CSC (briefing, produccion, revision_interna, cambios_cliente, entrega) |
| `total_tasks` / `completed_tasks` / `active_tasks` | INT | Contexto de volumen |
| `computed_at` | TIMESTAMP | Timestamp de cálculo |
| `engine_version` | STRING | Versión del engine (v1.0.0) |

### `stuck_assets_detail`
Refresh diario de tareas estancadas (72h+ sin movimiento).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `task_source_id` | STRING | ID externo de tarea (Notion) |
| `task_name` | STRING | Título |
| `space_id` | STRING | FK → espacio |
| `project_source_id` | STRING | ID del proyecto |
| `fase_csc` | VARCHAR | Fase actual (briefing/produccion/etc) |
| `hours_since_update` | INT | Horas sin cambios |
| `days_since_update` | INT | Días sin cambios |
| `severity` | VARCHAR | warning / critical |
| `rpa_value` | FLOAT | RPA acumulado en el ciclo |
| `client_review_open` | BOOLEAN | Si hay revisión cliente pendiente |
| `materialized_at` | TIMESTAMP | Timestamp de materialización |

### `rpa_trend`
Últimos 12 meses de RPA agregado por espacio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `space_id` | STRING | FK → espacio |
| `period_year` / `period_month` | INT | Período |
| `rpa_avg` | FLOAT | RPA promedio |
| `rpa_median` | FLOAT | RPA mediana |
| `rpa_p75` / `rpa_p95` | FLOAT | Percentiles |
| `tasks_completed` | INT | Conteo de tasks completadas |
| `materialized_at` | TIMESTAMP | Timestamp |

### `metrics_by_project` / `metrics_by_member`
Misma estructura que `metric_snapshots_monthly` pero agrupada por `project_source_id` o `member_id`.

### `ai_metric_scores`
Scoring IA de tareas individuales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `score_id` | STRING | PK |
| `task_id` | STRING | ID tarea (Notion) |
| `metric_id` | STRING | ID métrica del registry |
| `score` | FLOAT | Score normalizado 0-1 |
| `passed` | BOOLEAN | Si pasó el threshold |
| `reasoning` | TEXT | Explicación del score |
| `model` | VARCHAR | Modelo IA usado |
| `confidence` | FLOAT | Confianza 0-1 |
| `space_id` | STRING | FK → espacio |
| `project_id` | STRING | FK → proyecto |
| `computed_at` | TIMESTAMP | Timestamp |

### `status_phase_config`
Mapeo configurable de estados de tarea a fases CSC por espacio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `config_id` | STRING | PK |
| `space_id` | STRING | FK → espacio |
| `task_status` | VARCHAR | Status de Notion (ej: "In Review") |
| `fase_csc` | VARCHAR | Fase mapeada (briefing/produccion/revision_interna/cambios_cliente/entrega) |
| `is_default` | BOOLEAN | Si es mapeo por defecto (determinístico) |

### Vistas

- **`v_tasks_enriched`** — Vista derivada de `greenhouse_conformed.delivery_tasks` con campos calculados:
  - `fase_csc` — Mapeado desde status vía `status_phase_config`
  - `cycle_time_days` — Días entre creation y última transición relevante
  - `hours_since_update` — Horas desde último cambio
  - `is_stuck` — Boolean si > 72h sin movimiento
  - `delivery_signal` — Enum: 'on_time', 'at_risk', 'overdue'

- **`v_metric_latest`** — Convenience view: último snapshot por espacio + mes, ordenado DESC

---

## API Routes

| Ruta | Método | Auth | Query Params | Descripción |
|------|--------|------|--------------|-------------|
| `/api/ico-engine/health` | GET | Agency | — | Health check: versión, dataset, última materialización |
| `/api/ico-engine/metrics` | GET | Agency | `spaceId`, `year`, `month` | Métricas de un espacio (live o materializadas) |
| `/api/ico-engine/stuck-assets` | GET | Agency | `spaceId`, `severity` | Lista de tareas estancadas (72h+) |
| `/api/ico-engine/rpa-trend` | GET | Agency | `spaceId`, `months` | Tendencia RPA últimos N meses |
| `/api/ico-engine/metrics-by-project` | GET | Agency | `spaceId`, `year`, `month` | Métricas a nivel proyecto |
| `/api/ico-engine/metrics-by-member` | GET | Agency | `spaceId`, `year`, `month` | Métricas a nivel miembro |
| `/api/ico-engine/ai-scores` | GET | Agency | `spaceId`, `taskId` | Scores IA por tarea |
| `/api/ico-engine/materialize` | POST | Agency | `spaceId`, `year`, `month` | Trigger manual de materialización |

Todos requieren `requireAgencyTenantContext()` y llaman `ensureIcoEngineInfrastructure()` para provisioning idempotente del schema BigQuery.

---

## Funciones principales

### Lectura

| Función | Input | Output |
|---------|-------|--------|
| `readSpaceMetrics(spaceId, year, month)` | Espacio + período | `SpaceMetricSnapshot` |
| `readLatestSpaceMetrics(spaceId)` | Espacio | Último snapshot disponible |
| `readAgencyMetrics(year, month)` | Período | `SpaceMetricSnapshot[]` |
| `readProjectMetrics(spaceId, year, month)` | Espacio + período | `ProjectMetricSnapshot[]` |
| `readMemberMetrics(memberId, year, month)` | Miembro + período | `IcoMetricSnapshot` |
| `readMemberMetricsBatch(memberIds[], year, month)` | Batch de miembros | `Map<string, IcoMetricSnapshot>` |
| `readLatestMetricsSummary(spaceId)` | Espacio | `MetricsSummary` |
| `readStuckAssets(spaceId)` | Espacio | `StuckAsset[]` (72h+) |
| `readRpaTrend(spaceId, months)` | Espacio + rango | `RpaTrendPoint[]` |

### Cálculo (Live)

| Función | Input | Output |
|---------|-------|--------|
| `computeSpaceMetricsLive(spaceId, year, month)` | Espacio + período | `SpaceMetricSnapshot` (source: 'live') |
| `computeMetricsByContext(dimension, value, year, month)` | Dimensión flexible | `IcoMetricSnapshot` |

### Materialización

| Función | Input | Comportamiento |
|---------|-------|-----------------|
| `materializeSpaceMetrics(spaceId, year, month)` | Espacio + período | Calcula y reemplaza snapshot |
| `materializeAgencyMetrics(year, month)` | Período | Rollup de todos los espacios |
| `materializeStuckAssets()` | — | Refresh diario de assets 72h+ |
| `materializeRpaTrend()` | — | Años últimos 12 meses |
| `materializeProjectMetrics(spaceId, year, month)` | Espacio + período | Agrupación por proyecto |
| `materializeMemberMetrics(spaceId, year, month)` | Espacio + período | Agrupación por miembro |

### Gobernanza

| Función | Propósito |
|---------|-----------|
| `ensureIcoEngineInfrastructure()` | Provisioning idempotente del schema BigQuery completo |
| `validateSpaceNotionGovenance(spaceId)` | Valida CORE_KPI_CONTRACT (Projects, Tasks, Sprints, Reviews) |
| `scorespaceReadiness(spaceId)` | % fields presentes vs esperados |
| `detectNotionDrift(spaceId)` | Identifica cambios en propiedades Notion DB |

---

## Cron y Scripts

### Cron: `/api/cron/ico-materialize`
**Frecuencia**: cada 6 horas
**Acciones**:
1. Itera todos los espacios activos
2. Calcula período actual (year/month)
3. Llama `materializeSpaceMetrics(spaceId, year, month)`
4. Genera `metric_snapshots_monthly` o remplaza si ya existe
5. Refresh `stuck_assets_detail` (72h+)
6. Actualiza `rpa_trend` (últimos 12 meses)

### Scripts

**`scripts/ico-materialize.ts`**
- CLI: `pnpm ico:materialize [--spaceId] [--year] [--month]`
- Ejecuta materialización manual, útil para backfill

**`scripts/remediate-ico-assignee-attribution.ts`**
- Reconcilia atribución de tareas a miembros cuando hay cambios en Notion
- Vuelve a computar member metrics

**`scripts/backfill-ico.ts`**
- Backfill de snapshots históricos
- CLI: `pnpm ico:backfill [--spaceId] [--fromYear] [--toYear]`

---

## Consumers

| Módulo | Uso |
|--------|-----|
| **Agency Pulse Dashboard** | `readAgencyMetrics()` para KPIs globales |
| **Agency Spaces View** | `readLatestSpaceMetrics()` para health indicators por espacio |
| **Organizations Detail** | `/api/organizations/[id]/ico` expone métricas por org |
| **People 360** | `readMemberMetrics()` para delivery context de persona |
| **Capabilities / Creative Hub** | Stuck assets, RPA trend, CSC distribution |
| **Finance Module** | Cycle time como proxy de cost-per-task |

---

## Calibración de Zonas

Cada métrica en `metric-registry.ts` define tres zonas con umbrales específicos:

| Métrica | Optimal | Attention | Critical |
|---------|---------|-----------|----------|
| RPA | 0–1.5 | 1.5–2.5 | >2.5 |
| OTD % | 90–100% | 70–90% | <70% |
| FTR % | 80–100% | 60–80% | <60% |
| Cycle Time | 0–7 d | 7–14 d | >14 d |
| Cycle Variance | 0–3 d | 3–7 d | >7 d |
| Throughput | 20+ | 10–20 | <10 |
| Velocity | 0.8+ | 0.5–0.8 | <0.5 |
| Stuck Assets | 0–2 | 2–5 | >5 |

Las zonas pueden ser overridden por `status_phase_config` a nivel espacio.

---

## Notas de Implementación

- **Versionado**: ENGINE_VERSION `v1.0.0` en schema. Bump en cada cambio de métricas.
- **Idempotencia**: Todas las funciones de materialización son idempotentes (remplazando snapshots existentes sin duplicación).
- **Fallback**: Si no existe config `status_phase_config` para un espacio, se usa derivación determinística por defecto (task_status → fase_csc).
- **Timezone**: Todos los períodos (year/month) en UTC; las vistas de usuario adaptan a timezone local del espacio.
- **Latencia**: Snapshots materializados tienen lag de hasta 6h. Para live metrics, usa `computeSpaceMetricsLive()`.
