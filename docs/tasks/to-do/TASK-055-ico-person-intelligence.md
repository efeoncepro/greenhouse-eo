# TASK-055 — ICO Person Intelligence (Frontend + Event Publishing)

## Estado

Backend complete. Frontend integration + event publishing wiring pendiente.

## Context

ICO Engine expandido como motor de inteligencia operativa unificado por persona. Backend implementado en 4 fases: metric registry, storage, reactive projection, API.

## Lo implementado

- 6 métricas derivadas: utilization_pct, allocation_variance, cost_per_asset, cost_per_hour, quality_index, dedication_index
- `person_operational_360` table con 9 ICO + 6 derived + capacity + cost
- `metric_threshold_overrides` table para umbrales por organización
- `personIntelligenceProjection` reactiva (reemplaza personOperationalProjection)
- `GET /api/people/:memberId/intelligence?trend=6` API unificada
- 15 unit tests para compute functions

## Pendiente

### Event Publishing (wiring)
- [ ] `src/lib/payroll/postgres-store.ts` — publicar `compensation.updated` después de `pgUpsertCompensationVersion()`
- [ ] `src/lib/ico-engine/materialize.ts` — publicar `ico.materialization.completed` después del step 7

### Frontend Integration
- [ ] Crear tab "Inteligencia" en ficha de persona (PersonIntelligenceTab.tsx)
- [ ] 15 KPIs: 9 delivery + 6 derived, con zones y semáforos
- [ ] Trend chart: Recharts LineChart con quality_index + utilization + dedication over 6 months
- [ ] Capacity breakdown card
- [ ] Cost context card
- [ ] Integrar en MyPerformanceView como data source mejorada

### Backfill
- [ ] Script para poblar person_operational_360 desde ico_member_metrics + assignments + compensation existentes

## Dependencies & Impact

- **Depende de:** ICO Engine materialization (metrics_by_member), payroll (compensation_versions), assignments
- **Impacta a:** PersonICOTab (puede consumir /intelligence en vez de /ico), MyPerformanceView, AgencyTeamView
- **Archivos owned:** `src/lib/person-intelligence/*`, `src/app/api/people/[memberId]/intelligence/*`
