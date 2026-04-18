# TASK-143 — Agency Economics API & View

## Delta 2026-04-17 — spec corregida contra runtime real

- La vista `/agency/economics` ya no debe tratarse como placeholder vacío:
  - existe runtime legacy en `src/views/agency/AgencyEconomicsView.tsx`
  - hoy consume fuentes `client-first` y charts no alineados al objetivo de esta lane
- La implementación correcta para esta task pasa a ser:
  - crear `GET /api/agency/economics`
  - reemplazar la vista legacy por una surface nueva `space-first` en `src/views/greenhouse/agency/economics/`
  - consumir `greenhouse_serving.operational_pl_snapshots` como source principal vía readers compartidos, no `/api/finance/dashboard/pnl` como motor primario
- `getSpaceFinanceMetrics()` se puede reutilizar como enrichment/compat layer, pero no alcanza por sí solo para el payload final porque no expone `labor`, `direct`, `overhead` ni series históricas.
- El drill-down económico real por servicio sigue bloqueado por `TASK-146`:
  - en esta lane la expansión por Space puede mostrar contexto honesto/no económico o estado explícito `pendiente service economics`
  - no se debe inventar margen por servicio ni repartir revenue inline sin la serving layer dedicada
- `schema-snapshot-baseline.sql` sigue siendo útil para `operational_pl_snapshots`, `spaces` y `services`, pero está desfasado en `commercial_cost_attribution`, `client_economics` y `cost_allocations`; para esa zona manda el runtime actual + migraciones recientes.

## Delta 2026-03-30

- `TASK-162` ya dejó explícita la estrategia de cutover.
- Para esta lane, la regla pasa a ser:
  - Agency Economics debe consumir `operational_pl_snapshots`
  - no debe leer `client_labor_cost_allocation` directamente
  - si hace falta explain de costo comercial, debe delegarlo a la surface/API de `commercial_cost_attribution`, no recomputarlo localmente

## Delta 2026-03-30 — baseline ya cerrada

- `TASK-162` ya quedó cerrada como baseline institucional.
- Esta lane ya no debe reinterpretar la atribución comercial:
  - rentabilidad resumida por `space` debe seguir sobre `operational_pl_snapshots`
  - explain puntual de costo comercial debe salir de `commercial_cost_attribution`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | P0 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Implemented` |
| Rank | — |
| Domain | Agency / Economics |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Implement `/api/agency/economics` y reemplazar la vista legacy de Agency Economics por una surface `space-first` alineada al serving materializado real. La página debe mostrar P&L por Space con revenue, labor, direct, overhead, total cost y margin, además de tendencias históricas de margen e ingresos/costos. El drill-down económico por servicio queda explícitamente diferido hasta `TASK-146`; en esta lane solo se permite expansión honesta con contexto de servicios existentes, sin inventar P&L por servicio.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.2 Economics Engine

## Dependencies & Impact

- **Depende de:** `src/lib/cost-intelligence/compute-operational-pl.ts` (`listOperationalPlSnapshots()` / `getOperationalPlTrend()`), `src/lib/agency/agency-finance-metrics.ts`, `greenhouse_serving.operational_pl_snapshots`, `greenhouse_core.spaces`, `src/views/greenhouse/finance/ClientEconomicsView.tsx` como referencia visual, `src/lib/agency/space-360.ts` para patrones de explain financiero por Space
- **Impacta a:** TASK-146 (Service P&L feeds into Economics drill-down), TASK-154 (Revenue Pipeline Intelligence extends Economics), TASK-160 (Enterprise Hardening)
- **Archivos owned:** `src/app/(dashboard)/agency/economics/page.tsx`, `src/app/api/agency/economics/route.ts`, `src/views/greenhouse/agency/economics/`

## Scope

### Slice 1 — API endpoint (~4h)

`GET /api/agency/economics` returning P&L aggregated by Space. Consumir `operational_pl_snapshots` como source primario:

- totales institucionales desde `scope_type='organization'` del período seleccionado
- breakdown por Space desde `scope_type='space'`
- series de tendencia desde snapshots históricos del mismo serving
- `getSpaceFinanceMetrics()` solo como compat/enrichment si aporta latest metadata útil

Return sugerido:

`{ period, totals, bySpace, trends, ranking, partialState }`

### Slice 2 — View with expandable table (~6h)

Reemplazar la vista legacy client-first por una view nueva data-driven. KPI strip: Revenue total, Margin %, Payroll ratio. Tabla principal: Space | Revenue | Labor | Direct | Overhead | Total cost | Margin %. La expansión por fila no debe fingir `service_economics`; hasta `TASK-146` debe mostrar:

- servicios contratados del Space como contexto
- estado explícito `Economics por servicio pendiente`
- links útiles hacia Space 360 / Services si corresponde

Ranking lateral: Spaces por rentabilidad.

### Slice 3 — Trend charts (~3h)

Margin % trend chart (last 6 months) using existing chart components. Revenue vs Cost area chart. Period selector (monthly). Todo el histórico debe salir de `operational_pl_snapshots`, no de `finance/analytics/trends`.

## Acceptance Criteria

- [x] `/api/agency/economics` returns P&L data aggregated by Space
- [x] Economics page leaves the legacy client-first surface behind and shows real Space-first financial data
- [x] KPI strip displays Revenue, Margin %, Payroll ratio
- [x] Table rows are expandable per Space
- [x] Margin trend chart renders with 6-month history
- [x] Data matches Cost Intelligence / Finance serving totals for the selected period (cross-check)
- [x] No service-level margin is fabricated before `TASK-146`
- [x] Loading and empty states handled

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/api/agency/economics/route.ts` | New — Economics API |
| `src/app/(dashboard)/agency/economics/page.tsx` | Repoint from legacy view to new Space-first view |
| `src/views/greenhouse/agency/economics/EconomicsView.tsx` | New — main view |
| `src/lib/agency/agency-finance-metrics.ts` | Reuse or extend only if a thin enrichment layer is still useful |
