# TASK-146 — Service-Level P&L (Economics per Service)

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Alto |
| Effort | Medio |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Economics |
| Sequence | Agency Layer V2 — Phase 2 |

## Summary

Calculate revenue, cost, and margin per service. Create a `service_economics` serving view materialized by reactive projection. Feed computed data into the Economics drill-down (TASK-143) and Space 360 Services tab (TASK-142). Services today have `totalCost` but no revenue or margin attribution.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §3.2 Service, §7.1 Serving views (`service_economics`)

## Dependencies & Impact

- **Depende de:** TASK-142 (Space 360 Services tab consumes this), TASK-143 (Economics drill-down consumes this), Finance income attribution by service, `greenhouse_serving` schema
- **Impacta a:** TASK-147 (Campaign ↔ Service Bridge uses service economics), TASK-155 (Scope Intelligence uses service cost data), TASK-156 (SLA/SLO per service extends this), TASK-160 (Enterprise Hardening — ServiceEconomics store)
- **Archivos owned:** `src/lib/agency/service-economics.ts`, `src/app/api/agency/services/[serviceId]/economics/route.ts`

## Scope

### Slice 1 — Computation engine (~5h)

`ServiceEconomics` module: attribute revenue to services from Finance income records (by space + service tag). Attribute costs from existing `totalCost` + labor allocation (FTE * loaded cost). Compute margin = revenue - costs. Handle partial attribution with pro-rata fallback.

### Slice 2 — Serving view + projection (~4h)

Create `greenhouse_serving.service_economics` table. Reactive projection triggered by Finance income events and service lifecycle events. Columns: `service_id`, `space_id`, `period`, `revenue`, `labor_cost`, `direct_cost`, `margin`, `margin_pct`, `updated_at`.

### Slice 3 — API + UI integration (~4h)

`GET /api/agency/services/[serviceId]/economics` returning service P&L. Integrate into Space 360 Services tab (revenue/cost/margin columns). Integrate into Economics view drill-down (expand Space row to see service-level breakdown).

## Acceptance Criteria

- [ ] Revenue is attributed to services from Finance income records
- [ ] Margin computed per service = revenue - (labor + direct costs)
- [ ] `service_economics` serving view materialized and refreshed reactively
- [ ] API endpoint returns service-level P&L data
- [ ] Space 360 Services tab shows revenue/cost/margin per service
- [ ] Economics view drill-down shows service breakdown per Space
- [ ] Handles edge case: service with no revenue attribution (shows cost only)

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/service-economics.ts` | New — computation engine |
| `src/app/api/agency/services/[serviceId]/economics/route.ts` | New — service economics API |
| `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx` | Add economics columns |
| `src/views/greenhouse/agency/economics/EconomicsView.tsx` | Add service drill-down |
