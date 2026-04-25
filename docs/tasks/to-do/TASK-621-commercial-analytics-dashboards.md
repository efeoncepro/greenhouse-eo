# TASK-621 — Commercial Analytics Dashboards (sales metrics + program adoption metrics)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Medio` (~3 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque E)
- Status real: `Diseno cerrado v1.9`
- Rank: `TBD`
- Domain: `data` / `ui`
- Blocked by: `TASK-619, TASK-620.3, TASK-624`
- Branch: `task/TASK-621-commercial-analytics-dashboards`

## Summary

Dashboards comerciales en Admin Center con dos categorias: (1) Sales metrics (win/loss rate, velocity, discount distribution, MRR, renewal rate). (2) Program adoption metrics del propio programa CPQ (% productos con rich html, adoption del composer, % quotes con firma activada, conversion quote-to-signed, costo envelope ZapSign vs revenue, drop-off por step).

## Why This Task Exists

Sin metrics el rollout del programa CPQ es ciego. Necesitamos saber si:
- TASK-630 (rich text editor) realmente se adopta o operadores siguen vacios
- TASK-619 (firma) cierra deals mas rapido o no
- TASK-620.3 (composer nesting) se usa o sales reps siguen flat
- Tool partner program genera revenue significativo

## Goal

- 2 dashboards en `/admin/commercial-analytics`
- Sales dashboard: pipeline + velocity + win/loss + MRR + renewal rate
- Program adoption dashboard: metricas operativas del rollout
- Charts ApexCharts + Recharts (segun pattern Greenhouse UX)
- Filtros por periodo + business_line + tenant
- Export CSV de cada metric

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-005...` Delta v1.9

## Dependencies & Impact

### Depends on

- TASK-619 (signature events emitidos)
- TASK-620.3 (composer adoption tracking)
- TASK-624 (renewal rate metric)
- TASK-630 (description adoption tracking)

### Files owned

- `src/app/(dashboard)/admin/commercial-analytics/page.tsx` (nuevo)
- `src/views/greenhouse/admin/commercial-analytics/SalesMetricsDashboard.tsx` (nuevo)
- `src/views/greenhouse/admin/commercial-analytics/ProgramAdoptionDashboard.tsx` (nuevo)
- `src/lib/commercial/analytics-aggregations.ts` (nuevo)
- `src/app/api/commercial/analytics/[metric]/route.ts` (nuevo, generico)

## Scope

### Slice 1 — Sales metrics aggregations (1 dia)

SQL queries para:
- **Win rate:** quotes con `status='approved' OR esignature_status='signed'` / total quotes
- **Velocity:** avg dias `created_at -> signed_at`
- **Discount distribution:** histograma de `total_discount / total_price`
- **MRR:** sum `mrr` de quotes signed con `revenue_type='recurring'`
- **Renewal rate:** % renewal quotes generadas vs expirables

Endpoint `/api/commercial/analytics/sales/win-rate?from=&to=&businessLine=` etc.

### Slice 2 — Program adoption metrics (1 dia)

SQL queries para:
- **% productos con rich html:** `count(WHERE description_rich_html IS NOT NULL) / count(*)` en sellable_roles + tools + artifacts + product_catalog
- **Composer nesting adoption:** `count(WHERE has_children) / count(*)` en service_modules
- **Quotes con firma:** `count(WHERE signature_enabled=true) / count(*)` por periodo
- **Conversion quote-to-signed:** funnel `created -> sent -> approved -> signed`
- **Costo ZapSign vs revenue:** `sum(envelope_cost_estimate) / sum(quote_total) * 100`
- **AI generations by user:** count + cost
- **Tool partner revenue:** sum gross + sum commission per partner

### Slice 3 — UI dashboards (1 dia)

`<SalesMetricsDashboard>`:
- 4 KPI cards top: Win rate, Avg velocity, MRR, Renewal rate
- 1 funnel chart: created -> sent -> approved -> signed
- 1 line chart: MRR trend mensual ultimos 12 meses
- Filtros: periodo + business_line

`<ProgramAdoptionDashboard>`:
- 6 KPI cards: rich html %, composer nesting %, signature %, conversion %, AI usage, partner revenue
- Charts: tendencia mensual de cada metric
- Empty state si datos pre-rollout (< 30 dias)

## Out of Scope

- Real-time updates (refresh manual / cada 5 min)
- Export PDF (solo CSV)
- Custom dashboards user-configurable (Fase 2)
- AI-generated insights ("tu pipeline esta bajando, considera...") - futuro

## Acceptance Criteria

- [ ] 2 dashboards funcionales
- [ ] queries optimizadas (< 2s response)
- [ ] filtros funcionales
- [ ] CSV export por metric
- [ ] tests de aggregations

## Verification

- Manual QA con datos de staging
- Comparar metric vs query manual SQL para validar correctitud

## Closing Protocol

- [ ] Lifecycle sincronizado
- [ ] Handoff con screenshots dashboards
- [ ] `docs/documentation/admin-center/commercial-analytics.md` (nuevo)
