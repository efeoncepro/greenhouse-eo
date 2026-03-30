# TASK-143 — Agency Economics API & View

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P0 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Economics |
| Sequence | Agency Layer V2 — Phase 1 |

## Summary

Implement `/api/agency/economics` backing the existing placeholder Economics view. Aggregate P&L by Space using Finance PnL engine. Show revenue, labor costs, direct costs, overhead, and margin per Space in an expandable table with drill-down to services. Add trend charts for margin over time.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §4.2 Economics Engine

## Dependencies & Impact

- **Depende de:** Finance PnL endpoint (`/api/finance/dashboard/pnl` — exists), `getSpaceFinanceMetrics()` from `src/lib/agency/agency-finance-metrics.ts` (TASK-138 complete), `operational_pl_snapshots` materialized view
- **Impacta a:** TASK-146 (Service P&L feeds into Economics drill-down), TASK-154 (Revenue Pipeline Intelligence extends Economics), TASK-160 (Enterprise Hardening)
- **Archivos owned:** `src/app/(dashboard)/agency/economics/page.tsx`, `src/app/api/agency/economics/route.ts`, `src/views/greenhouse/agency/economics/`

## Scope

### Slice 1 — API endpoint (~4h)

`GET /api/agency/economics` returning P&L aggregated by Space. Consume Finance PnL engine for totals. Consume `getSpaceFinanceMetrics()` for per-space breakdown. Return: `{ totals: { revenue, labor, direct, overhead, margin }, bySpace: SpaceEconomics[] }`.

### Slice 2 — View with expandable table (~6h)

Replace placeholder Economics page with data-driven view. KPI strip: Revenue total, Margin %, Payroll ratio. Expandable table: Space | Revenue | Labor | Direct | Overhead | Margin %. Row expansion shows service-level breakdown (placeholder until TASK-146). Ranking sidebar: Spaces by profitability.

### Slice 3 — Trend charts (~3h)

Margin % trend chart (last 6 months) using existing chart components. Revenue vs Cost area chart. Period selector (monthly). Data from `operational_pl_snapshots` time series.

## Acceptance Criteria

- [ ] `/api/agency/economics` returns P&L data aggregated by Space
- [ ] Economics page shows real financial data (no placeholder)
- [ ] KPI strip displays Revenue, Margin %, Payroll ratio
- [ ] Table rows are expandable per Space
- [ ] Margin trend chart renders with 6-month history
- [ ] Data matches Finance module totals (cross-check)
- [ ] Loading and empty states handled

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/app/api/agency/economics/route.ts` | New — Economics API |
| `src/app/(dashboard)/agency/economics/page.tsx` | Replace placeholder with real view |
| `src/views/greenhouse/agency/economics/EconomicsView.tsx` | New — main view |
| `src/lib/agency/agency-finance-metrics.ts` | Extend if needed for aggregation |
