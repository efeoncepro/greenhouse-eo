# TASK-058 — Organization Metrics: Activate BQ Materialization (Scale Path)

## Estado

Pendiente. No urgente — on-read compute funciona para el volumen actual (2 orgs, 2-3 spaces).

## Context

La capa de Account Operational Metrics tiene la infraestructura completa:
- 2 tablas Postgres (`ico_organization_metrics`, `organization_operational_metrics`)
- 2 projections (`ico-organization-metrics`, `organization-operational`)
- APIs y vistas que ya las consumen con fallback defensivo

Pero las tablas están vacías porque `ico_engine.metrics_by_organization` nunca se creó en BigQuery. La materialización ICO (Step 7-8) cubre space/project/member/sprint pero no organization.

**Fix actual (v1):** `getOrganizationOperationalServing` ahora computa on-read agregando `person_operational_360` por org members. Funciona para 1-20 orgs con <50ms. No requiere tablas materializadas.

## Cuándo activar

Activar la materialización BQ cuando:
- Más de 10 organizaciones activas
- Dashboards ejecutivos con trend de 12+ meses por org
- Response time de on-read > 200ms consistentemente

## Plan de activación

### Step 1 — Crear tabla BQ `ico_engine.metrics_by_organization`

En `src/lib/ico-engine/schema.ts`, agregar DDL:
```sql
CREATE TABLE IF NOT EXISTS `{projectId}.ico_engine.metrics_by_organization` (
  organization_id STRING, period_year INT64, period_month INT64,
  rpa_avg FLOAT64, otd_pct FLOAT64, ftr_pct FLOAT64,
  cycle_time_avg_days FLOAT64, throughput_count INT64,
  stuck_asset_count INT64, total_tasks INT64,
  completed_tasks INT64, active_tasks INT64,
  materialized_at TIMESTAMP
)
```

### Step 2 — Agregar Step 9 a `materialize.ts`

```typescript
// Step 9: Organization-level metrics
const orgMetricsWritten = await materializeOrganizationMetrics(projectId, periodYear, periodMonth)
```

SQL: GROUP BY organization_id (JOIN spaces → organizations para resolver org_id desde space_id).

### Step 3 — Verificar que projections sincronizan

Las projections `ico-organization-metrics` y `organization-operational` ya existen y se triggean con `ico.materialization.completed`. Solo necesitan que la tabla BQ tenga datos.

### Step 4 — Verificar que on-read fallback sigue como safety net

El on-read compute en `getOrganizationOperationalServing` se mantiene como fallback para orgs sin materialización reciente.

## Dependencies

- Requiere que `ico_engine.metrics_by_organization` exista en BQ
- Requiere que el materialization cron corra mensualmente
- Projections ya registradas y funcionales

## Estimación

2 horas. DDL + 1 función de materialización + verificación.
