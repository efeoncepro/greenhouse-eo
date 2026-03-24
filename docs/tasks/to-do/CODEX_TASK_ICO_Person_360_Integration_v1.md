# CODEX_TASK_ICO_Person_360_Integration_v1

## Summary

Integrar las métricas del ICO Engine (RPA, OTD, FTR, cycle time, throughput, stuck assets) en la vista Person 360 de delivery, para que cada persona tenga un perfil operativo completo: compensación + asignaciones FTE + eficiencia de delivery real medida por ICO.

## Why This Task Exists

Hoy `person_delivery_360` calcula métricas básicas de tareas (total, activas, completadas, overdue, avg_rpa_30d, on_time_pct_30d) directamente desde `greenhouse_delivery.tasks` en una ventana de 30 días. Pero el ICO Engine ya materializa métricas mucho más ricas por miembro en `ico_engine.metrics_by_member`: RPA promedio y mediana, OTD%, FTR%, cycle time promedio, throughput, velocidad de pipeline, y stuck assets.

Esta duplicación parcial con resultados divergentes es un problema de verdad operativa: un manager puede ver un OTD% diferente en la ficha de persona vs. el dashboard ICO porque calculan sobre bases distintas. Unificar la fuente elimina esta inconsistencia.

Además, la correlación ICO × compensación es la pregunta que todo director de operaciones necesita responder: "¿este miembro tiene un costo laboral proporcional a su output operativo?"

## Goal

1. Proyectar `ico_engine.metrics_by_member` de BigQuery a Postgres como fuente canónica de métricas operativas por persona
2. Enriquecer `person_delivery_360` con métricas ICO materializadas
3. Crear un endpoint `/api/people/[memberId]/ico-profile` que retorne perfil ICO completo
4. Correlacionar en la UI: compensación (payroll) × eficiencia (ICO) × asignaciones (FTE)

## Dependencies & Impact

### Depends on
- `docs/architecture/GREENHOUSE_ICO_ENGINE_V1.md`
- `scripts/setup-postgres-person-360-contextual.sql` — vista `person_delivery_360`
- `src/lib/ico-engine/schema.ts` — definición de `metrics_by_member`
- `src/lib/ico-engine/read-metrics.ts` — funciones de lectura ICO
- `src/lib/person-360/get-person-delivery.ts` — `getPersonDeliveryContext()`
- Task completada: `CODEX_TASK_Person_360_Profile_Unification_v1.md`
- Task completada: `CODEX_TASK_ETL_ICO_Pipeline_Hardening.md`

### Impacts to
- `CODEX_TASK_Organization_Economics_Dashboard_v1.md` — economics per-person puede drill-down al perfil ICO individual
- `CODEX_TASK_Team_Identity_Capacity_System_v2.md` — ICO per-person es input directo para capacity planning (utilización real vs. teórica)
- `CODEX_TASK_Staff_Augmentation_Module_v2.md` — eficiencia de placements medible via ICO profile
- `CODEX_TASK_People_360_Enrichments_v1.md` (cerrada) — extiende su Tab Identidad con un card de ICO performance

### Files owned
- `scripts/setup-postgres-ico-member-metrics.sql`
- `scripts/backfill-ico-member-metrics.ts`
- `src/lib/person-360/get-person-ico-profile.ts`
- `src/app/api/people/[memberId]/ico-profile/route.ts`
- Modificación: `scripts/setup-postgres-person-360-contextual.sql` (extend `person_delivery_360`)
- Modificación: `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` (enriquecer con ICO cards)

## Current Repo State

### Ya existe
- **ICO member metrics en BigQuery:** Tabla `metrics_by_member` definida en `src/lib/ico-engine/schema.ts` (líneas 230-340+). Columnas: `member_id, period_year, period_month, rpa_avg, rpa_median, otd_pct, ftr_pct, cycle_time_avg_days, throughput_count, pipeline_velocity, stuck_asset_count, stuck_asset_pct`. Clustered por member_id.
- **Person delivery 360:** Vista `greenhouse_serving.person_delivery_360` en `scripts/setup-postgres-person-360-contextual.sql` (líneas 226-340). Calcula métricas básicas desde `greenhouse_delivery.tasks` con lateral join en ventana de 30 días.
- **Person ICO API parcial:** `src/app/api/people/[memberId]/ico/route.ts` ya existe y retorna datos ICO. `PersonHrProfileTab.tsx` (línea 122) ya hace fetch a este endpoint.
- **ICO read functions:** `src/lib/ico-engine/read-metrics.ts` tiene funciones de lectura desde BigQuery.

### No existe aún
- Tabla Postgres con métricas ICO por miembro (proyección desde BigQuery)
- Script de backfill para poblar métricas históricas
- Enriquecimiento de `person_delivery_360` con columnas ICO
- Correlación compensación × eficiencia en la UI
- Trend de eficiencia por persona (evolución mensual de RPA/OTD/FTR)

## Implementation Plan

### Slice 1 — Postgres Projection

1. **Crear tabla `greenhouse_serving.ico_member_metrics`:**
   ```sql
   CREATE TABLE greenhouse_serving.ico_member_metrics (
     member_id UUID NOT NULL,
     period_year INT NOT NULL,
     period_month INT NOT NULL,
     rpa_avg NUMERIC(6,2),
     rpa_median NUMERIC(6,2),
     otd_pct NUMERIC(5,2),
     ftr_pct NUMERIC(5,2),
     cycle_time_avg_days NUMERIC(6,2),
     throughput_count INT,
     pipeline_velocity NUMERIC(8,2),
     stuck_asset_count INT,
     stuck_asset_pct NUMERIC(5,2),
     materialized_at TIMESTAMPTZ DEFAULT NOW(),
     PRIMARY KEY (member_id, period_year, period_month)
   );
   ```

2. **Script de backfill** que lea `ico_engine.metrics_by_member` de BigQuery y upsert a Postgres.

3. **Agregar paso al cron `ico-materialize`** para sincronizar nuevos períodos a Postgres.

### Slice 2 — Enriquecer Person Delivery 360

1. **Extender vista `person_delivery_360`** con lateral join a `ico_member_metrics`:
   - Agregar columnas: `ico_rpa_avg, ico_otd_pct, ico_ftr_pct, ico_cycle_time_days, ico_throughput, ico_stuck_count`
   - Período: último mes materializado disponible

2. **Crear `getPersonIcoProfile(memberId)`** que retorne:
   - Métricas actuales (último período)
   - Trend de 6 meses
   - Percentil relativo al equipo
   - Correlación con compensación (si se tiene acceso a person_finance_360)

3. **API route:** `GET /api/people/[memberId]/ico-profile?trend=6`

### Slice 3 — UI Integration

1. **Agregar ICO Performance card** al PersonHrProfileTab (o nuevo tab):
   - Gauge charts: RPA, OTD%, FTR%
   - Trend sparkline de 6 meses
   - Badge de health: verde/amarillo/rojo según thresholds ICO

2. **Opcionalmente:** Card de correlación "Cost vs. Output" que muestre compensación mensual vs. throughput/RPA.

## Acceptance Criteria

- [ ] Tabla `ico_member_metrics` creada y poblada desde BigQuery
- [ ] `person_delivery_360` enriquecida con columnas ICO
- [ ] API retorna perfil ICO con trend
- [ ] Cron `ico-materialize` sincroniza nuevos datos automáticamente
- [ ] UI muestra métricas ICO en ficha de persona
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] Al menos 2 tests unitarios para el store
