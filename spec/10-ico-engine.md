# Greenhouse Portal — ICO Engine (Delivery Intelligence)

> Versión: 1.0
> Fecha: 2026-03-22

---

## Visión general

El ICO Engine es el motor de inteligencia de delivery de Greenhouse. Materializa métricas operativas a partir de datos de Notion conformados y las expone vía API para dashboards, reportes y alertas. Opera enteramente sobre BigQuery con materialización periódica.

**Lib**: `src/lib/ico-engine/`
**API**: `/api/ico-engine/*`
**Cron**: `/api/cron/ico-materialize`
**Fuente de datos**: BigQuery (`greenhouse_conformed.delivery_tasks` → `greenhouse_ico`)

---

## Arquitectura

```
greenhouse_conformed.delivery_tasks
        │
        ▼
v_tasks_enriched (vista derivada)
  + fase_csc, cycle_time_days, hours_since_update, is_stuck, delivery_signal
        │
        ▼ (materialización periódica)
┌───────────────────────────────────────────────────┐
│ metric_snapshots_monthly  (por espacio + mes)     │
│ metrics_by_project        (por proyecto + mes)    │
│ metrics_by_member          (por miembro + mes)    │
│ stuck_assets_detail       (refresh diario)        │
│ rpa_trend                 (últimos 12 meses)      │
└───────────────────────────────────────────────────┘
        │
        ▼ (API routes)
  /api/ico-engine/metrics
  /api/ico-engine/metrics/agency
  /api/ico-engine/metrics/project
  /api/ico-engine/stuck-assets
  /api/ico-engine/trends/rpa
  /api/ico-engine/registry
  /api/ico-engine/health
  /api/ico-engine/context
```

---

## Metric Registry

10 métricas definidas centralmente en `metric-registry.ts` con umbrales de zona:

| ID | Nombre | Kind | Source Field | Optimal | Attention | Critical |
|----|--------|------|-------------|---------|-----------|----------|
| `rpa` | Rounds per Approval | average | `rpa_value` | 0–1.5 | 1.5–2.5 | >2.5 |
| `otd_pct` | On-Time Delivery % | percentage | `delivery_signal = 'on_time'` | 90–100% | 70–90% | <70% |
| `ftr_pct` | First-Time-Right % | percentage | `client_change_round_final = 0` | 80–100% | 60–80% | <60% |
| `cycle_time` | Cycle Time (días) | duration | `cycle_time_days` | 0–7 | 7–14 | >14 |
| `cycle_time_variance` | Varianza Cycle Time | duration | — | 0–3 | 3–7 | >7 |
| `throughput` | Tasks completadas | count | — | 20+ | 10–20 | <10 |
| `pipeline_velocity` | Velocity ratio | ratio | — | 0.8+ | 0.5–0.8 | <0.5 |
| `csc_distribution` | Distribución CSC | distribution | — | — | — | — |
| `stuck_assets` | Assets estancados | count | — | 0–2 | 2–5 | >5 |
| `stuck_asset_pct` | % estancados | percentage | — | 0–10% | 10–25% | >25% |

---

## Fases CSC (Creative Service Cycle)

Pipeline creativo-operativo de 5 fases:

1. **briefing** — Brief recibido, definición de alcance
2. **produccion** — Trabajo activo de diseño/desarrollo
3. **revision_interna** — QA interno antes de entrega al cliente
4. **cambios_cliente** — Ajustes post-feedback del cliente
5. **entrega** — Asset entregado y aprobado

El mapeo `task_status → fase_csc` es configurable por espacio vía `status_phase_config`. Si no existe configuración, se usa derivación determinista por defecto.

---

## Schema BigQuery (`greenhouse_ico`)

### `metric_snapshots_monthly`

Métricas agregadas por espacio y período mensual.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `snapshot_id` | STRING | PK |
| `space_id` | STRING | FK → espacio |
| `client_id` | STRING | FK → cliente |
| `period_year` / `period_month` | INT | Período |
| `rpa_avg` | FLOAT | RPA promedio |
| `otd_pct` | FLOAT | % OTD |
| `ftr_pct` | FLOAT | % FTR |
| `cycle_time_avg_days` / `cycle_time_p50_days` | FLOAT | Cycle time promedio / mediana |
| `cycle_time_variance` | FLOAT | Varianza |
| `throughput_count` | INT | Tasks completadas |
| `pipeline_velocity` | FLOAT | Velocity ratio |
| `stuck_asset_count` / `stuck_asset_pct` | INT / FLOAT | Assets estancados |
| `csc_distribution` | JSON | Distribución por fase |
| `total_tasks` / `completed_tasks` / `active_tasks` | INT | Contexto de volumen |
| `computed_at` | TIMESTAMP | Fecha de cálculo |
| `engine_version` | STRING | Versión del engine |

### `stuck_assets_detail`

Refresh diario de tareas estancadas (72h+ sin movimiento).

Campos: `task_source_id`, `task_name`, `space_id`, `project_source_id`, `fase_csc`, `hours_since_update`, `days_since_update`, `severity`, `rpa_value`, `client_review_open`, `materialized_at`.

### `rpa_trend`

Últimos 12 meses de RPA agregado por espacio: `space_id`, `period_year`, `period_month`, `rpa_avg`, `rpa_median`, `tasks_completed`.

### `metrics_by_project` / `metrics_by_member`

Misma estructura que `metric_snapshots_monthly` pero agrupada por `project_source_id` o `member_id`.

### `ai_metric_scores`

Scoring AI de tareas individuales: `task_id`, `metric_id`, `score`, `passed`, `reasoning`, `model`, `confidence`, `space_id`, `project_id`.

### `status_phase_config`

Mapeo configurable de estados de tarea a fases CSC por espacio: `space_id`, `task_status`, `fase_csc`.

### Vistas

- **`v_tasks_enriched`** — Vista derivada de `greenhouse_conformed.delivery_tasks` con campos calculados: `fase_csc`, `cycle_time_days`, `hours_since_update`, `is_stuck`, `delivery_signal`
- **`v_metric_latest`** — Convenience view: último snapshot por espacio

---

## API Routes

| Ruta | Método | Auth | Descripción |
|------|--------|------|-------------|
| `/api/ico-engine/metrics` | GET | Agency | Métricas de un espacio (live o materializadas) |
| `/api/ico-engine/metrics/agency` | GET | Agency | Rollup a nivel agencia |
| `/api/ico-engine/metrics/project` | GET | Agency | Métricas a nivel proyecto |
| `/api/ico-engine/health` | GET | Agency | Health check del engine |
| `/api/ico-engine/registry` | GET | Agency | Registro de métricas con umbrales |
| `/api/ico-engine/context` | GET | Agency | Contexto de espacio/proyecto |
| `/api/ico-engine/stuck-assets` | GET | Agency | Lista de tareas estancadas |
| `/api/ico-engine/trends/rpa` | GET | Agency | Tendencia RPA 12 meses |

Todos los endpoints requieren `requireAgencyTenantContext()` y llaman `ensureIcoEngineInfrastructure()` para provisioning idempotente del schema.

---

## Funciones principales

### Lectura

| Función | Input | Output |
|---------|-------|--------|
| `readSpaceMetrics(spaceId, year, month)` | Espacio + período | `SpaceMetricSnapshot` |
| `readLatestSpaceMetrics(spaceId)` | Espacio | Último snapshot disponible |
| `readAgencyMetrics(year, month)` | Período | Array de snapshots de todos los espacios |
| `readProjectMetrics(spaceId, year, month)` | Espacio + período | `ProjectMetricSnapshot[]` |
| `readMemberMetrics(memberId, year, month)` | Miembro + período | `IcoMetricSnapshot` |
| `readMemberMetricsBatch(memberIds, year, month)` | Batch de miembros | `Map<string, IcoMetricSnapshot>` |
| `readLatestMetricsSummary(spaceId)` | Espacio | `MetricsSummary` |

### Cálculo live

| Función | Input | Output |
|---------|-------|--------|
| `computeSpaceMetricsLive(spaceId, year, month)` | Espacio + período | `SpaceMetricSnapshot` (source: 'live') |
| `computeMetricsByContext(dimension, value, year, month)` | Dimensión flexible | `IcoMetricSnapshot` |

### Infrastructure

| Función | Descripción |
|---------|-------------|
| `ensureIcoEngineInfrastructure()` | Provisioning idempotente del schema BigQuery completo |

---

## Consumers

| Módulo | Uso de ICO Engine |
|--------|-------------------|
| Agency Pulse | `readAgencyMetrics()` para KPIs globales |
| Agency Spaces | `readLatestSpaceMetrics()` para health indicators |
| Organizations | `/api/organizations/[id]/ico` usa métricas por espacio |
| People 360 | `readMemberMetrics()` para delivery context de persona |
| Dashboard Cliente | Indirectamente vía Agency + capabilities |
| Capabilities (Creative Hub) | Stuck assets y métricas CSC |
